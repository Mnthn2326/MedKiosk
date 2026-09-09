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
    const { deidentified_code, patient_id: req_patient_id, event_type, trust_tier, content, contributor_id, events } = body;

    let final_patient_id = req_patient_id;

    if (!final_patient_id && !deidentified_code) {
      return NextResponse.json(
        { error: 'Missing patient identifier: must provide either patient_id or deidentified_code' },
        { status: 400 },
      );
    }

    if (!final_patient_id && deidentified_code) {
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
      final_patient_id = patient.id;
    }

    // Auto-resolve contributor
    let final_contributor_id = contributor_id;
    let contributorType: string | null = null;

    if (final_contributor_id === undefined) {
      // Look up authenticated user's contributor record
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      
      if (profile) {
        const { data: contributor } = await supabase
          .from('contributors')
          .select('id, type')
          .eq('user_id', profile.id)
          .single();
        if (contributor) {
          final_contributor_id = contributor.id;
          contributorType = contributor.type;
        } else {
          final_contributor_id = null;
        }
      } else {
        final_contributor_id = null;
      }
    } else if (final_contributor_id) {
      const { data: contributor } = await supabase
        .from('contributors')
        .select('type')
        .eq('id', final_contributor_id)
        .single();
      if (contributor) {
        contributorType = contributor.type;
      }
    }

    // Helper to resolve trust_tier
    const resolveTrustTier = (providedTier?: string) => {
      if (providedTier) return providedTier;
      if (contributorType === 'doctor') return 'doctor_confirmed';
      if (contributorType === 'lab' || contributorType === 'diagnostic_center') return 'institution_verified';
      return null;
    };

    const validEventTypes = ['diagnosis', 'prescription', 'lab_report', 'note'];
    const eventsToProcess = events && Array.isArray(events) ? events : [{ event_type, content, trust_tier }];

    if (eventsToProcess.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    const insertedEvents = [];

    for (const ev of eventsToProcess) {
      if (!ev.event_type || !ev.content) {
        return NextResponse.json(
          { error: 'Missing required fields in event: event_type, content' },
          { status: 400 }
        );
      }
      if (!validEventTypes.includes(ev.event_type)) {
        return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
      }

      const current_trust_tier = resolveTrustTier(ev.trust_tier || trust_tier);
      if (!current_trust_tier) {
        return NextResponse.json(
          { error: 'Missing required field: trust_tier could not be resolved' },
          { status: 400 }
        );
      }

      // Generate embedding for the content
      const contentText = typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content);
      let embedding: number[] = [];
      try {
        embedding = await generateEmbedding(contentText);
      } catch (embeddingError) {
        console.error('Embedding generation failed, inserting without embedding:', embeddingError);
      }

      // Insert clinical event
      const insertData: Record<string, unknown> = {
        patient_id: final_patient_id,
        contributor_id: final_contributor_id || null,
        event_type: ev.event_type,
        trust_tier: current_trust_tier,
        content: ev.content,
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

      insertedEvents.push(event);
    }

    if (events && Array.isArray(events)) {
      return NextResponse.json({ events: insertedEvents }, { status: 201 });
    } else {
      return NextResponse.json({ event: insertedEvents[0] }, { status: 201 });
    }
  } catch (error) {
    console.error('Clinical events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
