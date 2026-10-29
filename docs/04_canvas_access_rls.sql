-- Migration: 04_canvas_access_rls.sql
-- Issue: AUTH-03 Doctor-Patient Canvas Access Control & Data Isolation

-- 1. Create the canonical Canvas Access Grant table
CREATE TABLE IF NOT EXISTS public.canvas_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL DEFAULT 'read_write' CHECK (access_level IN ('read', 'read_write', 'emergency')),
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT canvas_access_patient_doctor_unique UNIQUE (patient_id, doctor_id)
);

-- Indexes for efficient lookups by doctor and active access state
CREATE INDEX IF NOT EXISTS idx_canvas_access_doctor_active 
    ON public.canvas_access (doctor_id, patient_id) 
    WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_canvas_access_patient 
    ON public.canvas_access (patient_id);

-- 2. Enable Row-Level Security on canvas_access, patients, and clinical_events
ALTER TABLE public.canvas_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_events ENABLE ROW LEVEL SECURITY;

-- 3. canvas_access RLS Policies
-- Doctors can view their own access grants
CREATE POLICY "Doctors can view own access grants"
    ON public.canvas_access FOR SELECT
    TO authenticated
    USING (
        doctor_id IN (
            SELECT id FROM public.users 
            WHERE auth_id = auth.uid() AND role = 'doctor'
        )
    );

-- Patients can view grants issued for their canvas
CREATE POLICY "Patients can view access grants for their canvas"
    ON public.canvas_access FOR SELECT
    TO authenticated
    USING (
        patient_id IN (
            SELECT p.id FROM public.patients p
            JOIN public.users u ON u.id = p.user_id
            WHERE u.auth_id = auth.uid()
        )
    );

-- 4. patients RLS Policies (Canonical Isolation)
-- A patient can only view their own record
CREATE POLICY "Patients can view own record"
    ON public.patients FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE auth_id = auth.uid()
        )
    );

-- A doctor can only view patients where an active, non-revoked access grant exists
CREATE POLICY "Doctors can view authorized patients only"
    ON public.patients FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.canvas_access ca
            JOIN public.users u ON u.id = ca.doctor_id
            WHERE ca.patient_id = patients.id
              AND u.auth_id = auth.uid()
              AND u.role = 'doctor'
              AND ca.revoked = false
              AND (ca.revoked_at IS NULL OR ca.revoked_at > now())
        )
    );

-- 5. clinical_events RLS Policies (Canonical Canvas Protection)
-- Patients can view their own clinical canvas events
CREATE POLICY "Patients can view own clinical events"
    ON public.clinical_events FOR SELECT
    TO authenticated
    USING (
        patient_id IN (
            SELECT p.id FROM public.patients p
            JOIN public.users u ON u.id = p.user_id
            WHERE u.auth_id = auth.uid()
        )
    );

-- Doctors can only view events for patients with active, non-revoked grants
CREATE POLICY "Doctors can view events for authorized patients only"
    ON public.clinical_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.canvas_access ca
            JOIN public.users u ON u.id = ca.doctor_id
            WHERE ca.patient_id = clinical_events.patient_id
              AND u.auth_id = auth.uid()
              AND u.role = 'doctor'
              AND ca.revoked = false
              AND (ca.revoked_at IS NULL OR ca.revoked_at > now())
        )
    );

-- Contributors can view events they authored
CREATE POLICY "Contributors can view their own authored events"
    ON public.clinical_events FOR SELECT
    TO authenticated
    USING (
        contributor_id IN (
            SELECT c.id FROM public.contributors c
            JOIN public.users u ON u.id = c.user_id
            WHERE u.auth_id = auth.uid()
        )
    );
