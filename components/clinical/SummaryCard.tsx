'use client';

import React, { useState } from 'react';
import type { ClinicalEvent, AiSummaryContent } from '@/types/database';

interface SummaryCardProps {
  event: ClinicalEvent;
  onReview?: (eventId: string, action: 'accept' | 'edit' | 'reject', content?: AiSummaryContent) => void;
  readOnly?: boolean;
}

export function SummaryCard({ event, onReview, readOnly = false }: SummaryCardProps) {
  const content = event.content as unknown as AiSummaryContent;
  const isRejected = content.rejected === true;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<AiSummaryContent>({
    chief_complaint: content.chief_complaint || '',
    hpi: content.hpi || '',
    past_history: content.past_history || '',
    relevant_results: content.relevant_results || '',
  });

  const handleSave = () => {
    if (onReview) {
      onReview(event.id, 'edit', editedContent);
    }
    setIsEditing(false);
  };

  return (
    <div className={`bg-white shadow-sm rounded-xl border border-border border-l-4 border-l-accent overflow-hidden ${isRejected ? 'opacity-60' : ''}`}>
      <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          AI-Generated Summary
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white font-medium">AI</span>
        </h3>
        {isRejected && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-danger text-white font-medium">Rejected</span>
        )}
      </div>

      <div className="px-6 py-4 space-y-4">
        {['chief_complaint', 'hpi', 'past_history', 'relevant_results'].map((key) => {
          const field = key as keyof Omit<AiSummaryContent, 'rejected'>;
          const label = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          return (
            <div key={key}>
              <h4 className="text-sm font-semibold text-text-muted mb-1">{label}</h4>
              {isEditing ? (
                <textarea
                  className="w-full p-2 border border-border rounded-md text-sm"
                  rows={3}
                  value={editedContent[field]}
                  onChange={(e) => setEditedContent({ ...editedContent, [field]: e.target.value })}
                />
              ) : (
                <p className="text-sm text-text-primary whitespace-pre-wrap">{content[field]}</p>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && !isEditing && (
        <div className="px-6 py-3 border-t border-border/50 flex gap-2 justify-end bg-gray-50">
          <button 
            onClick={() => onReview && onReview(event.id, 'accept')}
            className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            Accept
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            Edit
          </button>
          <button 
            onClick={() => onReview && onReview(event.id, 'reject')}
            className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            Reject
          </button>
        </div>
      )}

      {!readOnly && isEditing && (
        <div className="px-6 py-3 border-t border-border/50 flex gap-2 justify-end bg-gray-50">
          <button 
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
