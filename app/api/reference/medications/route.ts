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
      const response = await fetch(`https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodedQ}&maxEntries=10`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('RxNav API failed');
      }

      const data = await response.json();
      
      const candidates = data.approximateGroup?.candidate || [];
      
      // Deduplicate by name and filter
      const uniqueNames = new Set<string>();
      const results: Array<{ name: string; rxcui: string }> = [];
      
      for (const candidate of candidates) {
        const lowerName = (candidate.name || '').toLowerCase();
        if (!uniqueNames.has(lowerName)) {
          uniqueNames.add(lowerName);
          results.push({
            name: candidate.name,
            rxcui: candidate.rxcui
          });
        }
      }

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
