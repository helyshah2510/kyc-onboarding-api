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
  DRAFT: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  VERIFIED: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
  SUBMITTED: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
  APPROVED: 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200',
  REJECTED: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
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

    <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-800">
              ADMINISTRATION
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              KYC applications
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review applications, track verification status, and manage applicant records.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
          >
            Logout
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Filter)}
            className="w-full rounded-xl border border-slate-300 bg-white whitespace-nowrap px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 sm:w-auto"
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
            className="w-full rounded-xl border border-slate-300 bg-white whitespace-nowrap px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 sm:max-w-sm"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading applications...</p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="font-semibold text-slate-900">No applications found</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Try a different status filter or search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-4">ID</th>
                  <th className="whitespace-nowrap px-4 py-4">Name</th>
                  <th className="whitespace-nowrap px-4 py-4">PAN</th>
                  <th className="whitespace-nowrap px-4 py-4">Owner</th>
                  <th className="whitespace-nowrap px-4 py-4">Status</th>
                  <th className="whitespace-nowrap px-4 py-4">Created</th>
                  <th className="whitespace-nowrap px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-100 text-slate-900 transition hover:bg-slate-50 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-4">{app.id}</td>
                    <td className="whitespace-nowrap px-4 py-4">{app.name}</td>
                    <td className="whitespace-nowrap px-4 py-4">{app.pan}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div>{app.user.name}</div>
                      <div className="text-xs text-gray-500">{app.user.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColor[app.status]}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {new Date(app.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex gap-3">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="font-medium text-teal-800 transition hover:text-teal-700 hover:underline"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(app)}
                          disabled={deletingId === app.id}
                          className="font-medium text-red-700 transition hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
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