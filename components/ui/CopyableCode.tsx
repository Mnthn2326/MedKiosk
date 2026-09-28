'use client';

import { toast } from 'sonner';
import { Icon } from './Icon';

interface CopyableCodeProps {
  code: string;
  label?: string;
  className?: string;
}

export function CopyableCode({ code, label, className = '' }: CopyableCodeProps) {
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(code);
    toast.success("Copied code to clipboard");
  };

  return (
    <button 
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary font-mono font-semibold text-sm hover:bg-primary/20 transition-colors cursor-pointer ${className}`}
      title="Copy to clipboard"
    >
      {label && <span className="font-sans text-text-muted font-medium">{label}:</span>}
      {code}
      <Icon name="copy" size={14} className="text-primary/70" />
    </button>
  );
}
