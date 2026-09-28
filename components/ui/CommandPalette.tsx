'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';

type SearchResult = {
  id: string;
  type: 'patient' | 'link';
  label: string;
  subLabel?: string;
  href: string;
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize role
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();
        if (profile) setRole(profile.role);
      }
    };
    fetchUser();
  }, [supabase]);

  // Global Keyboard Shortcuts (Cmd+K and Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search effect
  useEffect(() => {
    const search = async () => {
      const defaultLinks: SearchResult[] = [];
      if (role === 'doctor') {
        defaultLinks.push({ id: 'link-1', type: 'link', label: 'My Patients', href: '/doctor/patients' });
      } else if (role === 'patient') {
        defaultLinks.push({ id: 'link-1', type: 'link', label: 'My Timeline', href: '/patient/timeline' });
        defaultLinks.push({ id: 'link-2', type: 'link', label: 'Chat', href: '/patient/chat' });
      } else if (role && ['lab', 'diagnostic_center'].includes(role)) {
        defaultLinks.push({ id: 'link-1', type: 'link', label: 'Add Event', href: '/contributor/add-event' });
      }

      if (!query.trim()) {
        setResults(defaultLinks);
        return;
      }

      // If user is a doctor or contributor, they can search patients by MK- code
      let patientResults: SearchResult[] = [];
      if (role !== 'patient' && query.length >= 2) {
        const { data } = await supabase
          .from('patients')
          .select('id, deidentified_code, gender, dob')
          .ilike('deidentified_code', `%${query}%`)
          .limit(5);

        if (data) {
          patientResults = data.map((p) => ({
            id: p.id,
            type: 'patient',
            label: p.deidentified_code,
            subLabel: [p.gender, p.dob ? new Date(p.dob).toLocaleDateString() : ''].filter(Boolean).join(' · '),
            href: role === 'doctor' ? `/doctor/timeline/${p.id}` : `/contributor/add-event?code=${p.deidentified_code}`
          }));
        }
      }

      const filteredLinks = defaultLinks.filter((link) => 
        link.label.toLowerCase().includes(query.toLowerCase())
      );

      setResults([...patientResults, ...filteredLinks]);
      setSelectedIndex(0);
    };

    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [query, role, supabase]);

  // Arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        router.push(results[selectedIndex].href);
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div 
        className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center border-b border-border px-4 py-3">
          <Icon name="ai" size={20} className="text-text-muted mr-3" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none focus:outline-none text-text-primary text-base placeholder:text-text-muted"
            placeholder="Search patients or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="ml-3 p-1 rounded-md text-xs font-mono bg-gray-100 text-text-muted hover:bg-gray-200 border border-border"
          >
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No results found.</p>
          ) : (
            results.map((result, idx) => (
              <button
                key={result.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  router.push(result.href);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-colors ${
                  idx === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-text-primary'
                }`}
              >
                <div>
                  <div className={`text-sm font-medium ${idx === selectedIndex ? 'text-primary' : ''}`}>
                    {result.label}
                  </div>
                  {result.subLabel && (
                    <div className="text-xs text-text-muted mt-0.5">{result.subLabel}</div>
                  )}
                </div>
                <Icon 
                  name={result.type === 'patient' ? 'notes' : 'diagnosis'} 
                  size={16} 
                  className={idx === selectedIndex ? 'text-primary' : 'text-text-muted'} 
                />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
