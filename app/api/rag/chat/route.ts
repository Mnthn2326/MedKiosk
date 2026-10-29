import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateEmbedding, chatWithContext } from '@/lib/gemini';
import { retrieveRelevantEvents, formatEventsAsContext } from '@/lib/rag';
import { ragChatSchema, createValidationError } from '@/lib/validations';
import {
  validateConversationOwnership,
  formatChatHistoryForAi,
  type ChatMessageItem,
} from '@/lib/chatPersistence';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      return createServiceClient(url, key, { auth: { persistSession: false } });
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * GET /api/rag/chat
 * Retrieves the authenticated patient's conversation history in chronological order.
 * Gracefully provisions an active conversation session if not yet present.
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

    const adminClient = getAdminClient();
    const db = adminClient || supabase;

    // 4. Retrieve or create active conversation
    let conversationId: string | null = null;
    try {
      let { data: conversation } = await db
        .from('conversations')
        .select('id, patient_id, title, created_at, updated_at')
        .eq('patient_id', patient.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: createError } = await db
          .from('conversations')
          .insert({
            patient_id: patient.id,
            title: 'Health Records Chat',
          })
          .select()
          .maybeSingle();

        if (createError) {
          console.warn('DB conversation creation notice:', createError.message);
        }
        conversation = newConv;
      }

      if (conversation?.id) {
        conversationId = conversation.id;
      }
    } catch (err) {
      console.warn('Conversations table query/create bypassed:', err);
    }

    // Fallback to a valid UUID session if database persistence is unavailable
    if (!conversationId) {
      conversationId = crypto.randomUUID();
    }

    // 5. Retrieve messages in chronological order if conversation exists in DB
    let messages: Array<{ id: string; role: 'user' | 'model'; content: string; created_at: string }> = [];
    try {
      const { data: dbMessages, error: msgError } = await db
        .from('chat_messages')
        .select('id, conversation_id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!msgError && Array.isArray(dbMessages)) {
        messages = dbMessages.map((m: Record<string, unknown>) => ({
          id: (m.id as string) || crypto.randomUUID(),
          role: m.role === 'user' ? 'user' : 'model',
          content: (m.content as string) || '',
          created_at: (m.created_at as string) || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Chat messages fetch bypassed:', err);
    }

    return NextResponse.json(
      {
        conversation_id: conversationId,
        messages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('RAG chat history retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/rag/chat
 * Persists user message, performs RAG retrieval, invokes Gemini, and returns response.
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

    const adminClient = getAdminClient();
    const db = adminClient || supabase;

    // 4. Resolve and authorize conversation
    let activeConvId = conversation_id;
    if (activeConvId) {
      try {
        const { data: existingConv } = await db
          .from('conversations')
          .select('id, patient_id')
          .eq('id', activeConvId)
          .maybeSingle();

        // If conversation exists in DB, ensure it belongs to the authenticated patient
        if (
          existingConv &&
          !validateConversationOwnership(patient.id, existingConv.patient_id)
        ) {
          return NextResponse.json(
            { error: 'Conversation not found or unauthorized' },
            { status: 403 }
          );
        }
      } catch (err) {
        console.warn('Conversation ownership lookup notice:', err);
      }
    } else {
      try {
        const { data: defaultConv } = await db
          .from('conversations')
          .select('id')
          .eq('patient_id', patient.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (defaultConv?.id) {
          activeConvId = defaultConv.id;
        } else {
          const { data: newConv } = await db
            .from('conversations')
            .insert({
              patient_id: patient.id,
              title: 'Health Records Chat',
            })
            .select('id')
            .maybeSingle();

          activeConvId = newConv?.id || crypto.randomUUID();
        }
      } catch {
        activeConvId = crypto.randomUUID();
      }
    }

    if (!activeConvId) {
      activeConvId = crypto.randomUUID();
    }

    // 5. Persist user message to chat_messages (best-effort resilience)
    let savedUserMsgId = crypto.randomUUID();
    try {
      const { data: savedUserMsg, error: saveUserError } = await db
        .from('chat_messages')
        .insert({
          conversation_id: activeConvId,
          patient_id: patient.id,
          role: 'user',
          content: message,
        })
        .select('id, created_at')
        .maybeSingle();

      if (savedUserMsg?.id) {
        savedUserMsgId = savedUserMsg.id;
      } else if (saveUserError) {
        console.warn('User message DB persistence notice:', saveUserError.message);
      }
    } catch (err) {
      console.warn('DB chat_messages write notice:', err);
    }

    // 6. Generate embedding for semantic similarity search
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateEmbedding(message);
    } catch {
      console.warn('Query embedding failed, falling back to basic retrieval');
    }

    // 7. Retrieve ONLY this patient's clinical events
    const events = await retrieveRelevantEvents(patient.id, queryEmbedding);
    const context = formatEventsAsContext(events);

    // 8. Build recent history context for Gemini (bounded to 10 turns)
    let historyForAi: Array<{ role: 'user' | 'model'; content: string }> = [];
    try {
      const { data: recentDbMessages } = await db
        .from('chat_messages')
        .select('id, role, content')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true })
        .limit(12);

      if (recentDbMessages && recentDbMessages.length > 0) {
        historyForAi = formatChatHistoryForAi(
          (recentDbMessages as ChatMessageItem[]).filter((m) => m.id !== savedUserMsgId),
          10
        );
      } else {
        historyForAi = formatChatHistoryForAi(history || [], 10);
      }
    } catch {
      historyForAi = formatChatHistoryForAi(history || [], 10);
    }

    // 9. Generate response with strict system prompt
    let responseText: string;
    try {
      responseText = await chatWithContext(context, message, historyForAi);
    } catch {
      console.error('RAG chat generation error');
      return NextResponse.json(
        {
          error: 'Failed to generate response. Please try again.',
          conversation_id: activeConvId,
          user_message_id: savedUserMsgId,
        },
        { status: 502 }
      );
    }

    // 10. Persist model response to chat_messages (best-effort resilience)
    let savedModelMsgId = crypto.randomUUID();
    try {
      const { data: savedModelMsg, error: saveModelError } = await db
        .from('chat_messages')
        .insert({
          conversation_id: activeConvId,
          patient_id: patient.id,
          role: 'model',
          content: responseText,
        })
        .select('id, created_at')
        .maybeSingle();

      if (savedModelMsg?.id) {
        savedModelMsgId = savedModelMsg.id;
      } else if (saveModelError) {
        console.warn('Model response DB persistence notice:', saveModelError.message);
      }

      await db
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConvId);
    } catch (err) {
      console.warn('DB conversation update notice:', err);
    }

    return NextResponse.json(
      {
        response: responseText,
        conversation_id: activeConvId,
        message_id: savedModelMsgId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('RAG chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
