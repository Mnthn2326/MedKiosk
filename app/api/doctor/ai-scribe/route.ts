import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiScribe } from '@/lib/gemini';
import { aiScribeSchema, createValidationError } from '@/lib/validations';
import { verifyDoctorPatientAccess } from '@/lib/canvasAccess';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate the user via Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify they are a doctor by checking their role in the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'doctor') {
      return NextResponse.json({ error: 'Forbidden: Only doctors can use the AI scribe' }, { status: 403 });
    }

    // 3. Extract raw_notes from the request body
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validationResult = aiScribeSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(createValidationError(validationResult.error), { status: 400 });
    }

    const { raw_notes, patient_id } = validationResult.data;

    // 4. If patient_id is provided, verify patient existence and authorization
    if (patient_id) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('id', patient_id)
        .single();

      if (patientError || !patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      const hasAccess = await verifyDoctorPatientAccess(supabase, userData.id, patient_id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have active access to this patient record' },
          { status: 403 }
        );
      }
    }

    // 5. Call the aiScribe function safely
    let structuredResult;
    try {
      structuredResult = await aiScribe(raw_notes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown AI error';
      console.error('AI Scribe invocation error:', msg);
      return NextResponse.json(
        { error: 'AI scribe service was unable to structure notes. Please try again.' },
        { status: 502 }
      );
    }

    // 6. Return the structured result as JSON
    return NextResponse.json(structuredResult, { status: 200 });

  } catch {
    console.error('Error processing AI scribe request');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
