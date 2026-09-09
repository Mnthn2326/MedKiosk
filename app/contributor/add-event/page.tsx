import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ContributorForm } from '@/components/clinical/ContributorForm';

export default async function AddEventPage() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-danger/10 text-danger p-4 rounded-xl">
          Please log in to access this page.
        </div>
      </div>
    );
  }

  // Look up the users table row first, then find contributor
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  const { data: contributor, error: contributorError } = await supabase
    .from('contributors')
    .select('id, type')
    .eq('user_id', profile?.id)
    .single();

  if (contributorError || !contributor) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-danger/10 text-danger p-4 rounded-xl">
          Error: Contributor profile not found for the current user.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Clinical Workspace</h1>
        <p className="text-text-muted">Record a new clinical event for a patient.</p>
      </div>
      
      <ContributorForm 
        contributorId={contributor.id} 
        contributorType={contributor.type as 'doctor' | 'lab' | 'diagnostic_center'} 
      />
    </div>
  );
}
