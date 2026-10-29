import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reviewSchema, createValidationError } from '@/lib/validations';
import { computeReviewUpdate, buildSummaryEmbeddingText } from '@/lib/summaryReview';
import { generateEmbedding } from '@/lib/gemini';
import type { AiSummaryContent } from '@/types/database';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify doctor role and fetch profile info
    const { data: profile } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('auth_id', user.id)
      .single();

    if (!profile || profile.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can review summaries' }, { status: 403 });
    }

    // 3. Parse request payload
    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validationResult = reviewSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(createValidationError(validationResult.error), { status: 400 });
    }

    const { event_id, action, edited_content } = validationResult.data;

    // 4. Fetch the existing clinical event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('clinical_events')
      .select('id, patient_id, contributor_id, event_type, content, trust_tier')
      .eq('id', event_id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existingEvent.event_type !== 'ai_summary') {
      return NextResponse.json(
        { error: 'Can only review ai_summary events' },
        { status: 400 },
      );
    }

    // 5. Verify doctor access to the patient canvas
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', existingEvent.patient_id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found or unauthorized to review this record' },
        { status: 403 },
      );
    }

    const existingContent = (existingEvent.content || {}) as Record<string, unknown>;

    // 6. Terminal state validation: prevent re-reviewing already confirmed or rejected summaries
    if (existingEvent.trust_tier === 'doctor_confirmed') {
      return NextResponse.json(
        { error: 'Summary has already been confirmed and cannot be reviewed again' },
        { status: 400 },
      );
    }

    if (existingContent.rejected === true) {
      return NextResponse.json(
        { error: 'Summary has already been rejected and cannot be reviewed again' },
        { status: 400 },
      );
    }

    // 7. Refresh vector embedding if summary content was edited
    let embeddingVector: number[] | null = null;
    let embeddingSynced: boolean | undefined = undefined;
    let embeddingError: string | null = null;

    if (action === 'edit' && edited_content) {
      const summaryText = buildSummaryEmbeddingText(edited_content);
      try {
        const vec = await generateEmbedding(summaryText);
        if (Array.isArray(vec) && vec.length === 768) {
          embeddingVector = vec;
          embeddingSynced = true;
        } else {
          embeddingSynced = false;
          embeddingError = `Expected 768-dimensional embedding, received ${vec?.length || 0}`;
          console.error('Embedding dimensionality mismatch on summary edit');
        }
      } catch (embErr: unknown) {
        embeddingSynced = false;
        embeddingError = embErr instanceof Error ? embErr.message : 'Embedding service error';
        console.error('Embedding regeneration error during summary edit');
      }
    }

    // 8. Compute update data with reviewer attribution and embedding synchronization
    const updateData = computeReviewUpdate(
      {
        trust_tier: existingEvent.trust_tier,
        content: existingContent,
        contributor_id: existingEvent.contributor_id,
      },
      action,
      {
        editedContent: edited_content as unknown as AiSummaryContent,
        reviewerName: profile.name || 'Doctor',
        reviewerId: profile.id,
        embedding: embeddingVector,
        embeddingSynced,
        embeddingError,
      }
    );

    // 9. Persist update in database
    const { data: updatedEvent, error: updateError } = await supabase
      .from('clinical_events')
      .update(updateData)
      .eq('id', event_id)
      .select()
      .single();

    if (updateError) {
      console.error('Review update error:', updateError);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    // 10. Return response with explicit embedding sync status
    const responsePayload: Record<string, unknown> = { event: updatedEvent };
    if (action === 'edit') {
      responsePayload.embedding_synced = embeddingSynced;
      if (!embeddingSynced) {
        responsePayload.warning =
          'Summary saved, but vector embedding generation failed. Stale vector was invalidated to preserve RAG integrity.';
      }
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch {
    console.error('Review API error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
