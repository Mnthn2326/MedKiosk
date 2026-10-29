/**
 * @file lib/useDraft.ts
 *
 * Clinical Consultation Note Draft Management Hook for MedNotes SOAP Workspace.
 *
 * CLINICAL DATA & SECURITY ARCHITECTURE CONSIDERATIONS:
 * 1. Storage Scope & Exposure Risk:
 *    - Drafts are persisted in browser-local storage (localStorage) to prevent accidental loss
 *      of work due to tab closures, network hiccups, or unexpected navigation.
 *    - localStorage is unencrypted client-side storage accessible to any JavaScript running
 *      under the same origin (XSS vulnerability risk) and persistent across browser sessions.
 *    - CLINICAL RULE: NEVER store direct Patient Health Information (PHI) like full names,
 *      addresses, phone numbers, SSNs, Aadhaar, or insurance numbers in local draft payloads.
 *    - Keys and payloads must strictly use deidentified system identifiers (e.g., doctor UUID
 *      and patient UUID or deidentified patient code).
 *
 * 2. Lifecycle & Data Hygiene:
 *    - Short TTL: Drafts are tagged with a creation/update timestamp (`savedAt`) and enforced
 *      with a maximum Time-To-Live (default: 24 hours / 86,400,000 ms). Expired drafts are purged.
 *    - Purge on Completion: Upon successful note submission (`/api/clinical-events`), the draft
 *      is immediately wiped via `clearDraft()`.
 *    - Preserve on Error: If submission encounters network, validation, or server errors,
 *      the draft remains intact in local storage and in reactive state.
 *    - Purge on Logout: All drafts scoped to `draft:v1:*` are purged during user sign-out
 *      (enforced in `Sidebar.tsx`).
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface DraftPayload<T> {
  version: number;
  savedAt: number; // Date.now() timestamp
  data: T;
}

export interface UseDraftOptions {
  ttlMs?: number;
  debounceMs?: number;
  consultationId?: string;
}

export interface UseDraftReturn<T> {
  draftState: T;
  setDraftState: React.Dispatch<React.SetStateAction<T>>;
  clearDraft: () => void;
  isDirty: boolean;
  restored: boolean;
  isLoading: boolean;
}

export const DEFAULT_DRAFT_TTL_MS = 86400000; // 24 hours
export const DEFAULT_DRAFT_DEBOUNCE_MS = 1000; // 1 second

/**
 * Builds a deterministic, scoped storage key to prevent cross-patient or cross-user collision.
 * Format: `draft:v1:<userId>:<patientId>[:<consultationId>]`
 */
export function getDraftStorageKey(
  userId: string,
  patientId: string,
  consultationId?: string
): string {
  const cleanUserId = userId ? String(userId).trim() : 'anon';
  const cleanPatientId = patientId ? String(patientId).trim() : 'global';
  const parts = ['draft', 'v1', cleanUserId, cleanPatientId];
  if (consultationId) {
    parts.push(String(consultationId).trim());
  }
  return parts.join(':');
}

/**
 * Custom React hook for managing auto-saved clinical consultation drafts.
 */
