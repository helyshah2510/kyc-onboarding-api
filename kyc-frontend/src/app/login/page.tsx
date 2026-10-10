'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import{saveToken,getRole} from '@/src/lib/auth';

type Mode = 'password' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');

  //password login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  //otp login
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setOtp('');
    setOtpSent(false);
  }

  //shared the key card and go to the right room

  function finishLogin(token: string) {
    saveToken(token);
    router.push(getRole() === 'ADMIN' ? '/admin' : '/dashboard');
  }

  async function run(action: () => Promise<void>) {
    setError('');
    setLoading(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function HandlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const data = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      finishLogin(data.accessToken);
    });
  }

  async function HandleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      await api<{ accessToken: string }>('/auth/login/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setOtpSent(true);
    });
  }

  async function HandleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const data = await api<{ accessToken: string }>('/auth/login/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });
      finishLogin(data.accessToken);
    });
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900';
  const buttonClass =
    'w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50';
  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium border-b-2 ${active
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Login</h1>
        <div className="flex">
          <button type="button" onClick={() => switchMode('password')} className={tabClass(mode === 'password')}>
            Password
          </button>
          <button type="button" onClick={() => switchMode('otp')} className={tabClass(mode === 'otp')}>
            OTP
          </button>
        </div>
        {mode === 'password' && (
          <form onSubmit={HandlePasswordLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'logging in ...' : 'Login'}
            </button>
          </form>
        )}

        {mode === 'otp' && !otpSent && (
          <form onSubmit={HandleRequestOtp} className="space-y-4">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="Registered phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              required
              className={inputClass}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {mode === 'otp' && otpSent && (
          <form onSubmit={HandleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the 6-digit OTP for {phone}.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              className={inputClass}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Verifying...' : 'Verify and login'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('otp')}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Change phone number
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-600">
          New here?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>

      </div>
    </main>
  );
}