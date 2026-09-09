import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AiSummaryContent } from '@/types/database';

export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only doctors can review summaries' }, { status: 403 });
    }

    const body = await request.json();
    const { event_id, action, edited_content } = body as {
      event_id: string;
      action: 'accept' | 'edit' | 'reject';
      edited_content?: AiSummaryContent;
    };

    if (!event_id || !action) {
      return NextResponse.json({ error: 'event_id and action are required' }, { status: 400 });
    }

    if (!['accept', 'edit', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be accept, edit, or reject' },
        { status: 400 },
      );
    }

    // Verify the event exists and is an ai_summary
    const { data: existingEvent, error: fetchError } = await supabase
      .from('clinical_events')
      .select('id, event_type, content')
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

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'accept':
        // Accept: promote trust tier to doctor_confirmed
        updateData = {
          trust_tier: 'doctor_confirmed',
        };
        break;

      case 'edit':
        // Edit: overwrite content with edited version, promote trust tier
        if (!edited_content) {
          return NextResponse.json(
            { error: 'edited_content is required for edit action' },
            { status: 400 },
          );
        }
        updateData = {
          content: edited_content,
          trust_tier: 'doctor_confirmed',
        };
        break;

      case 'reject':
        // Reject: mark content as rejected, keep trust tier as-is
        updateData = {
          content: {
            ...(existingEvent.content as Record<string, unknown>),
            rejected: true,
          },
        };
        break;
    }

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

    return NextResponse.json({ event: updatedEvent }, { status: 200 });
  } catch (error) {
    console.error('Review API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
