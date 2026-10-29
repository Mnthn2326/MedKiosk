/**
 * @file lib/chatPersistence.ts
 *
 * Pure utilities for persistent chat history, conversation authorization,
 * deduplication, and context bounding in MedNotes.
 */

export interface ChatMessageItem {
  id?: string;
  role: 'user' | 'model' | 'assistant';
  content: string;
  created_at?: string;
}

/**
 * Verifies that a conversation belongs to the authenticated patient.
 * Prevents unauthorized access or cross-patient conversation tampering.
 */
export function validateConversationOwnership(
  patientId?: string | null,
  conversationPatientId?: string | null
): boolean {
  if (!patientId || !conversationPatientId) return false;
  return patientId.trim().toLowerCase() === conversationPatientId.trim().toLowerCase();
}

/**
 * Sorts chat messages chronologically (oldest first, newest last).
 * Pure function: does not mutate the input array.
 */
export function sortMessagesChronologically(
  messages: ChatMessageItem[]
): ChatMessageItem[] {
  if (!messages || !Array.isArray(messages)) return [];

  return [...messages].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    const validA = !isNaN(timeA);
    const validB = !isNaN(timeB);

    if (validA && validB && timeA !== timeB) {
      return timeA - timeB;
    }
    // Fallback deterministic tie-breaker
    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Deduplicates chat messages by unique ID or role+content+timestamp.
 * Prevents duplicate turns when optimistic messages merge with server-loaded messages.
 */
export function deduplicateMessages(
  existingMessages: ChatMessageItem[],
  incomingMessages: ChatMessageItem[]
): ChatMessageItem[] {
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const result: ChatMessageItem[] = [];

  const addMessage = (msg: ChatMessageItem) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.id) {
      if (seenIds.has(msg.id)) return;
      seenIds.add(msg.id);
    }

    const fingerprint = `${msg.role}:${msg.content.trim()}:${msg.created_at || ''}`;
    if (seenFingerprints.has(fingerprint)) return;
    seenFingerprints.add(fingerprint);

    result.push(msg);
  };

  (existingMessages || []).forEach(addMessage);
  (incomingMessages || []).forEach(addMessage);

  return sortMessagesChronologically(result);
}

/**
 * Formats recent conversation turns for Gemini context, bounded to limit tokens.
 * Maps 'assistant' to 'model' for compatibility with Gemini API.
 */
export function formatChatHistoryForAi(
  messages: ChatMessageItem[],
  limit = 10
): Array<{ role: 'user' | 'model'; content: string }> {
  if (!messages || !Array.isArray(messages)) return [];

  const recent = messages.slice(-limit);

  return recent
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      content: m.content.trim(),
    }));
}
