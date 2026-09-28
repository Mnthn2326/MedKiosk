import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, chatWithContext } from '@/lib/gemini';
import { retrieveRelevantEvents, formatEventsAsContext } from '@/lib/rag';
import { ragChatSchema, createValidationError } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication and patient role
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

    if (!profile || profile.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can use the chat feature' },
        { status: 403 },
      );
    }

    // Get the patient record for this user
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', (
        await supabase.from('users').select('id').eq('auth_id', user.id).single()
      ).data?.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validationResult = ragChatSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(createValidationError(validationResult.error), { status: 400 });
    }

    const { message, history } = validationResult.data;
    // Generate embedding for the question for similarity search
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateEmbedding(message);
    } catch {
      console.error('Query embedding failed, falling back to basic retrieval');
    }

    // Retrieve ONLY this patient's clinical events
    const events = await retrieveRelevantEvents(patient.id, queryEmbedding);
    const context = formatEventsAsContext(events);

    // Generate response with strict system prompt
    const response = await chatWithContext(context, message, history);

    return NextResponse.json({ response }, { status: 200 });
  } catch (error) {
    console.error('RAG chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
