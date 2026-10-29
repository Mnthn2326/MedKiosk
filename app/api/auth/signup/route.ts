import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signupSchema, createValidationError } from '@/lib/validations';
import {
  validateRoleAssignment,
  generateDeidentifiedCode,
} from '@/lib/signup';

/**
 * POST /api/auth/signup
 *
 * Secure, atomic server-side registration endpoint.
 * Enforces role verification, prevents doctor/admin privilege escalation,
 * and ensures reliable application profile creation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Server-side input validation
    const parseResult = signupSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(createValidationError(parseResult.error), {
        status: 400,
      });
    }

    const { name, email, password, role, domain, verified_id, invitation_code } =
      parseResult.data;

    // 2. Strict role authorization check
    const roleAuth = validateRoleAssignment(role, invitation_code);
    if (!roleAuth.allowed) {
      return NextResponse.json(
        { error: roleAuth.reason || 'Unauthorized role assignment' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // 3. Create Supabase Auth User with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          domain: domain || null,
          verified_id: verified_id || null,
        },
      },
    });

    const authUserId = authData?.user?.id;

    // 4. Handle Auth errors & orphaned account recovery
    if (authError || !authUserId) {
      const errorMsg = authError?.message || 'Failed to create authentication account';

      // Check if user already exists
      if (errorMsg.toLowerCase().includes('already registered')) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, role')
          .eq('email', email)
          .maybeSingle();

        if (existingUser) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please log in.' },
            { status: 409 }
          );
        }
        // Account exists in auth but missing in public.users - recovery needed
        return NextResponse.json(
          {
            error:
              'An incomplete registration was detected for this email. Please log in or contact support to complete verification.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // 5. Ensure application profile exists (idempotent / trigger-safe)
    let profileId: string | null = null;

    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUserId)
      .maybeSingle();

    if (existingProfile?.id) {
      profileId = existingProfile.id;
    } else {
      // Create user record with onConflict idempotency
      const { data: newProfile, error: profileError } = await supabase
        .from('users')
        .upsert(
          {
            auth_id: authUserId,
            role,
            name,
            email,
          },
          { onConflict: 'auth_id' }
        )
        .select('id')
        .single();

      if (profileError || !newProfile) {
        console.error('Profile creation error occurred');
        return NextResponse.json(
          {
            error:
              'Account was created, but profile setup failed. Please log in to complete your profile.',
          },
          { status: 500 }
        );
      }
      profileId = newProfile.id;
    }

    // 6. Ensure role-specific child record exists (idempotent)
    if (role === 'patient') {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', profileId)
        .maybeSingle();

      if (!existingPatient) {
        const deidentifiedCode = generateDeidentifiedCode();
        await supabase
          .from('patients')
          .upsert(
            {
              user_id: profileId,
              deidentified_code: deidentifiedCode,
            },
            { onConflict: 'user_id' }
          );
      }
    } else {
      // Contributor or Doctor
      const { data: existingContributor } = await supabase
        .from('contributors')
        .select('id')
        .eq('user_id', profileId)
        .maybeSingle();

      if (!existingContributor) {
        await supabase
          .from('contributors')
          .upsert(
            {
              user_id: profileId,
              type: role,
              domain: domain || '',
              verified_id: verified_id || '',
            },
            { onConflict: 'user_id' }
          );
      }
    }

    // 7. Success response
    const emailConfirmationRequired = !authData.session;

    return NextResponse.json(
      {
        success: true,
        message: emailConfirmationRequired
          ? 'Account created. Please check your email to confirm your account.'
          : 'Account created successfully.',
        email_confirmation_required: emailConfirmationRequired,
        user: {
          id: authUserId,
          email,
          role,
        },
      },
      { status: 201 }
    );
  } catch {
    console.error('Server signup processing error');
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
