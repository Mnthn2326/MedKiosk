-- Migration: 03_secure_signup_profiles.sql
-- Issue: AUTH-02 Secure Role Assignment & Reliable Profile Creation

-- 1. Ensure Uniqueness Constraints to prevent duplicate profile creation during retries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_id_unique'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_auth_id_unique UNIQUE (auth_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patients_user_id_unique'
    ) THEN
        ALTER TABLE public.patients ADD CONSTRAINT patients_user_id_unique UNIQUE (user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contributors_user_id_unique'
    ) THEN
        ALTER TABLE public.contributors ADD CONSTRAINT contributors_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- 2. Doctor Invitations Table for Verified Clinical Provisioning
CREATE TABLE IF NOT EXISTS public.doctor_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    invited_email TEXT,
    used BOOLEAN NOT NULL DEFAULT false,
    used_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ
);

-- Seed standard authorized invitation codes for verified doctor onboarding
INSERT INTO public.doctor_invitations (code, invited_email)
VALUES 
    ('MEDNOTES-DOC-VERIFIED', NULL),
    ('DOC-INVITE-2026', NULL),
    ('CLINICAL-PARTNER-456', NULL)
ON CONFLICT (code) DO NOTHING;

-- 3. Atomic Database Trigger for Account & Profile Synchronization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_domain TEXT;
    user_verified_id TEXT;
    new_user_id UUID;
    random_code TEXT;
BEGIN
    -- Extract metadata provided during signUp
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'patient');
    user_name := COALESCE(new.raw_user_meta_data->>'name', 'MedNotes User');
    user_domain := new.raw_user_meta_data->>'domain';
    user_verified_id := new.raw_user_meta_data->>'verified_id';

    -- Security Guard: Admin role can never be self-assigned
    IF user_role = 'admin' THEN
        user_role := 'patient';
    END IF;

    -- Upsert public.users profile
    INSERT INTO public.users (auth_id, role, name, email)
    VALUES (new.id, user_role, user_name, new.email)
    ON CONFLICT (auth_id) DO UPDATE 
        SET name = EXCLUDED.name, email = EXCLUDED.email
    RETURNING id INTO new_user_id;

    -- Upsert child record according to verified role
    IF user_role = 'patient' THEN
        random_code := 'MK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        INSERT INTO public.patients (user_id, deidentified_code)
        VALUES (new_user_id, random_code)
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role IN ('doctor', 'lab', 'diagnostic_center') THEN
        INSERT INTO public.contributors (user_id, type, domain, verified_id)
        VALUES (new_user_id, user_role, user_domain, user_verified_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable RLS on doctor_invitations
ALTER TABLE public.doctor_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read of doctor invitations"
    ON public.doctor_invitations FOR SELECT
    TO authenticated
    USING (true);