export function useDraft<T>(
  userId: string,
  patientId: string,
  initialData: T,
  options?: UseDraftOptions
): UseDraftReturn<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_DRAFT_TTL_MS;
  const debounceMs = options?.debounceMs ?? DEFAULT_DRAFT_DEBOUNCE_MS;
  const consultationId = options?.consultationId;

  const storageKey = useMemo(
    () => getDraftStorageKey(userId, patientId, consultationId),
    [userId, patientId, consultationId]
  );

  // Keep a stable ref to initialData
  const initialDataRef = useRef<T>(initialData);
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  // State management
  const [draftState, _setDraftState] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [restored, setRestored] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Mutable refs to prevent stale closures during unmount, beforeunload, and rapid typing
  const isDirtyRef = useRef<boolean>(false);
  const draftStateRef = useRef<T>(draftState);
  const isInitializedRef = useRef<boolean>(false);
  const storageKeyRef = useRef<string>(storageKey);
  const prevStorageKeyRef = useRef<string>(storageKey);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize refs with state
  draftStateRef.current = draftState;
  isDirtyRef.current = isDirty;
  isInitializedRef.current = isInitialized;
  storageKeyRef.current = storageKey;

  // Safely read and validate from localStorage
  const readStoredDraft = useCallback(
    (key: string): { data: T; isRestored: boolean } | null => {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as DraftPayload<T>;
        if (!parsed || typeof parsed !== 'object') {
          window.localStorage.removeItem(key);
          return null;
        }

        // Validate TTL expiration
        if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > ttlMs) {
          window.localStorage.removeItem(key);
          return null;
        }

        // Validate payload content exists
        if ('data' in parsed && parsed.data !== undefined && parsed.data !== null) {
          return { data: parsed.data, isRestored: true };
        }

        // Malformed payload structure
        window.localStorage.removeItem(key);
        return null;
      } catch (err) {
        console.warn(`[useDraft] Error reading or parsing stored draft for key "${key}":`, err);
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore storage access errors
        }
        return null;
      }
    },
    [ttlMs]
  );

  // Safely persist payload to localStorage
  const persistDraft = useCallback((key: string, data: T) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const payload: DraftPayload<T> = {
        version: 1,
        savedAt: Date.now(),
        data,
      };
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn(`[useDraft] Failed to write draft to localStorage for key "${key}":`, err);
    }
  }, []);

  // Step 1: Initial client-side restoration on mount or storageKey change
  useEffect(() => {
    // If key changed and previous draft was dirty and initialized, flush previous draft first
    if (
      prevStorageKeyRef.current !== storageKey &&
      isDirtyRef.current &&
      isInitializedRef.current
    ) {
      persistDraft(prevStorageKeyRef.current, draftStateRef.current);
    }
    prevStorageKeyRef.current = storageKey;

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const stored = readStoredDraft(storageKey);
    if (stored) {
      _setDraftState(stored.data);
      draftStateRef.current = stored.data;
      setRestored(true);
      setIsDirty(true);
      isDirtyRef.current = true;
    } else {
      _setDraftState(initialDataRef.current);
      draftStateRef.current = initialDataRef.current;
      setRestored(false);
      setIsDirty(false);
      isDirtyRef.current = false;
    }

    setIsInitialized(true);
    isInitializedRef.current = true;
  }, [storageKey, readStoredDraft, persistDraft]);

  // Reactive updater for draft state
  const setDraftState: React.Dispatch<React.SetStateAction<T>> = useCallback((action) => {
    setIsDirty(true);
    isDirtyRef.current = true;

    _setDraftState((prev) => {
      const next =
        typeof action === 'function'
          ? (action as (prevState: T) => T)(prev)
          : action;
      draftStateRef.current = next;
      return next;
    });
  }, []);

  // Step 2: Debounced auto-save effect
  useEffect(() => {
    // Prevent default initial state from overwriting existing draft before restoration finishes
    if (!isInitialized) return;
    // Only persist if modified / dirty
    if (!isDirty) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistDraft(storageKey, draftState);
      debounceTimerRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [draftState, isDirty, isInitialized, storageKey, debounceMs, persistDraft]);

  // Step 3: Flush unpersisted changes on unmount or beforeunload if dirty
  useEffect(() => {
    const flushDraft = () => {
      if (isDirtyRef.current && isInitializedRef.current) {
        persistDraft(storageKeyRef.current, draftStateRef.current);
      }
    };

    const handleBeforeUnload = () => {
      flushDraft();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      flushDraft();
    };
  }, [persistDraft]);

  // Step 4: Clear draft on demand (after successful submission)
  const clearDraft = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsDirty(false);
    isDirtyRef.current = false;
    setRestored(false);
    _setDraftState(initialDataRef.current);
    draftStateRef.current = initialDataRef.current;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch (err) {
        console.warn(`[useDraft] Error removing draft for key "${storageKey}":`, err);
      }
    }
  }, [storageKey]);

  return {
    draftState,
    setDraftState,
    clearDraft,
    isDirty,
    restored,
    isLoading: !isInitialized,
  };
}
