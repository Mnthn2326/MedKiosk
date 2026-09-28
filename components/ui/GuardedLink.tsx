'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DraftContextType {
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
}

export const DraftContext = createContext<DraftContextType>({
  isDirty: false,
  setIsDirty: () => {},
});

export const DraftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDirty, setIsDirty] = useState(false);

  // Catch external navigations and reloads
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for legacy browsers
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <DraftContext.Provider value={{ isDirty, setIsDirty }}>
      {children}
    </DraftContext.Provider>
  );
};

export function useDraftContext() {
  return useContext(DraftContext);
}

// Custom link that respects the dirty state for internal navigation
export const GuardedLink = React.forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>(
  (props, ref) => {
    const { isDirty } = useDraftContext();
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isDirty) {
        e.preventDefault();
        if (window.confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
          router.push(props.href.toString());
        }
      } else if (props.onClick) {
        props.onClick(e);
      }
    };

    return <Link ref={ref} {...props} onClick={handleClick} />;
  }
);
GuardedLink.displayName = 'GuardedLink';
