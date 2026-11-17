import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'MediKiosk+',
  description: 'Unified health platform — Clinical Core, FinHealth, Emergency',
};

import { CommandPalette } from '@/components/ui/CommandPalette';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('mednotes_theme');
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <CommandPalette />
        {children}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          toastOptions={{
            style: {
              borderRadius: '12px',
              fontFamily: 'var(--font-sans)',
            },
            classNames: {
              toast: 'group-[.toaster]:font-sans',
            }
          }}
        />
      </body>
    </html>
  );
}
