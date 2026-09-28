import { z } from 'zod';
import xss from 'xss';

// Helper to sanitize strings to prevent XSS and strip trailing spaces
const sanitizedString = z.string().trim().transform((val) => xss(val));

export const baseClinicalEventSchema = z.object({
  event_type: z.enum(['diagnosis', 'prescription', 'lab_result', 'vitals', 'ai_summary', 'lab_report', 'note']),
  trust_tier: z.enum(['patient_reported', 'ai_generated', 'doctor_confirmed', 'institution_verified']).optional(),
  content: z.record(z.string(), z.unknown()).or(sanitizedString),
}).superRefine((data, ctx) => {
  // Validate type-specific JSON content payloads
  if (data.event_type === 'vitals' && typeof data.content === 'object' && data.content !== null) {
    const content = data.content as Record<string, unknown>;
    // Check if values are numeric/string
    for (const [key, value] of Object.entries(content)) {
      if (typeof value !== 'string' && typeof value !== 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['content', key],
          message: 'Vitals values must be numeric or string',
        });
      }
    }
  } else if (data.event_type === 'prescription' && typeof data.content === 'object' && data.content !== null) {
    const content = data.content as { medications?: unknown[] };
    if (!Array.isArray(content.medications)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content', 'medications'],
        message: 'Prescriptions must have a medications array',
      });
    } else {
      content.medications.forEach((med: unknown, index: number) => {
        if (!med || typeof med !== 'object' || !('dosage' in med) || !med.dosage) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['content', 'medications', index, 'dosage'],
            message: 'Dosage is required',
          });
        }
      });
    }
  }
});

export const clinicalEventSchema = z.object({
  patient_id: z.string().uuid('Invalid patient_id UUID').optional(),
  deidentified_code: sanitizedString.optional(),
  event_type: z.enum(['diagnosis', 'prescription', 'lab_result', 'vitals', 'ai_summary', 'lab_report', 'note']).optional(),
  trust_tier: z.enum(['patient_reported', 'ai_generated', 'doctor_confirmed', 'institution_verified']).optional(),
  content: z.record(z.string(), z.unknown()).or(sanitizedString).optional(),
  events: z.array(baseClinicalEventSchema).optional(),
}).refine((data) => data.patient_id || data.deidentified_code, {
  message: "Must provide either patient_id or deidentified_code",
  path: ["patient_id"],
}).refine((data) => data.events || (data.event_type && data.content), {
  message: "Must provide events array or event_type and content",
  path: ["events"],
});

export const aiScribeSchema = z.object({
  raw_notes: z.string().trim().min(5, 'raw_notes must be at least 5 characters').max(10000, 'raw_notes must be at most 10,000 characters').transform((val) => xss(val)),
  patient_id: z.string().uuid().optional(),
});

export const ragChatSchema = z.object({
  message: z.string().trim().min(1, 'message cannot be empty').transform((val) => xss(val)),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: sanitizedString,
    })
  ).default([]),
});

export const reviewSchema = z.object({
  event_id: z.string().uuid(),
  action: z.enum(['accept', 'edit', 'reject']),
  edited_content: z.record(z.string(), z.unknown()).optional(),
}).refine((data) => !(data.action === 'edit' && !data.edited_content), {
  message: 'edited_content is required for edit action',
  path: ['edited_content'],
});

// Helper for standardizing API error responses
export function createValidationError(error: z.ZodError) {
  return {
    error: 'Validation failed',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}