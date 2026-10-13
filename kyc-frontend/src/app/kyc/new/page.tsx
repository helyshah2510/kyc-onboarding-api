'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import { getRole } from '@/src/lib/auth';

const HOLDER_TYPES = ['individual', 'company', 'huf', 'firm', 'trust'];

type PanDetails = {
  valid: boolean;
  verified: boolean;
  holder: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  reason: string | null;
};

type CreatedApplication = { id: number };

export default function NewKycPage() {
  const router = useRouter();

  const [pan, setPan] = useState('');
  const [holderType, setHolderType] = useState('individual');
  const [details, setDetails] = useState<PanDetails | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = getRole();
    if (!role) router.replace('/login');
    else if (role === 'ADMIN') router.replace('/admin');
  }, [router]);

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

  function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const result = await api<PanDetails>('/pan/validate', {
        method: 'POST',
        body: JSON.stringify({ pan, holderType }),
      });
      if (!result.verified) {
        throw new Error(result.reason ?? 'This PAN could not be verified');
      }
      setDetails(result);
    });
  }

  function handleStart() {
    run(async () => {
      const result = await api<CreatedApplication>('/applications', {
        method: 'POST',
        body: JSON.stringify({ pan, holderType }),
      });
      router.push(`/kyc/${result.id}`);
    });
  }

  function changePan() {
    setDetails(null);
    setError('');
  }


  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10';

  const buttonClass =
    'w-full rounded-xl bg-teal-800 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold text-teal-800">
            IDENTITY VERIFICATION
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Start your KYC
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Verify your PAN to begin your identity verification application.
          </p>
        </div>

        {!details && (
          <form onSubmit={handleCheck} className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              Enter your PAN and holder type. We’ll retrieve the available details for you to review before continuing.
            </p>

            <input
              type="text"
              maxLength={10}
              minLength={10}
              placeholder="PAN, e.g. ABCPE1234F"
              value={pan}
              onChange={(e) =>
                setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              required
              className={inputClass}
            />

            <select
              value={holderType}
              onChange={(e) => setHolderType(e.target.value)}
              className={`${inputClass} capitalize`}
            >
              {HOLDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Checking...' : 'Fetch details'}
            </button>
          </form>
        )}

        {details && (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              We found these details for <span className="font-semibold text-slate-900">{pan}</span>. Please review them before continuing.
            </p>

            <dl className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:p-5">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
                <dd className="mt-1 font-medium capitalize text-slate-900">{details.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Holder type</dt>
                <dd className="mt-1 font-medium capitalize text-slate-900">
                  {details.holder}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
                <dd className="mt-1 font-medium capitalize text-slate-900">{details.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</dt>
                <dd className="mt-1 font-medium capitalize text-slate-900">{details.address}</dd>
              </div>
            </dl>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className={buttonClass}
            >
              {loading ? 'Starting...' : 'Yes, start my KYC'}
            </button>
            <button
              type="button"
              onClick={changePan}
              className="w-full rounded-lg py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-50 hover:underline"
            >
              Use a different PAN
            </button>
          </div>
        )}

        <Link
          href="/dashboard"
          className="block text-center text-sm text-slate-500 transition hover:text-teal-800 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}