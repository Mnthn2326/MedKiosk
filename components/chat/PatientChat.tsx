'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export default function PatientChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const { response } = await res.json();
      setMessages((prev) => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content:
            err instanceof Error
              ? `Error: ${err.message}`
              : 'Something went wrong. Please try again.',
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
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              Ask about your health records
            </h3>
            <p className="text-text-muted text-sm max-w-md mx-auto">
              I can help you understand your clinical records. I only answer based on your
              own medical records and cannot provide medical advice.
            </p>
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
                    className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-primary-light transition-colors text-text-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-primary-light'
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
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            Send
          </Button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          ⚠️ This assistant only answers from your medical records and does not provide medical advice.
        </p>
      </div>
    </div>
  );
}
