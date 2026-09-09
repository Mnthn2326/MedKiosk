import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, color, className = '' }) => {
  const isHex = color?.startsWith('#');
  
  const style = isHex ? { backgroundColor: color, color: '#FFFFFF' } : {};
  const colorClass = !isHex && color ? color : 'bg-primary text-white';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isHex ? '' : colorClass} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
};

export default Badge;
