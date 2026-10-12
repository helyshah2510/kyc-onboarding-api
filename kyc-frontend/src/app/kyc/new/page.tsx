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
type CreateFailure = { success: false; message: string };

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
      const result = await api<CreatedApplication | CreateFailure>(
        '/applications',
        {
          method: 'POST',
          body: JSON.stringify({ pan, holderType }),
        },
      );
      if (!('id' in result)) {
        throw new Error(result.message ?? 'Could not start your application');
      }
      router.push(`/kyc/${result.id}`);
    });
  }

  function changePan() {
    setDetails(null);
    setError('');
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900';
  const buttonClass =
    'w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50';

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Start your KYC</h1>

        {!details && (
          <form onSubmit={handleCheck} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your PAN. We will fetch your details so you can check them.
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
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              We found these details for {pan}. Is this you?
            </p>

            <dl className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900">{details.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Holder type</dt>
                <dd className="font-medium capitalize text-gray-900">
                  {details.holder}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900">{details.phone}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-gray-900">{details.address}</dd>
              </div>
            </dl>

            {error && <p className="text-sm text-red-600">{error}</p>}

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
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Use a different PAN
            </button>
          </div>
        )}

        <Link
          href="/dashboard"
          className="block text-center text-sm text-gray-500 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}