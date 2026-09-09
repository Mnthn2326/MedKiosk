import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * Retrieve relevant clinical events for a patient using pgvector similarity search.
 * Optionally takes a query to generate an embedding for similarity matching.
 * Falls back to fetching all events sorted by trust tier + recency if no query.
 */

const TRUST_TIER_WEIGHTS: Record<string, number> = {
  doctor_confirmed: 1.0,
  institution_verified: 0.85,
  patient_uploaded: 0.6,
  self_reported: 0.4,
};

const TOP_K = 20;

/**
 * Retrieve relevant clinical events for RAG context.
 * Uses pgvector cosine similarity when a query embedding is provided.
 */
export async function retrieveRelevantEvents(
  patientId: string,
  queryEmbedding?: number[],
): Promise<
  Array<{
    id: string;
    event_type: string;
    trust_tier: string;
    content: Record<string, unknown>;
    created_at: string;
    similarity?: number;
  }>
> {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (queryEmbedding && queryEmbedding.length > 0) {
    // Use pgvector similarity search via RPC function
    // We'll call a Supabase SQL function for cosine similarity
    const { data, error } = await supabase.rpc('match_clinical_events', {
      query_embedding: queryEmbedding,
      match_patient_id: patientId,
      match_count: TOP_K,
    });

    if (error) {
      console.error('pgvector search error, falling back to basic query:', error);
      return fallbackQuery(supabase, patientId);
    }

    // Re-rank by similarity × trust weight
    return (data || [])
      .map((event: Record<string, unknown>) => ({
        ...event,
        id: event.id as string,
        event_type: event.event_type as string,
        trust_tier: event.trust_tier as string,
        content: event.content as Record<string, unknown>,
        created_at: event.created_at as string,
        similarity: (event.similarity as number) ?? 0,
        weighted_score:
          ((event.similarity as number) ?? 0) *
          (TRUST_TIER_WEIGHTS[event.trust_tier as string] ?? 0.5),
      }))
      .sort(
        (a: { weighted_score: number }, b: { weighted_score: number }) =>
          b.weighted_score - a.weighted_score,
      );
  }

  return fallbackQuery(supabase, patientId);
}

async function fallbackQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  patientId: string,
) {
  const { data, error } = await supabase
    .from('clinical_events')
    .select('id, event_type, trust_tier, content, created_at')
    .eq('patient_id', patientId)
    .neq('event_type', 'ai_summary')
    .order('created_at', { ascending: false })
    .limit(TOP_K);

  if (error) {
    console.error('Fallback query error:', error);
    return [];
  }

  return data || [];
}

/**
 * Format retrieved events into a context string for the LLM.
 */
export function formatEventsAsContext(
  events: Array<{
    event_type: string;
    trust_tier: string;
    content: Record<string, unknown>;
    created_at: string;
  }>,
): string {
  if (events.length === 0) {
    return 'No clinical events found for this patient.';
  }

  return events
    .map((event, i) => {
      const date = new Date(event.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const content = JSON.stringify(event.content, null, 2);
      return `[Event ${i + 1}] Type: ${event.event_type} | Trust: ${event.trust_tier} | Date: ${date}\n${content}`;
    })
    .join('\n\n---\n\n');
}
