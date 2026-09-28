import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/gemini';
import { clinicalEventSchema, createValidationError } from '@/lib/validations';

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

    // Get the user's role and profile
    const { data: profile } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    if (!['doctor', 'lab', 'diagnostic_center'].includes(profile.role)) {
      return NextResponse.json({ error: 'Role not authorized to insert events' }, { status: 403 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validationResult = clinicalEventSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return NextResponse.json(createValidationError(validationResult.error), { status: 400 });
    }

    const { deidentified_code, patient_id: req_patient_id, event_type, trust_tier, content, events } = validationResult.data;

    let final_patient_id = req_patient_id;

    // Lookup patient (verifies existence and access)
    let patientQuery = supabase.from('patients').select('id');
    if (final_patient_id) {
      patientQuery = patientQuery.eq('id', final_patient_id);
    } else {
      patientQuery = patientQuery.eq('deidentified_code', deidentified_code);
    }

    const { data: patient, error: patientError } = await patientQuery.single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found or access denied' },
        { status: 404 },
      );
    }
    
    final_patient_id = patient.id;

    // Securely derive contributor_id from session
    let final_contributor_id: string | null = null;
    let contributorType: string | null = null;

    const { data: contributor } = await supabase
      .from('contributors')
      .select('id, type')
      .eq('user_id', profile.id)
      .single();
      
    if (contributor) {
      final_contributor_id = contributor.id;
      contributorType = contributor.type;
    }

    // Helper to resolve trust_tier
    const resolveTrustTier = (providedTier?: string) => {
      if (providedTier) return providedTier;
      if (contributorType === 'doctor') return 'doctor_confirmed';
      if (contributorType === 'lab' || contributorType === 'diagnostic_center') return 'institution_verified';
      return null;
    };

    const eventsToProcess = events && events.length > 0 ? events : [{ event_type, content, trust_tier }];

    const insertedEvents = [];

    for (const ev of eventsToProcess) {
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
        contributor_id: final_contributor_id, // Safely derived from session
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
