import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiScribe } from '@/lib/gemini';
import { aiScribeSchema, createValidationError } from '@/lib/validations';

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
      .select('role')
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

    const { raw_notes } = validationResult.data;

    // 4. Call the aiScribe function
    const structuredResult = await aiScribe(raw_notes);

    // 5. Return the structured result as JSON
    return NextResponse.json(structuredResult, { status: 200 });

  } catch (error) {
    console.error('Error processing AI scribe request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
