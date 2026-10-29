import { z } from 'zod';
import xss from 'xss';
import {
  MIN_PASSWORD_LENGTH,
  passwordSchema,
  resetPasswordSchema,
  validatePasswordReset,
  type ResetPasswordInput,
  type PasswordResetValidationResult,
} from '../passwordReset.ts';

export {
  MIN_PASSWORD_LENGTH,
  passwordSchema,
  resetPasswordSchema,
  validatePasswordReset,
  type ResetPasswordInput,
  type PasswordResetValidationResult,
};

// Helper to sanitize strings to prevent XSS and strip trailing spaces
const sanitizedString = z.string().trim().transform((val) => xss(val));

/**
 * Normalizes prescription content to the canonical `{ medications: [...] }` structure.
 * Supports legacy single-medication formats (`medication`, `dosage`, etc.) at the boundary.
 */
export function normalizePrescriptionContent(content: unknown): unknown {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return content;
  }
  const obj = content as Record<string, unknown>;
  if (Array.isArray(obj.medications)) {
    return obj;
  }

  // Check if legacy single-medication structure is present
  const medName =
    (typeof obj.medication === 'string' && obj.medication.trim()) ||
    (typeof obj.name === 'string' && obj.name.trim());
  const dosage =
    typeof obj.dosage === 'string'
      ? obj.dosage.trim()
      : obj.dosage != null
        ? String(obj.dosage).trim()
        : '';

  if (medName || dosage) {
    return {
      ...obj,
      medications: [
        {
          medication: medName || '',
          name: medName || '',
          dosage,
          frequency: typeof obj.frequency === 'string' ? obj.frequency.trim() : '',
          duration: typeof obj.duration === 'string' ? obj.duration.trim() : '',
          notes:
            typeof obj.notes === 'string'
              ? obj.notes.trim()
              : typeof obj.instructions === 'string'
                ? obj.instructions.trim()
                : '',
          instructions:
            typeof obj.instructions === 'string'
              ? obj.instructions.trim()
              : typeof obj.notes === 'string'
                ? obj.notes.trim()
                : '',
        },
      ],
    };
  }

  return content;
}

/**
 * Validates clinical event content according to event_type requirements.
 */
export function refineClinicalEvent(
  data: { event_type?: string; content?: unknown },
  ctx: z.RefinementCtx
) {
  if (data.event_type === 'vitals' && typeof data.content === 'object' && data.content !== null) {
    const content = data.content as Record<string, unknown>;
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
    } else if (content.medications.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content', 'medications'],
        message: 'Prescriptions must have at least one medication',
      });
    } else {
      content.medications.forEach((med: unknown, index: number) => {
        if (!med || typeof med !== 'object') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['content', 'medications', index],
            message: 'Medication entry must be an object',
          });
          return;
        }

        const medObj = med as Record<string, unknown>;
        const medName =
          (typeof medObj.name === 'string' && medObj.name.trim()) ||
          (typeof medObj.medication === 'string' && medObj.medication.trim());

        if (!medName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['content', 'medications', index, 'medication'],
            message: 'Medication name is required',
          });
        }

        const dosage =
          typeof medObj.dosage === 'string'
            ? medObj.dosage.trim()
            : medObj.dosage != null
              ? String(medObj.dosage).trim()
              : '';

        if (!dosage) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['content', 'medications', index, 'dosage'],
            message: 'Dosage is required',
          });
        }
      });
    }
  }
}

export const baseClinicalEventSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object') {
      const obj = { ...(val as Record<string, unknown>) };
      if (obj.event_type === 'prescription' && obj.content && typeof obj.content === 'object') {
        obj.content = normalizePrescriptionContent(obj.content);
      }
      return obj;
    }
    return val;
  },
  z
    .object({
      event_type: z.enum([
        'diagnosis',
        'prescription',
        'lab_result',
        'vitals',
        'ai_summary',
        'lab_report',
        'note',
      ]),
      trust_tier: z
        .enum(['patient_reported', 'ai_generated', 'doctor_confirmed', 'institution_verified'])
        .optional(),
      content: z.record(z.string(), z.unknown()).or(sanitizedString),
    })
    .superRefine((data, ctx) => {
      refineClinicalEvent(data, ctx);
    })
);

export const clinicalEventSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object') {
      const obj = { ...(val as Record<string, unknown>) };
      if (obj.event_type === 'prescription' && obj.content && typeof obj.content === 'object') {
        obj.content = normalizePrescriptionContent(obj.content);
      }
      return obj;
    }
    return val;
  },
  z
    .object({
      patient_id: z.string().uuid('Invalid patient_id UUID').optional(),
      deidentified_code: sanitizedString.optional(),
      event_type: z
        .enum([
          'diagnosis',
          'prescription',
          'lab_result',
          'vitals',
          'ai_summary',
          'lab_report',
          'note',
        ])
        .optional(),
      trust_tier: z
        .enum(['patient_reported', 'ai_generated', 'doctor_confirmed', 'institution_verified'])
        .optional(),
      content: z.record(z.string(), z.unknown()).or(sanitizedString).optional(),
      events: z.array(baseClinicalEventSchema).optional(),
    })
    .refine((data) => data.patient_id || data.deidentified_code, {
      message: 'Must provide either patient_id or deidentified_code',
      path: ['patient_id'],
    })
    .refine((data) => data.events || (data.event_type && data.content), {
      message: 'Must provide events array or event_type and content',
      path: ['events'],
    })
    .superRefine((data, ctx) => {
      if (data.event_type && data.content) {
        refineClinicalEvent({ event_type: data.event_type, content: data.content }, ctx);
      }
    })
);

export const aiScribeSchema = z.object({
  raw_notes: z
    .string()
    .trim()
    .min(5, 'raw_notes must be at least 5 characters')
    .max(10000, 'raw_notes must be at most 10,000 characters')
    .transform((val) => xss(val)),
  patient_id: z.string().uuid().optional(),
});

export const ragChatSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z
    .string()
    .trim()
    .min(1, 'message cannot be empty')
    .transform((val) => xss(val)),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: sanitizedString,
      })
    )
    .default([]),
});

export const reviewSchema = z
  .object({
    event_id: z.string().uuid(),
    action: z.enum(['accept', 'edit', 'reject']),
    edited_content: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => !(data.action === 'edit' && !data.edited_content), {
    message: 'edited_content is required for edit action',
    path: ['edited_content'],
  });

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters')
      .transform((val) => xss(val)),
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
    password: passwordSchema,
    role: z.enum(['patient', 'doctor', 'lab', 'diagnostic_center', 'admin'], {
      message: 'Invalid role selection',
    }),
    domain: z.string().trim().optional(),
    verified_id: z.string().trim().optional(),
    invitation_code: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'admin') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Administrative roles cannot be self-assigned',
        path: ['role'],
      });
      return;
    }

    if (data.role === 'doctor') {
      if (!data.invitation_code || data.invitation_code.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Doctor registration requires a verified invitation code',
          path: ['invitation_code'],
        });
      }
      if (!data.domain || !data.domain.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Clinical domain is required for doctor registration',
          path: ['domain'],
        });
      }
      if (!data.verified_id || !data.verified_id.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Medical license / verification ID is required for doctor registration',
          path: ['verified_id'],
        });
      }
    }

    if (data.role === 'lab' || data.role === 'diagnostic_center') {
      if (!data.domain || !data.domain.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Domain is required for contributor registration',
          path: ['domain'],
        });
      }
      if (!data.verified_id || !data.verified_id.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Facility license / verification ID is required',
          path: ['verified_id'],
        });
      }
    }
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
