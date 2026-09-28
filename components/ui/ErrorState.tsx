import React from 'react';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "We encountered an unexpected error while trying to fetch the data. Please try again.",
  onRetry 
}: ErrorStateProps) {
  return (
    <EmptyState
      icon="alert"
      title={title}
      description={description}
      actionLabel={onRetry ? "Retry Request" : undefined}
      onAction={onRetry}
      variant="error"
    />
  );
}
