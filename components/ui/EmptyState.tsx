import React from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'subtle' | 'error';
  children?: React.ReactNode;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction, 
  variant = 'default',
  children 
}: EmptyStateProps) {
  const isError = variant === 'error';
  
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-xl ${variant === 'subtle' ? '' : 'bg-white border border-border shadow-sm'}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isError ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
        <Icon name={icon} size={32} />
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-md mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`px-4 py-2 font-medium rounded-lg transition-colors mb-4 ${
            isError 
              ? 'bg-danger text-white hover:bg-danger/90' 
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {actionLabel}
        </button>
      )}

      {children && (
        <div className="w-full max-w-md mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
