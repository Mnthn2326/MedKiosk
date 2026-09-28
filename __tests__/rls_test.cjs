const fs = require('fs');

async function testRLS() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
  const anonKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();

  console.log('Testing direct PostgREST insert with anon key...');
  
  const res = await fetch(`${supabaseUrl}/rest/v1/clinical_events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      patient_id: '00000000-0000-0000-0000-000000000000',
      event_type: 'note',
      trust_tier: 'self_reported',
      content: { test: 'Direct insert attempt' }
    })
  });

  const text = await res.text();
  console.log(`Response Status: ${res.status}`);
  console.log(`Response Body: ${text}`);

  if (res.status === 401 || res.status === 403 || (res.status === 201 && text.includes('new row violates row-level security policy'))) {
    console.log('✅ PASS: RLS successfully denied the anonymous insert.');
  } else {
    console.error('❌ FAIL: The insert was not denied by RLS! (Did you run docs/01_enable_rls.sql?)');
  }
}

testRLS();
