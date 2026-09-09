import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, generateSummary } from '@/lib/gemini';
import { retrieveRelevantEvents, formatEventsAsContext } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication and doctor role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (!profile || profile.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can generate summaries' }, { status: 403 });
    }

    const body = await request.json();
    const { patient_id } = body;

    if (!patient_id) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }

    // Retrieve relevant clinical events using RAG
    const events = await retrieveRelevantEvents(patient_id);

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'No clinical events found for this patient' },
        { status: 404 },
      );
    }

    // Format events as context for the LLM
    const context = formatEventsAsContext(events);

    // Generate structured summary via Gemini
    const summary = await generateSummary(context);

    // Generate embedding for the summary for future retrieval
    const summaryText = `Chief Complaint: ${summary.chief_complaint}. HPI: ${summary.hpi}. Past History: ${summary.past_history}. Relevant Results: ${summary.relevant_results}`;
    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(summaryText);
    } catch (embeddingError) {
      console.error('Summary embedding generation failed:', embeddingError);
    }

    // Insert as ai_summary event (trust_tier = self_reported until doctor reviews)
    const insertData: Record<string, unknown> = {
      patient_id,
      contributor_id: null,
      event_type: 'ai_summary',
      trust_tier: 'self_reported',
      content: summary,
    };

    if (embedding.length > 0) {
      insertData.embedding = JSON.stringify(embedding);
    }

    const { data: event, error: insertError } = await supabase
      .from('clinical_events')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert summary error:', insertError);
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 });
    }

    return NextResponse.json({ event, summary }, { status: 201 });
  } catch (error) {
    console.error('RAG summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
