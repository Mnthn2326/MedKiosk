-- pgvector similarity search function for RAG retrieval
-- Run this in your Supabase SQL Editor after creating the schema

create or replace function match_clinical_events(
  query_embedding vector(768),
  match_patient_id uuid,
  match_count int default 20
)
returns table (
  id uuid,
  patient_id uuid,
  contributor_id uuid,
  event_type text,
  trust_tier text,
  content jsonb,
  created_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ce.id,
    ce.patient_id,
    ce.contributor_id,
    ce.event_type,
    ce.trust_tier,
    ce.content,
    ce.created_at,
    1 - (ce.embedding <=> query_embedding) as similarity
  from clinical_events ce
  where ce.patient_id = match_patient_id
    and ce.event_type != 'ai_summary'
    and ce.embedding is not null
  order by ce.embedding <=> query_embedding
  limit match_count;
end;
$$;
