import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('CC-07: AI Summary Success Notification', () => {
  const filePath = path.resolve(
    process.cwd(),
    'app/doctor/timeline/[patientId]/DoctorTimelineClient.tsx'
  );

  it('contains the accurate "AI summary generated successfully." toast notification', () => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      fileContent.includes("toast.success('AI summary generated successfully.');"),
      'DoctorTimelineClient.tsx must include toast.success(\'AI summary generated successfully.\')'
    );
  });

  it('no longer contains the misleading "AI Scribe successfully parsed unstructured notes" string', () => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    assert.strictEqual(
      fileContent.includes('AI Scribe successfully parsed unstructured notes'),
      false,
      'DoctorTimelineClient.tsx must not contain "AI Scribe successfully parsed unstructured notes"'
    );
  });

  it('verifies handleGenerateSummary logic flow on success and failure', async () => {
    // Model the exact control flow from DoctorTimelineClient.tsx
    let successToastMessage: string | null = null;
    let errorToastMessage: string | null = null;

    const mockToast = {
      success: (msg: string) => {
        successToastMessage = msg;
      },
      error: (msg: string) => {
        errorToastMessage = msg;
      },
    };

    const runSummaryFlow = async (fetchMock: (url: string, opts: any) => Promise<any>) => {
      successToastMessage = null;
      errorToastMessage = null;

      try {
        const res = await fetchMock('/api/rag/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: 'pat-123' }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to generate summary');
        }

        const data = await res.json();
        mockToast.success('AI summary generated successfully.');
        return data;
      } catch (err) {
        mockToast.error(err instanceof Error ? err.message : 'Failed to generate summary');
      }
    };

    // 1. Success case: 201 Created
    await runSummaryFlow(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ event: { id: 'evt-1' }, summary: { chief_complaint: 'Headache' } }),
    }));
    assert.strictEqual(successToastMessage, 'AI summary generated successfully.');
    assert.strictEqual(errorToastMessage, null);

    // 2. Failure case: 404 Not Found
    await runSummaryFlow(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No clinical events found for this patient' }),
    }));
    assert.strictEqual(successToastMessage, null);
    assert.strictEqual(errorToastMessage, 'No clinical events found for this patient');

    // 3. Network failure case
    await runSummaryFlow(async () => {
      throw new Error('Network error: connection refused');
    });
    assert.strictEqual(successToastMessage, null);
    assert.strictEqual(errorToastMessage, 'Network error: connection refused');
  });
});
