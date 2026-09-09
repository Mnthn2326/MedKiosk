import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiScribe } from '@/lib/gemini';

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
    const body = await req.json();
    const { raw_notes } = body;

    if (!raw_notes || typeof raw_notes !== 'string') {
      return NextResponse.json({ error: 'Invalid request: raw_notes must be a non-empty string' }, { status: 400 });
    }

    // 4. Call the aiScribe function
    const structuredResult = await aiScribe(raw_notes);

    // 5. Return the structured result as JSON
    return NextResponse.json(structuredResult, { status: 200 });

  } catch (error) {
    console.error('Error processing AI scribe request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
