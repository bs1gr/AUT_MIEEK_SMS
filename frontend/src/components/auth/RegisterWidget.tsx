import React, { useState } from 'react';
import apiClient from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';

const RegisterWidget: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  // Force public registrations to 'teacher' role. Admin accounts must be created
  // using the server-side `create_admin.py` tool or an internal admin-only flow.
  const role = 'teacher' as const;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        role,
      });
      setMessage('Registration successful — logging in...');
      // Auto-login after successful register
      try {
        await login(email, password);
        setMessage('Registered and logged in.');
      } catch (err) {
        setMessage('Registered. Please log in.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Registration failed';
      setMessage(String(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2 p-2">
      <div>
        <label className="block text-sm">Email</label>
        <input aria-label="email" placeholder="email@example.com" className="border rounded w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm">Password</label>
        <input type="password" aria-label="password" placeholder="••••••••" className="border rounded w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm">Full name (optional)</label>
        <input aria-label="full name" placeholder="John Doe" className="border rounded w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      {/* Role is fixed for public registration to avoid privilege escalation */}
      <div>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" disabled={busy} type="submit">
          {busy ? 'Registering...' : 'Register'}
        </button>
      </div>
      {message && <div className="text-sm mt-2">{message}</div>}
    </form>
  );
};

export default RegisterWidget;
