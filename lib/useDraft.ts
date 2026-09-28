export interface DraftPayload<T> {
  version: number;
  savedAt: number; // Date.now() timestamp
  data: T;
}

export function useDraft<T>(
  userId: string,
  patientId: string,
  initialData: T,
  options?: {
    ttlMs?: number;
    debounceMs?: number;
  }
): {
  draftState: T;
  setDraftState: React.Dispatch<React.SetStateAction<T>>;
  clearDraft: () => void;
  isDirty: boolean;
  restored: boolean;
} {
  // USER WILL IMPLEMENT THIS HOOK. 
  // Returning a dummy implementation to allow UI to compile during development.
  return {
    draftState: initialData,
    setDraftState: () => {},
    clearDraft: () => {},
    isDirty: false,
    restored: false,
  };
}
