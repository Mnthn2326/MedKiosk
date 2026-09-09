import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deidentified_code, event_type, trust_tier, content, contributor_id } = body;

    // Validate required fields
    if (!deidentified_code || !event_type || !trust_tier || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: deidentified_code, event_type, trust_tier, content' },
        { status: 400 },
      );
    }

    // Validate event_type
    const validEventTypes = ['diagnosis', 'prescription', 'lab_report', 'note'];
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    // Look up patient by deidentified_code
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('deidentified_code', deidentified_code)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found with this de-identified code' },
        { status: 404 },
      );
    }

    // Generate embedding for the content
    const contentText = typeof content === 'string' ? content : JSON.stringify(content);
    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(contentText);
    } catch (embeddingError) {
      console.error('Embedding generation failed, inserting without embedding:', embeddingError);
    }

    // Insert clinical event
    const insertData: Record<string, unknown> = {
      patient_id: patient.id,
      contributor_id: contributor_id || null,
      event_type,
      trust_tier,
      content,
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
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create clinical event' }, { status: 500 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Clinical events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
