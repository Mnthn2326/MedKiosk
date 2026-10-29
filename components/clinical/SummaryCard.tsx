'use client';

import React, { useState, useEffect } from 'react';
import type { ClinicalEvent, AiSummaryContent } from '@/types/database';
import {
  getSummaryReviewState,
  canReviewSummary,
  getReviewerInfo,
} from '@/lib/summaryReview';

interface SummaryCardProps {
  event: ClinicalEvent;
  onReview?: (
    eventId: string,
    action: 'accept' | 'edit' | 'reject',
    content?: AiSummaryContent
  ) => Promise<void> | void;
  readOnly?: boolean;
}

export function SummaryCard({ event, onReview, readOnly = false }: SummaryCardProps) {
  const content = (event.content || {}) as unknown as AiSummaryContent;

  const [isEditing, setIsEditing] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'accept' | 'edit' | 'reject' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editedContent, setEditedContent] = useState<AiSummaryContent>({
    chief_complaint: content.chief_complaint || '',
    hpi: content.hpi || '',
    past_history: content.past_history || '',
    relevant_results: content.relevant_results || '',
  });

  // Keep editedContent in sync whenever the persisted event updates from the server
  useEffect(() => {
    const raw = (event.content || {}) as unknown as AiSummaryContent;
    setEditedContent({
      chief_complaint: raw.chief_complaint || '',
      hpi: raw.hpi || '',
      past_history: raw.past_history || '',
      relevant_results: raw.relevant_results || '',
    });
  }, [event]);

  const reviewState = getSummaryReviewState(event, isEditing);
  const isAccepted = reviewState === 'accepted';
  const isRejected = reviewState === 'rejected';
  const isPending = reviewState === 'pending';
  const showReviewActions = canReviewSummary(event, readOnly);
  const { reviewerName, reviewTimestamp } = getReviewerInfo(event);

  const handleAccept = async () => {
    if (loadingAction || !onReview) return;
    setLoadingAction('accept');
    setActionError(null);
    try {
      await onReview(event.id, 'accept');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept summary');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async () => {
    if (loadingAction || !onReview) return;
    setLoadingAction('reject');
    setActionError(null);
    try {
      await onReview(event.id, 'reject');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject summary');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSave = async () => {
    if (loadingAction || !onReview) return;
    setLoadingAction('edit');
    setActionError(null);
    try {
      await onReview(event.id, 'edit', editedContent);
      setIsEditing(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = () => {
    // Reset back to server content
    setEditedContent({
      chief_complaint: content.chief_complaint || '',
      hpi: content.hpi || '',
      past_history: content.past_history || '',
      relevant_results: content.relevant_results || '',
    });
    setActionError(null);
    setIsEditing(false);
  };

  // Border color based on review state
  const borderLeftColor = isAccepted
    ? 'border-l-success'
    : isRejected
    ? 'border-l-danger'
    : 'border-l-accent';

  return (
    <div
      className={`bg-white shadow-sm rounded-xl border border-border border-l-4 ${borderLeftColor} overflow-hidden ${
        isRejected ? 'opacity-70' : ''
      }`}
    >
      <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          AI-Generated Summary
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white font-medium">AI</span>
        </h3>
        <div>
          {isAccepted && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-success text-white font-medium flex items-center gap-1 shadow-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Doctor Confirmed
            </span>
          )}
          {isRejected && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-danger text-white font-medium flex items-center gap-1 shadow-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rejected
            </span>
          )}
          {isPending && !isEditing && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium border border-amber-200">
              Pending Review
            </span>
          )}
          {isEditing && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              Editing
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {(['chief_complaint', 'hpi', 'past_history', 'relevant_results'] as const).map((field) => {
          const label = field.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <div key={field}>
              <h4 className="text-sm font-semibold text-text-muted mb-1">{label}</h4>
              {isEditing ? (
                <textarea
                  className="w-full p-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                  rows={3}
                  value={editedContent[field]}
                  disabled={Boolean(loadingAction)}
                  onChange={(e) => setEditedContent({ ...editedContent, [field]: e.target.value })}
                />
              ) : (
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {content[field] || <span className="text-text-muted italic">Not recorded</span>}
                </p>
              )}
            </div>
          );
        })}

        {/* Reviewer metadata section when available */}
        {(reviewerName || reviewTimestamp) && (
          <div className="text-xs text-text-muted pt-3 border-t border-border/40 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>
              {isAccepted ? 'Confirmed' : isRejected ? 'Rejected' : 'Reviewed'}
              {reviewerName ? ` by ${reviewerName}` : ''}
              {reviewTimestamp ? ` on ${new Date(reviewTimestamp).toLocaleDateString()}` : ''}
            </span>
          </div>
        )}
      </div>

      {actionError && (
        <div className="mx-6 mb-3 p-2.5 bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="underline text-[11px] hover:text-danger-hover"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Review actions: ONLY rendered for pending summaries when not read-only */}
      {showReviewActions && !isEditing && (
        <div className="px-6 py-3 border-t border-border/50 flex gap-2 justify-end bg-gray-50">
          <button
            type="button"
            onClick={handleAccept}
            disabled={Boolean(loadingAction)}
            className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loadingAction === 'accept' ? 'Accepting...' : 'Accept'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={Boolean(loadingAction)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={Boolean(loadingAction)}
            className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loadingAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      )}

      {/* Editing actions */}
      {!readOnly && isEditing && (
        <div className="px-6 py-3 border-t border-border/50 flex gap-2 justify-end bg-gray-50">
          <button
            type="button"
            onClick={handleCancel}
            disabled={Boolean(loadingAction)}
            className="px-4 py-2 border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={Boolean(loadingAction)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loadingAction === 'edit' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
