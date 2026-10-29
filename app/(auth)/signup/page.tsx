'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [domain, setDomain] = useState('');
  const [verifiedId, setVerifiedId] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          domain: role !== 'patient' ? domain : undefined,
          verified_id: role !== 'patient' ? verifiedId : undefined,
          invitation_code: role === 'doctor' ? invitationCode : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      if (data.email_confirmation_required) {
        toast.success(
          'Account registered! Please check your email inbox to confirm your account before signing in.'
        );
      } else {
        toast.success('Account created successfully! Redirecting to sign in...');
      }

      router.push('/login');
    } catch (err: unknown) {
      console.error('Signup error occurred');
      const errorObj = err as { message?: string };
      toast.error(
        errorObj?.message || (typeof err === 'string' ? err : 'An error occurred during signup')
      );
      setLoading(false);
    }
  };

  const isContributor = ['doctor', 'lab', 'diagnostic_center'].includes(role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-md bg-white border border-border rounded-xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-primary text-center mb-6">MediKiosk+</h1>
        <h2 className="text-xl text-text-primary text-center mb-8">Create your account</h2>

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
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white"
            >
              <option value="patient">Patient (Public)</option>
              <option value="doctor">Doctor (Invitation Required)</option>
              <option value="lab">Laboratory (Partner)</option>
              <option value="diagnostic_center">Diagnostic Center (Partner)</option>
            </select>
          </div>

          {role === 'doctor' && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-lg p-3 space-y-2">
              <div className="text-xs text-blue-900 font-medium">
                Clinical accounts require an authorized invitation code issued by administrative governance.
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Doctor Invitation / Verification Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  placeholder="e.g. MEDNOTES-DOC-VERIFIED"
                  className="w-full px-3 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary bg-white text-sm"
                  required
                />
              </div>
            </div>
          )}

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
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {role === 'doctor' ? 'Medical License / Registration No.' : 'Verification ID / Facility License No.'}
                </label>
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
