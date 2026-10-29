import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useDraft, getDraftStorageKey } from '../lib/useDraft.ts';
import type { DraftPayload } from '../lib/useDraft.ts';

// Setup Mock DOM environment for React 19 testing in Node
class MockHTMLElement {}
class MockHTMLIFrameElement {}

globalThis.HTMLElement = MockHTMLElement as unknown as typeof HTMLElement;
globalThis.HTMLIFrameElement = MockHTMLIFrameElement as unknown as typeof HTMLIFrameElement;
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
}

const mockStorage = new MockLocalStorage();
const windowListeners: Record<string, ((...args: unknown[]) => void)[]> = {};

globalThis.window = {
  HTMLElement: MockHTMLElement,
  HTMLIFrameElement: MockHTMLIFrameElement,
  localStorage: mockStorage as unknown as Storage,
  addEventListener: (event: string, fn: (...args: unknown[]) => void) => {
    windowListeners[event] = windowListeners[event] || [];
    windowListeners[event].push(fn);
  },
  removeEventListener: (event: string, fn: (...args: unknown[]) => void) => {
    if (windowListeners[event]) {
      windowListeners[event] = windowListeners[event].filter((f) => f !== fn);
    }
  },
} as unknown as Window & typeof globalThis;

function createMockElement(tag: string) {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const el: Record<string, unknown> = {
    nodeType: 1,
    nodeName: tag.toUpperCase(),
    tagName: tag.toUpperCase(),
    childNodes: [] as unknown[],
    ownerDocument: null as unknown,
    style: {},
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    addEventListener: (t: string, fn: (...args: unknown[]) => void) => {
      listeners[t] = listeners[t] || [];
      listeners[t].push(fn);
    },
    removeEventListener: () => {},
    appendChild: (child: unknown) => {
      (el.childNodes as unknown[]).push(child);
      (child as Record<string, unknown>).parentNode = el;
      return child;
    },
    removeChild: (child: unknown) => {
      el.childNodes = (el.childNodes as unknown[]).filter((c) => c !== child);
      (child as Record<string, unknown>).parentNode = null;
      return child;
    },
    insertBefore: (child: unknown) => {
      (el.childNodes as unknown[]).push(child);
      return child;
    },
  };
  return el;
}

const docListeners: Record<string, ((...args: unknown[]) => void)[]> = {};
const mockDoc: any = {
  nodeType: 9,
  defaultView: globalThis.window,
  createElement: (tag: string) => {
    const el = createMockElement(tag);
    el.ownerDocument = mockDoc;
    return el;
  },
  createElementNS: (_ns: string, tag: string) => {
    const el = createMockElement(tag);
    el.ownerDocument = mockDoc;
    return el;
  },
  createDocumentFragment: () => {
    const el = createMockElement('fragment');
    el.ownerDocument = mockDoc;
    return el;
  },
  createTextNode: (text: string) => ({
    nodeType: 3,
    nodeValue: text,
    ownerDocument: mockDoc,
  }),
  addEventListener: (t: string, fn: (...args: unknown[]) => void) => {
    docListeners[t] = docListeners[t] || [];
    docListeners[t].push(fn);
  },
  removeEventListener: () => {},
};

mockDoc.documentElement = mockDoc.createElement('html');
mockDoc.body = mockDoc.createElement('body');
globalThis.document = mockDoc as unknown as Document;

interface SoapTestState {
  subjective: { chiefComplaint: string };
  objective: { bloodPressure: string; heartRate: string };
  assessment: { diagnosisTitle: string; icdCode: string };
  plan: { medications: Array<{ name: string; dosage: string }> };
}

const INITIAL_TEST_SOAP: SoapTestState = {
  subjective: { chiefComplaint: '' },
  objective: { bloodPressure: '', heartRate: '' },
  assessment: { diagnosisTitle: '', icdCode: '' },
  plan: { medications: [] },
};

