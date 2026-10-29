create table users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users unique,
  role text check (role in ('patient','doctor','lab','diagnostic_center','driver','admin')),
  name text, email text, created_at timestamptz default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) unique,
  dob date, gender text, deidentified_code text unique
);

create table contributors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) unique,
  type text check (type in ('doctor','lab','diagnostic_center')),
  domain text check (domain in ('allopathy','ayurveda','homeopathy','lab','diagnostic')),
  verified_id text
);

create table doctor_invitations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  invited_email text,
  used boolean not null default false,
  used_by uuid references users(id),
  created_at timestamptz default now(),
  expires_at timestamptz
);

create extension if not exists vector;

create table clinical_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  contributor_id uuid references contributors(id),
  event_type text check (event_type in ('diagnosis','prescription','lab_report','note','ai_summary')),
  trust_tier text check (trust_tier in ('self_reported','patient_uploaded','institution_verified','doctor_confirmed')),
  content jsonb,
  embedding vector(768),
  created_at timestamptz default now()
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  hospital_bill_amount numeric,
  insurer_name text,
  status text check (status in ('submitted','under_review','approved','rejected')),
  created_at timestamptz default now()
);

create table patient_credit (
  patient_id uuid primary key references patients(id),
  credit_limit numeric default 5000,
  used_amount numeric default 0
);

create table ambulance_drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  vehicle_no text,
  current_lat float8, current_lng float8,
  status text check (status in ('available','busy')) default 'available'
);

create table dispatch_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  driver_id uuid references ambulance_drivers(id),
  patient_lat float8, patient_lng float8,
  status text check (status in ('requested','accepted','enroute','arrived')),
  created_at timestamptz default now()
);

-- Grant privileges to anon, authenticated, and service_role
create table conversations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  title text default 'Health Records Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  role text not null check (role in ('user', 'model', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create table canvas_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references users(id) on delete cascade,
  access_level text not null default 'read_write' check (access_level in ('read', 'read_write', 'emergency')),
  revoked boolean not null default false,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint canvas_access_patient_doctor_unique unique (patient_id, doctor_id)
);

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Ensure tables are accessible during MVP development
alter table users disable row level security;
alter table patients disable row level security;
alter table contributors disable row level security;
alter table clinical_events disable row level security;
alter table claims disable row level security;
alter table patient_credit disable row level security;
alter table ambulance_drivers disable row level security;
alter table dispatch_requests disable row level security;
