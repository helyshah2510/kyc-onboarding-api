'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import { getRole, logout } from '@/src/lib/auth';

type Status = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';

type AdminApplication = {
  id: number;
  name: string;
  pan: string;
  status: Status;
  createdAt: string;
  user: { id: number; name: string; email: string };
};

const FILTERS = ['ALL', 'DRAFT', 'VERIFIED', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
type Filter = (typeof FILTERS)[number];

const badgeColor: Record<Status, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  VERIFIED: 'bg-blue-100 text-blue-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function AdminPage() {
  const router = useRouter();

  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace('/login');
      return;
    }
    if (role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
    api<AdminApplication[]>(`/admin/applications${query}`)
      .then((list) => {
        if (!cancelled) setApplications(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // If the filter changes before the answer arrives, ignore the old answer
    return () => {
      cancelled = true;
    };
  }, [statusFilter, router]);

  async function handleDelete(app: AdminApplication) {
    const sure = window.confirm(
      `Delete application #${app.id} (${app.name}, ${app.pan})?\n\n` +
        'This also deletes the Aadhaar image. It cannot be undone. ' +
        'The user account stays.',
    );
    if (!sure) return;

    setError('');
    setDeletingId(app.id);
    try {
      await api(`/admin/applications/${app.id}`, { method: 'DELETE' });
      setApplications((current) => current.filter((a) => a.id !== app.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const term = search.trim().toLowerCase();
  const visible = applications.filter(
    (a) =>
      !term ||
      a.name.toLowerCase().includes(term) ||
      a.pan.toLowerCase().includes(term) ||
      a.user.email.toLowerCase().includes(term),
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">KYC applications</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-600 hover:underline"
          >
            Logout
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Filter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === 'ALL' ? 'All statuses' : f}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by name, PAN or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 sm:max-w-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-gray-600 shadow">
            No applications found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">PAN</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((app) => (
                  <tr key={app.id} className="border-b last:border-0 text-gray-900">
                    <td className="px-4 py-3">{app.id}</td>
                    <td className="px-4 py-3">{app.name}</td>
                    <td className="px-4 py-3">{app.pan}</td>
                    <td className="px-4 py-3">
                      <div>{app.user.name}</div>
                      <div className="text-xs text-gray-500">{app.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColor[app.status]}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(app.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(app)}
                          disabled={deletingId === app.id}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === app.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}