import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, chatWithContext } from '@/lib/gemini';
import { retrieveRelevantEvents, formatEventsAsContext } from '@/lib/rag';
import { ragChatSchema, createValidationError } from '@/lib/validations';
import {
  validateConversationOwnership,
  formatChatHistoryForAi,
  type ChatMessageItem,
} from '@/lib/chatPersistence';

/**
 * GET /api/rag/chat
 * Retrieves the authenticated patient's conversation history in chronological order.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify patient role
    const { data: profile } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile || profile.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can access conversation history' },
        { status: 403 }
      );
    }

    // 3. Get patient record
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    // 4. Retrieve or create active conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, patient_id, title, created_at, updated_at')
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          patient_id: patient.id,
          title: 'Health Records Chat',
        })
        .select()
        .single();

      if (createError || !newConv) {
        console.error('Failed to initialize conversation');
        return NextResponse.json({ error: 'Failed to initialize conversation' }, { status: 500 });
      }
      conversation = newConv;
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Failed to initialize conversation' }, { status: 500 });
    }

    // 5. Retrieve messages in chronological order
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (msgError) {
      console.error('Failed to fetch messages');
      return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
    }

    return NextResponse.json(
      {
        conversation_id: conversation.id,
        messages: (messages || []).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          role: m.role as 'user' | 'model',
          content: m.content as string,
          created_at: m.created_at as string,
        })),
      },
      { status: 200 }
    );
  } catch {
    console.error('RAG chat history retrieval error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/rag/chat
 * Persists user message, performs RAG retrieval, invokes Gemini, and persists model response.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify patient role
    const { data: profile } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!profile || profile.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can use the chat feature' },
        { status: 403 }
      );
    }

    // 3. Get the patient record for this user
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', profile.id)
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

    const { message, history, conversation_id } = validationResult.data;

    // 4. Resolve and authorize conversation
    let activeConvId = conversation_id;
    if (activeConvId) {
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('id, patient_id')
        .eq('id', activeConvId)
        .single();

      if (
        convError ||
        !existingConv ||
        !validateConversationOwnership(patient.id, existingConv.patient_id)
      ) {
        return NextResponse.json(
          { error: 'Conversation not found or unauthorized' },
          { status: 403 }
        );
      }
    } else {
      const { data: defaultConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', patient.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!defaultConv) {
        const { data: newConv, error: newConvError } = await supabase
          .from('conversations')
          .insert({
            patient_id: patient.id,
            title: 'Health Records Chat',
          })
          .select('id')
          .single();

        if (newConvError || !newConv) {
          console.error('Failed to create default conversation');
          return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
          );
        }
        activeConvId = newConv.id;
      } else {
        activeConvId = defaultConv.id;
      }
    }

    // 5. Persist user message to chat_messages
    const { data: savedUserMsg, error: saveUserError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConvId,
        patient_id: patient.id,
        role: 'user',
        content: message,
      })
      .select('id, created_at')
      .single();

    if (saveUserError || !savedUserMsg) {
      console.error('Failed to persist user message');
      return NextResponse.json({ error: 'Failed to record message' }, { status: 500 });
    }

    // 6. Generate embedding for semantic similarity search
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateEmbedding(message);
    } catch {
      console.error('Query embedding failed, falling back to basic retrieval');
    }

    // 7. Retrieve ONLY this patient's clinical events
    const events = await retrieveRelevantEvents(patient.id, queryEmbedding);
    const context = formatEventsAsContext(events);

    // 8. Build recent history context for Gemini (bounded to 10 turns)
    const { data: recentDbMessages } = await supabase
      .from('chat_messages')
      .select('id, role, content')
      .eq('conversation_id', activeConvId)
      .order('created_at', { ascending: true })
      .limit(12);

    const historyForAi =
      recentDbMessages && recentDbMessages.length > 0
        ? formatChatHistoryForAi(
            (recentDbMessages as ChatMessageItem[]).filter((m) => m.id !== savedUserMsg.id),
            10
          )
        : formatChatHistoryForAi(history || [], 10);

    // 9. Generate response with strict system prompt
    let responseText: string;
    try {
      responseText = await chatWithContext(context, message, historyForAi);
    } catch {
      console.error('RAG chat generation error');
      // Incomplete turn: User message was safely saved, but AI response failed
      return NextResponse.json(
        {
          error: 'Failed to generate response. Your message was saved; please try again.',
          conversation_id: activeConvId,
          user_message_id: savedUserMsg.id,
        },
        { status: 502 }
      );
    }

    // 10. Persist model response to chat_messages
    const { data: savedModelMsg, error: saveModelError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: activeConvId,
        patient_id: patient.id,
        role: 'model',
        content: responseText,
      })
      .select('id, created_at')
      .single();

    if (saveModelError) {
      console.error('Failed to persist model response');
    }

    // Touch conversation updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConvId);

    return NextResponse.json(
      {
        response: responseText,
        conversation_id: activeConvId,
        message_id: savedModelMsg?.id,
      },
      { status: 200 }
    );
  } catch {
    console.error('RAG chat API error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
