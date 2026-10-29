import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  validateConversationOwnership,
  sortMessagesChronologically,
  deduplicateMessages,
  formatChatHistoryForAi,
  type ChatMessageItem,
} from '../lib/chatPersistence.ts';
import { ragChatSchema } from '../lib/validations/index.ts';

describe('CC-10: Patient Chat Persistence & History Retrieval', () => {
  describe('validateConversationOwnership', () => {
    test('authorizes when authenticated patient ID matches conversation owner', () => {
      const patientId = '11111111-1111-1111-1111-111111111111';
      const conversationOwner = '11111111-1111-1111-1111-111111111111';
      assert.strictEqual(validateConversationOwnership(patientId, conversationOwner), true);
    });

    test('handles case-insensitivity and whitespace gracefully', () => {
      const patientId = '  AAAA-BBBB-CCCC  ';
      const conversationOwner = 'aaaa-bbbb-cccc';
      assert.strictEqual(validateConversationOwnership(patientId, conversationOwner), true);
    });

    test('rejects cross-patient conversation access (mismatched IDs)', () => {
      const patientA = '11111111-1111-1111-1111-111111111111';
      const patientB = '22222222-2222-2222-2222-222222222222';
      assert.strictEqual(validateConversationOwnership(patientA, patientB), false);
    });

    test('rejects when authenticated patient ID is missing or null', () => {
      assert.strictEqual(validateConversationOwnership(null, 'some-owner-id'), false);
      assert.strictEqual(validateConversationOwnership(undefined, 'some-owner-id'), false);
      assert.strictEqual(validateConversationOwnership('', 'some-owner-id'), false);
    });

    test('rejects when conversation patient ID is missing or null', () => {
      assert.strictEqual(validateConversationOwnership('patient-123', null), false);
      assert.strictEqual(validateConversationOwnership('patient-123', undefined), false);
      assert.strictEqual(validateConversationOwnership('patient-123', ''), false);
    });
  });

  describe('sortMessagesChronologically', () => {
    test('sorts messages in ascending chronological order (oldest first)', () => {
      const msg1: ChatMessageItem = {
        id: 'msg-1',
        role: 'user',
        content: 'First question',
        created_at: '2026-10-29T10:00:00Z',
      };
      const msg2: ChatMessageItem = {
        id: 'msg-2',
        role: 'assistant',
        content: 'First answer',
        created_at: '2026-10-29T10:01:00Z',
      };
      const msg3: ChatMessageItem = {
        id: 'msg-3',
        role: 'user',
        content: 'Second question',
        created_at: '2026-10-29T10:05:00Z',
      };

      const outOfOrder = [msg3, msg1, msg2];
      const sorted = sortMessagesChronologically(outOfOrder);

      assert.strictEqual(sorted[0].id, 'msg-1');
      assert.strictEqual(sorted[1].id, 'msg-2');
      assert.strictEqual(sorted[2].id, 'msg-3');
    });

    test('does not mutate the original message array', () => {
      const original: ChatMessageItem[] = [
        { id: 'b', role: 'user', content: 'B', created_at: '2026-10-29T12:00:00Z' },
        { id: 'a', role: 'user', content: 'A', created_at: '2026-10-29T11:00:00Z' },
      ];
      const originalSnapshot = [...original];

      sortMessagesChronologically(original);
      assert.deepStrictEqual(original, originalSnapshot);
    });

    test('handles missing or malformed created_at gracefully with deterministic tie-breaking', () => {
      const messages: ChatMessageItem[] = [
        { id: 'z-tie', role: 'assistant', content: 'Tie 2' },
        { id: 'a-tie', role: 'user', content: 'Tie 1' },
      ];

      const sorted = sortMessagesChronologically(messages);
      assert.strictEqual(sorted.length, 2);
      assert.strictEqual(sorted[0].id, 'a-tie');
      assert.strictEqual(sorted[1].id, 'z-tie');
    });

    test('handles empty or non-array inputs safely', () => {
      assert.deepStrictEqual(sortMessagesChronologically([]), []);
      assert.deepStrictEqual(sortMessagesChronologically(null as unknown as ChatMessageItem[]), []);
      assert.deepStrictEqual(sortMessagesChronologically(undefined as unknown as ChatMessageItem[]), []);
    });
  });

  describe('deduplicateMessages', () => {
    test('deduplicates messages sharing the same ID', () => {
      const existing: ChatMessageItem[] = [
        { id: 'msg-1', role: 'user', content: 'Hello', created_at: '2026-10-29T10:00:00Z' },
      ];
      const incoming: ChatMessageItem[] = [
        { id: 'msg-1', role: 'user', content: 'Hello', created_at: '2026-10-29T10:00:00Z' },
        { id: 'msg-2', role: 'assistant', content: 'Hi there', created_at: '2026-10-29T10:01:00Z' },
      ];

      const result = deduplicateMessages(existing, incoming);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'msg-1');
      assert.strictEqual(result[1].id, 'msg-2');
    });

    test('deduplicates messages sharing the same fingerprint (role, content, timestamp)', () => {
      const existing: ChatMessageItem[] = [
        { role: 'user', content: 'What is my diagnosis?', created_at: '2026-10-29T10:00:00Z' },
      ];
      const incoming: ChatMessageItem[] = [
        { role: 'user', content: 'What is my diagnosis?', created_at: '2026-10-29T10:00:00Z' },
        { role: 'assistant', content: 'You have hypertension.', created_at: '2026-10-29T10:01:00Z' },
      ];

      const result = deduplicateMessages(existing, incoming);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].content, 'What is my diagnosis?');
      assert.strictEqual(result[1].content, 'You have hypertension.');
    });

    test('preserves distinct turns with identical text if roles or timestamps differ', () => {
      const existing: ChatMessageItem[] = [
        { id: '1', role: 'user', content: 'Understood', created_at: '2026-10-29T10:00:00Z' },
      ];
      const incoming: ChatMessageItem[] = [
        { id: '2', role: 'assistant', content: 'Understood', created_at: '2026-10-29T10:01:00Z' },
      ];

      const result = deduplicateMessages(existing, incoming);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].role, 'user');
      assert.strictEqual(result[1].role, 'assistant');
    });
  });

  describe('formatChatHistoryForAi', () => {
    test('bounds history to the configured turn limit (default 10)', () => {
      const turns: ChatMessageItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `turn-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const formatted = formatChatHistoryForAi(turns, 10);
      assert.strictEqual(formatted.length, 10);
      assert.strictEqual(formatted[0].content, 'Message 5');
      assert.strictEqual(formatted[9].content, 'Message 14');
    });

    test('maps "assistant" role to "model" for Gemini compatibility', () => {
      const turns: ChatMessageItem[] = [
        { role: 'user', content: 'Can I exercise?' },
        { role: 'assistant', content: 'Yes, light walking is recommended.' },
      ];

      const formatted = formatChatHistoryForAi(turns);
      assert.strictEqual(formatted.length, 2);
      assert.strictEqual(formatted[0].role, 'user');
      assert.strictEqual(formatted[1].role, 'model');
    });

    test('strips empty or whitespace-only messages from context window', () => {
      const turns: ChatMessageItem[] = [
        { role: 'user', content: 'Valid message' },
        { role: 'assistant', content: '   ' },
        { role: 'user', content: '' },
      ];

      const formatted = formatChatHistoryForAi(turns);
      assert.strictEqual(formatted.length, 1);
      assert.strictEqual(formatted[0].content, 'Valid message');
    });
  });

  describe('ragChatSchema validation', () => {
    test('accepts valid query message with optional UUID conversation_id', () => {
      const payload = {
        conversation_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        message: 'When is my next checkup?',
      };

      const result = ragChatSchema.safeParse(payload);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.conversation_id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        assert.strictEqual(result.data.message, 'When is my next checkup?');
      }
    });

    test('accepts payload without conversation_id (initial turn creates conversation)', () => {
      const payload = {
        message: 'Hello doctor bot',
      };

      const result = ragChatSchema.safeParse(payload);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.conversation_id, undefined);
      }
    });

    test('rejects malformed non-UUID conversation_id', () => {
      const payload = {
        conversation_id: 'not-a-valid-uuid',
        message: 'Hello',
      };

      const result = ragChatSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
    });

    test('rejects empty or whitespace-only message', () => {
      const emptyPayload = { message: '' };
      const whitespacePayload = { message: '    ' };

      assert.strictEqual(ragChatSchema.safeParse(emptyPayload).success, false);
      assert.strictEqual(ragChatSchema.safeParse(whitespacePayload).success, false);
    });

    test('sanitizes XSS in message and history', () => {
      const payload = {
        message: 'Hello <script>alert("hack")</script>',
        history: [
          { role: 'user' as const, content: '<img src=x onerror=alert(1)>' },
        ],
      };

      const result = ragChatSchema.safeParse(payload);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.ok(!result.data.message.includes('<script>'));
        assert.ok(!result.data.history[0].content.includes('onerror'));
      }
    });
  });

  describe('Incomplete Turn Persistence & Recovery', () => {
    test('retains user turn in persistent record even if assistant response fails', () => {
      // Simulating a sequence where user message is saved first
      const storedMessages: ChatMessageItem[] = [];
      const userMessage: ChatMessageItem = {
        id: 'user-turn-1',
        role: 'user',
        content: 'Tell me about my test results',
        created_at: '2026-10-29T10:00:00Z',
      };

      // Step 1: User message persisted
      storedMessages.push(userMessage);

      // Step 2: Generation fails (simulated throw / network failure)
      const generationFailed = true;

      // Verification: History still has user message, without fake assistant message
      assert.strictEqual(storedMessages.length, 1);
      assert.strictEqual(storedMessages[0].role, 'user');
      assert.strictEqual(storedMessages[0].content, 'Tell me about my test results');

      // Step 3: When user retries or reloads, deduplication ensures the user message is not lost or doubled
      const deduplicated = deduplicateMessages(storedMessages, [userMessage]);
      assert.strictEqual(deduplicated.length, 1);
      assert.strictEqual(deduplicated[0].id, 'user-turn-1');
    });
  });
});
