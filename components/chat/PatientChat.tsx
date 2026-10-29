'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { deduplicateMessages } from '@/lib/chatPersistence';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  created_at?: string;
}

export default function PatientChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load persisted conversation history on mount
  const loadHistory = useCallback(async () => {
    setInitialLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/rag/chat', { method: 'GET' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 401 || res.status === 403) {
          throw new Error(data?.error || 'Authentication required to access chat');
        }
        console.warn('Could not load chat history:', data?.error);
        setConversationId((prev) => prev || crypto.randomUUID());
        return;
      }
      const data = await res.json();
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      if (Array.isArray(data.messages)) {
        setMessages((prev) =>
          deduplicateMessages(
            prev,
            data.messages.map((m: { id?: string; role: 'user' | 'model'; content: string; created_at?: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              created_at: m.created_at,
            }))
          ) as ChatMessage[]
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('Authentication') || err.message.includes('unauthorized'))) {
        setLoadError(err.message);
      } else {
        console.warn('Chat history load notice:', err);
      }
      setConversationId((prev) => prev || crypto.randomUUID());
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setLoading(true);

    let activeId = conversationId;
    if (!activeId) {
      activeId = crypto.randomUUID();
      setConversationId(activeId);
    }

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: activeId,
          history: messages.slice(-10),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to get response');
      }

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id,
          role: 'model',
          content: data.response,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content:
            err instanceof Error
              ? `Error: ${err.message}`
              : 'Something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Error banner when loading history fails */}
      {loadError && (
        <div className="p-3 mb-3 bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs flex items-center justify-between">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadHistory}
            className="underline font-medium hover:text-danger-hover"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat messages viewport */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {initialLoading && (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted space-y-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading conversation history...</p>
          </div>
        )}

        {!initialLoading && messages.length === 0 && (
          <EmptyState
            icon="chat"
            title="Ask about your health records"
            description="I can help you understand your clinical records. I only answer based on your own medical records and cannot provide medical advice."
            variant="subtle"
          >
            <div className="mt-6 space-y-2">
              <p className="text-xs text-text-muted">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'What medications am I currently on?',
                  'What were my last lab results?',
                  'Summarize my recent diagnoses',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-primary/10 transition-colors text-text-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </EmptyState>
        )}

        {!initialLoading &&
          messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] ${
                  msg.role === 'user' ? 'bg-primary text-white' : 'bg-primary-light'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </Card>
            </div>
          ))}

        {loading && (
          <div className="flex justify-start">
            <Card className="bg-primary-light">
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <span
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
                Searching your records...
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your health records..."
            rows={1}
            disabled={loading || initialLoading}
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading || initialLoading}
          >
            Send
          </Button>
        </div>
        <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
          <Icon name="alert" size={12} className="text-status-abnormal-dot" />
          This assistant only answers from your medical records and does not provide medical advice.
        </p>
      </div>
    </div>
  );
}