// Helper hook harness
function renderDraftHook<T>(
  userId: string,
  patientId: string,
  initialData: T,
  options?: { ttlMs?: number; debounceMs?: number; consultationId?: string }
) {
  let hookValue!: ReturnType<typeof useDraft<T>>;
  const container = mockDoc.createElement('div');
  const root = createRoot(container as unknown as HTMLElement);

  function TestComponent({
    uId,
    pId,
    init,
    opts,
  }: {
    uId: string;
    pId: string;
    init: T;
    opts?: typeof options;
  }) {
    hookValue = useDraft<T>(uId, pId, init, opts);
    return null;
  }

  return {
    async mount() {
      await act(async () => {
        root.render(
          React.createElement(TestComponent, {
            uId: userId,
            pId: patientId,
            init: initialData,
            opts: options,
          })
        );
      });
      return hookValue;
    },
    async updateProps(newUId: string, newPId: string, newInit: T, newOpts?: typeof options) {
      await act(async () => {
        root.render(
          React.createElement(TestComponent, {
            uId: newUId,
            pId: newPId,
            init: newInit,
            opts: newOpts,
          })
        );
      });
      return hookValue;
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
    getHook() {
      return hookValue;
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('CC-01: useDraft Clinical Hook', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('generates correct, isolated storage keys', () => {
    const key1 = getDraftStorageKey('doc-1', 'pat-A');
    const key2 = getDraftStorageKey('doc-1', 'pat-B');
    const key3 = getDraftStorageKey('doc-2', 'pat-A');
    const keyWithConsult = getDraftStorageKey('doc-1', 'pat-A', 'consult-99');

    assert.strictEqual(key1, 'draft:v1:doc-1:pat-A');
    assert.strictEqual(key2, 'draft:v1:doc-1:pat-B');
    assert.strictEqual(key3, 'draft:v1:doc-2:pat-A');
    assert.strictEqual(keyWithConsult, 'draft:v1:doc-1:pat-A:consult-99');
    assert.notStrictEqual(key1, key2);
    assert.notStrictEqual(key1, key3);
  });

  test('updates SOAP fields reactively while typing and tracks isDirty', async () => {
    const harness = renderDraftHook('doc-123', 'pat-456', INITIAL_TEST_SOAP, { debounceMs: 50 });
    await harness.mount();

    const hook = harness.getHook();
    assert.strictEqual(hook.isDirty, false, 'Initially not dirty');
    assert.strictEqual(hook.restored, false, 'Initially not restored');
    assert.strictEqual(hook.draftState.subjective.chiefComplaint, '');

    // Doctor types Subjective Chief Complaint
    await act(async () => {
      hook.setDraftState((prev) => ({
        ...prev,
        subjective: { chiefComplaint: 'Acute chest tightness and coughing' },
      }));
    });

    assert.strictEqual(
      harness.getHook().draftState.subjective.chiefComplaint,
      'Acute chest tightness and coughing'
    );
    assert.strictEqual(harness.getHook().isDirty, true, 'Marked dirty after typing');

    // Doctor updates Assessment
    await act(async () => {
      hook.setDraftState((prev) => ({
        ...prev,
        assessment: { diagnosisTitle: 'Bronchitis', icdCode: 'J40' },
      }));
    });

    assert.strictEqual(harness.getHook().draftState.assessment.diagnosisTitle, 'Bronchitis');
    assert.strictEqual(harness.getHook().draftState.assessment.icdCode, 'J40');

    // Wait for debounced persistence
    await act(async () => {
      await sleep(80);
    });

    const key = getDraftStorageKey('doc-123', 'pat-456');
    const rawSaved = mockStorage.getItem(key);
    assert.ok(rawSaved, 'Draft should be persisted to localStorage after debounce');

    const parsed = JSON.parse(rawSaved) as DraftPayload<SoapTestState>;
    assert.strictEqual(parsed.version, 1);
    assert.strictEqual(parsed.data.subjective.chiefComplaint, 'Acute chest tightness and coughing');
    assert.strictEqual(parsed.data.assessment.diagnosisTitle, 'Bronchitis');

    await harness.unmount();
  });

  test('restores an existing draft on mount with restored: true and isDirty: true', async () => {
    const key = getDraftStorageKey('doc-100', 'pat-200');
    const existingDraft: DraftPayload<SoapTestState> = {
      version: 1,
      savedAt: Date.now(),
      data: {
        subjective: { chiefComplaint: 'Persistent migraine for 3 days' },
        objective: { bloodPressure: '130/85', heartRate: '78' },
        assessment: { diagnosisTitle: 'Migraine without aura', icdCode: 'G43.0' },
        plan: { medications: [{ name: 'Sumatriptan', dosage: '50mg' }] },
      },
    };
    mockStorage.setItem(key, JSON.stringify(existingDraft));

    const harness = renderDraftHook('doc-100', 'pat-200', INITIAL_TEST_SOAP, { debounceMs: 50 });
    await harness.mount();

    const hook = harness.getHook();
    assert.strictEqual(hook.restored, true, 'Draft should be marked restored');
    assert.strictEqual(hook.isDirty, true, 'Restored unsaved draft must be dirty');
    assert.strictEqual(
      hook.draftState.subjective.chiefComplaint,
      'Persistent migraine for 3 days'
    );
    assert.strictEqual(hook.draftState.assessment.diagnosisTitle, 'Migraine without aura');
    assert.strictEqual(hook.draftState.plan.medications[0].name, 'Sumatriptan');

    await harness.unmount();
  });

  test('prevents default initial state from overwriting an existing draft before restoration finishes', async () => {
    const key = getDraftStorageKey('doc-999', 'pat-888');
    const savedDraft: DraftPayload<SoapTestState> = {
      version: 1,
      savedAt: Date.now(),
      data: {
        ...INITIAL_TEST_SOAP,
        subjective: { chiefComplaint: 'Pre-existing clinical note' },
        assessment: { diagnosisTitle: 'Pneumonia', icdCode: 'J18.9' },
      },
    };
    mockStorage.setItem(key, JSON.stringify(savedDraft));

    const harness = renderDraftHook('doc-999', 'pat-888', INITIAL_TEST_SOAP, { debounceMs: 10 });
    // Mount without typing
    await harness.mount();

    // Verify localStorage was NOT overwritten by INITIAL_TEST_SOAP
    const stored = JSON.parse(mockStorage.getItem(key)!) as DraftPayload<SoapTestState>;
    assert.strictEqual(
      stored.data.subjective.chiefComplaint,
      'Pre-existing clinical note',
      'Initial state must not overwrite stored draft'
    );
    assert.strictEqual(stored.data.assessment.diagnosisTitle, 'Pneumonia');

    await harness.unmount();
  });

  test('handles malformed stored JSON safely without crashing and purges corrupted entry', async () => {
    const key = getDraftStorageKey('doc-bad', 'pat-bad');
    mockStorage.setItem(key, '{ malformed: true, invalid-json... ');

    const harness = renderDraftHook('doc-bad', 'pat-bad', INITIAL_TEST_SOAP);
    await harness.mount();

    const hook = harness.getHook();
    assert.strictEqual(hook.restored, false, 'Corrupted draft must not be restored');
    assert.strictEqual(hook.isDirty, false, 'State should remain clean initial state');
    assert.strictEqual(hook.draftState.subjective.chiefComplaint, '');
    assert.strictEqual(mockStorage.getItem(key), null, 'Corrupted key should be cleaned up');

    await harness.unmount();
  });

  test('purges expired drafts exceeding TTL', async () => {
    const key = getDraftStorageKey('doc-exp', 'pat-exp');
    const expiredPayload: DraftPayload<SoapTestState> = {
      version: 1,
      savedAt: Date.now() - 90000000, // > 24 hours ago
      data: {
        ...INITIAL_TEST_SOAP,
        subjective: { chiefComplaint: 'Old note from 25 hours ago' },
      },
    };
    mockStorage.setItem(key, JSON.stringify(expiredPayload));

    const harness = renderDraftHook('doc-exp', 'pat-exp', INITIAL_TEST_SOAP, { ttlMs: 86400000 });
    await harness.mount();

    const hook = harness.getHook();
    assert.strictEqual(hook.restored, false, 'Expired draft must not be restored');
    assert.strictEqual(hook.draftState.subjective.chiefComplaint, '');
    assert.strictEqual(mockStorage.getItem(key), null, 'Expired draft must be purged');

    await harness.unmount();
  });

  test('clears draft from localStorage and resets state on clearDraft() after successful submission', async () => {
    const harness = renderDraftHook('doc-sub', 'pat-sub', INITIAL_TEST_SOAP, { debounceMs: 20 });
    await harness.mount();

    // Type notes
    await act(async () => {
      harness.getHook().setDraftState((prev) => ({
        ...prev,
        assessment: { diagnosisTitle: 'Hypertension', icdCode: 'I10' },
      }));
    });

    await act(async () => {
      await sleep(30);
    });

    const key = getDraftStorageKey('doc-sub', 'pat-sub');
    assert.ok(mockStorage.getItem(key), 'Draft exists before submit');

    // Simulate successful submission flow: clearDraft() is called
    await act(async () => {
      harness.getHook().clearDraft();
    });

    assert.strictEqual(mockStorage.getItem(key), null, 'Draft wiped from localStorage');
    assert.strictEqual(harness.getHook().isDirty, false, 'isDirty reset to false');
    assert.strictEqual(harness.getHook().restored, false, 'restored reset to false');
    assert.strictEqual(
      harness.getHook().draftState.assessment.diagnosisTitle,
      '',
      'State reset to initial'
    );

    await harness.unmount();
  });

  test('preserves draft when submission fails', async () => {
    const harness = renderDraftHook('doc-fail', 'pat-fail', INITIAL_TEST_SOAP, { debounceMs: 20 });
    await harness.mount();

    await act(async () => {
      harness.getHook().setDraftState((prev) => ({
        ...prev,
        assessment: { diagnosisTitle: 'Type 2 Diabetes', icdCode: 'E11' },
      }));
    });

    await act(async () => {
      await sleep(30);
    });

    const key = getDraftStorageKey('doc-fail', 'pat-fail');

    // Simulate submission failure: an error occurs, clearDraft is NOT called
    try {
      throw new Error('500 Internal Server Error during POST /api/clinical-events');
    } catch {
      // Catch error as SoapWorkspace does
    }

    // Verify draft is fully preserved
    const hook = harness.getHook();
    assert.strictEqual(hook.isDirty, true, 'Draft remains dirty');
    assert.strictEqual(hook.draftState.assessment.diagnosisTitle, 'Type 2 Diabetes');
    assert.ok(mockStorage.getItem(key), 'Draft remains saved in localStorage');

    await harness.unmount();
  });

  test('ensures different patients or consultations do not overwrite each other', async () => {
    const harnessPatientA = renderDraftHook('doc-multi', 'patient-A', INITIAL_TEST_SOAP, {
      debounceMs: 20,
    });
    await harnessPatientA.mount();

    await act(async () => {
      harnessPatientA.getHook().setDraftState((prev) => ({
        ...prev,
        assessment: { diagnosisTitle: 'Patient A Diagnosis: Asthma', icdCode: 'J45' },
      }));
    });

    await act(async () => {
      await sleep(30);
    });

    await harnessPatientA.unmount();

    // Doctor switches to Patient B
    const harnessPatientB = renderDraftHook('doc-multi', 'patient-B', INITIAL_TEST_SOAP, {
      debounceMs: 20,
    });
    await harnessPatientB.mount();

    assert.strictEqual(
      harnessPatientB.getHook().draftState.assessment.diagnosisTitle,
      '',
      'Patient B should start with clean state'
    );

    await act(async () => {
      harnessPatientB.getHook().setDraftState((prev) => ({
        ...prev,
        assessment: { diagnosisTitle: 'Patient B Diagnosis: Gastritis', icdCode: 'K29' },
      }));
    });

    await act(async () => {
      await sleep(30);
    });

    await harnessPatientB.unmount();

    // Verify both distinct keys exist in storage with separate values
    const keyA = getDraftStorageKey('doc-multi', 'patient-A');
    const keyB = getDraftStorageKey('doc-multi', 'patient-B');

    const draftA = JSON.parse(mockStorage.getItem(keyA)!) as DraftPayload<SoapTestState>;
    const draftB = JSON.parse(mockStorage.getItem(keyB)!) as DraftPayload<SoapTestState>;

    assert.strictEqual(draftA.data.assessment.diagnosisTitle, 'Patient A Diagnosis: Asthma');
    assert.strictEqual(draftB.data.assessment.diagnosisTitle, 'Patient B Diagnosis: Gastritis');
    assert.notStrictEqual(keyA, keyB);
  });
});
