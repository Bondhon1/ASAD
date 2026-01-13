"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) setError('Missing token');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setSuccess('Password updated. Redirecting to sign in...');
      setTimeout(() => router.push('/auth'), 1500);
    } catch (err: any) {
      setError(err?.message || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {success && <div className="text-sm text-green-700 mb-2">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm">New password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm">Confirm password</label>
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <button disabled={loading} className="w-full px-4 py-2 bg-[#1E3A5F] text-white rounded">{loading ? 'Saving...' : 'Save password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
