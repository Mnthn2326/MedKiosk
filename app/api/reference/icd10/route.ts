import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length < 3) {
      return NextResponse.json({ results: [] });
    }

    const sanitizedQ = q.trim().substring(0, 50);
    const encodedQ = encodeURIComponent(sanitizedQ);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${encodedQ}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('NLM API failed');
      }

      const data = await response.json();
      
      // data format: [total, [codes], null, [descriptions]]
      const codes = data[1] || [];
      const descriptions = data[3] || [];
      
      const results = codes.map((code: string, index: number) => ({
        code,
        description: descriptions[index] || code
      }));

      return NextResponse.json({ results }, {
        headers: {
          'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400'
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Fallback
      return NextResponse.json({ results: [], degraded: true }, {
        headers: {
          'Cache-Control': 'private, no-store'
        }
      });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
