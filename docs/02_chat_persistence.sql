-- =============================================================================
-- Migration: 02_chat_persistence.sql
-- Description: Persistent conversation and chat messages schema with RLS
-- Product: MedNotes v1.0
-- =============================================================================

-- 1. Create conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  title text default 'Health Records Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Create chat_messages table
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  role text not null check (role in ('user', 'model', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- 3. Indexes for fast lookup and chronological sorting
create index if not exists idx_conversations_patient_id on conversations(patient_id);
create index if not exists idx_chat_messages_conversation_id_created on chat_messages(conversation_id, created_at asc);
create index if not exists idx_chat_messages_patient_id on chat_messages(patient_id);

-- 4. Enable Row Level Security
alter table conversations enable row level security;
alter table chat_messages enable row level security;

-- 5. Row Level Security Policies for conversations

-- Patients can select only their own conversations
create policy "Patients can select own conversations"
  on conversations for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from patients p
      join users u on u.id = p.user_id
      where p.id = conversations.patient_id
      and u.auth_id = auth.uid()
    )
  );

-- Patients can insert their own conversations
create policy "Patients can insert own conversations"
  on conversations for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from patients p
      join users u on u.id = p.user_id
      where p.id = conversations.patient_id
      and u.auth_id = auth.uid()
    )
  );

-- Patients can update their own conversations
create policy "Patients can update own conversations"
  on conversations for update
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from patients p
      join users u on u.id = p.user_id
      where p.id = conversations.patient_id
      and u.auth_id = auth.uid()
    )
  );

-- 6. Row Level Security Policies for chat_messages

-- Patients can select only their own chat messages
create policy "Patients can select own chat messages"
  on chat_messages for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from patients p
      join users u on u.id = p.user_id
      where p.id = chat_messages.patient_id
      and u.auth_id = auth.uid()
    )
  );

-- Patients can insert their own chat messages
create policy "Patients can insert own chat messages"
  on chat_messages for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from patients p
      join users u on u.id = p.user_id
      where p.id = chat_messages.patient_id
      and u.auth_id = auth.uid()
    )
  );
