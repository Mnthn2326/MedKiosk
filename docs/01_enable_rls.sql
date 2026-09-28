-- 1. Enable RLS on all tables
alter table users enable row level security;
alter table patients enable row level security;
alter table contributors enable row level security;
alter table clinical_events enable row level security;
alter table claims enable row level security;
alter table patient_credit enable row level security;
alter table ambulance_drivers enable row level security;
alter table dispatch_requests enable row level security;

-- 2. clinical_events Policies
-- Deny by default (no permissive policies means completely denied)

-- Allow authenticated users to read events
create policy "Allow authed users to read events" 
  on clinical_events for select 
  using (auth.role() = 'authenticated');

-- Allow specific roles to insert events
create policy "Allow specific roles to insert events" 
  on clinical_events for insert 
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from users 
      where users.auth_id = auth.uid() 
      and users.role in ('doctor', 'lab', 'diagnostic_center')
    )
  );

-- Repeat for other tables as needed for MVP...
