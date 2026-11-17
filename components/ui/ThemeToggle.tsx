'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  collapsed?: boolean;
  className?: string;
}

export function ThemeToggle({ collapsed = false, className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mednotes_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mednotes_theme', 'light');
    }
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/70 ${className}`}
        aria-label="Toggle theme"
      >
        <span className="w-5 h-5" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer w-full text-left overflow-hidden ${className}`}
      title={isDark ? 'Switch to Clinical Calm (Light)' : 'Switch to Tactical Night (Dark)'}
      aria-label={isDark ? 'Switch to Clinical Calm (Light)' : 'Switch to Tactical Night (Dark)'}
    >
      <div className="shrink-0 p-0.5">
        {isDark ? (
          <Moon size={18} className="text-primary animate-in spin-in-90 duration-200" />
        ) : (
          <Sun size={18} className="text-amber-300 animate-in spin-in-90 duration-200" />
        )}
      </div>

      <div
        className={`flex flex-col whitespace-nowrap overflow-hidden transition-opacity duration-300 ${
          collapsed ? 'md:opacity-0 md:w-0' : 'opacity-100'
        }`}
      >
        <span className="text-xs font-semibold leading-tight">
          {isDark ? 'Tactical Night' : 'Clinical Calm'}
        </span>
        <span className="text-[10px] text-white/60">
          {isDark ? 'Dark Theme' : 'Light Theme'}
        </span>
      </div>
    </button>
  );
}

export default ThemeToggle;
