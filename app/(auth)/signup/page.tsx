'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [domain, setDomain] = useState('');
  const [verifiedId, setVerifiedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign up with auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // 2. Insert into users table and get the row id
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .insert([
          { auth_id: userId, role, name, email }
        ])
        .select('id')
        .single();

      if (userError) throw userError;
      if (!userRow) throw new Error('Failed to create user profile');

      const profileId = userRow.id;

      // 3. Handle role-specific inserts
      if (role === 'patient') {
        const deidentifiedCode = 'MK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const { error: patientError } = await supabase
          .from('patients')
          .insert([
            { user_id: profileId, deidentified_code: deidentifiedCode }
          ]);
        if (patientError) throw patientError;
      } else {
        const { error: contributorError } = await supabase
          .from('contributors')
          .insert([
            { user_id: profileId, type: role, domain, verified_id: verifiedId }
          ]);
        if (contributorError) throw contributorError;
      }

      router.push('/login');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err?.message || (typeof err === 'string' ? err : 'An error occurred during signup'));
      setLoading(false);
    }
  };

  const isContributor = ['doctor', 'lab', 'diagnostic_center'].includes(role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-md bg-white border border-border rounded-xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-primary text-center mb-6">MediKiosk+</h1>
        <h2 className="text-xl text-text-primary text-center mb-8">Create your account</h2>
        
        {error && (
          <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="lab">Laboratory</option>
              <option value="diagnostic_center">Diagnostic Center</option>
            </select>
          </div>

          {isContributor && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white"
                  required
                >
                  <option value="">Select Domain...</option>
                  {role === 'doctor' && (
                    <>
                      <option value="allopathy">Allopathy</option>
                      <option value="ayurveda">Ayurveda</option>
                      <option value="homeopathy">Homeopathy</option>
                    </>
                  )}
                  {role === 'lab' && <option value="lab">Lab Services</option>}
                  {role === 'diagnostic_center' && <option value="diagnostic">Diagnostics</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Verification ID / License No.</label>
                <input
                  type="text"
                  value={verifiedId}
                  onChange={(e) => setVerifiedId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
