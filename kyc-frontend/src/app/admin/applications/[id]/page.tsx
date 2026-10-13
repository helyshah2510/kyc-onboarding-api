'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import { getRole } from '@/src/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004';

type Status = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';

type Application = {
  id: number;
  pan: string;
  name: string;
  phone: string;
  address: string;
  holderType: string;
  status: Status;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string; phone: string };
  kycDocuments: { id: number; fileName: string; uploadedAt: string }[];
};

type ImageState = 'loading' | 'ready' | 'missing' | 'error';

const badgeColor: Record<Status, string> = {
  DRAFT: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  VERIFIED: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
  SUBMITTED: 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200',
  APPROVED: 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200',
  REJECTED: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
};


export default function AdminApplicationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <p className="text-sm text-slate-500">Loading application...</p>
        </main>
      }
    >
      <AdminApplicationView />
    </Suspense>
  );
}

function AdminApplicationView() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [authorized, setAuthorized] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Aadhaar image
  const [imageUrl, setImageUrl] = useState('');
  const [imageState, setImageState] = useState<ImageState>('loading');
  const [imageVersion, setImageVersion] = useState(0);

  // actions
  const [address, setAddress] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadApplication = useCallback(async () => {
    const app = await api<Application>(`/admin/applications/${id}`);
    setApplication(app);
    setAddress(app.address);
  }, [id]);

  // 1. Front gate, then load the application
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
    setAuthorized(true);

    loadApplication()
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Something went wrong'),
      )
      .finally(() => setPageLoading(false));
  }, [loadApplication, router]);

  // 2. Fetch the image WITH the token, then show it from a temporary local link
  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;
    let objectUrl = '';
    setImageState('loading');

    const token = localStorage.getItem('token');
    fetch(`${API_URL}/admin/applications/${id}/documents`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (cancelled) return;

        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        if (res.status === 404) {
          setImageState('missing');
          return;
        }
        if (!res.ok) {
          setImageState('error');
          return;
        }

        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setImageState('ready');
      })
      .catch(() => {
        if (!cancelled) setImageState('error');
      });

    // Free the temporary link when the page closes or the image reloads
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [authorized, id, imageVersion]);

  async function run(action: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function handleApprove() {
    if (!window.confirm('Approve this application?')) return;
    run(async () => {
      await api(`/admin/applications/${id}/approve`, { method: 'PATCH' });
      await loadApplication();
      setNotice('Application approved');
    });
  }

  function handleReject() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please enter a reason for rejecting');
      return;
    }
    run(async () => {
      await api(`/admin/applications/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: trimmed }),
      });
      setShowRejectBox(false);
      setReason('');
      await loadApplication();
      setNotice('Application rejected');
    });
  }

  function handleSaveAddress() {
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Address cannot be empty');
      return;
    }
    run(async () => {
      await api(`/admin/applications/${id}/address`, {
        method: 'PATCH',
        body: JSON.stringify({ address: trimmed }),
      });
      await loadApplication();
      setNotice('Address saved');
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    if (!chosen) {
      setFile(null);
      return;
    }
    if (chosen.type !== 'image/png') {
      setError('Only PNG files are allowed');
      setFile(null);
      setFileInputKey((k) => k + 1);
      return;
    }
    if (chosen.size > 5 * 1024 * 1024) {
      setError('File size must not exceed 5 MB');
      setFile(null);
      setFileInputKey((k) => k + 1);
      return;
    }
    setError('');
    setFile(chosen);
  }

  function handleReplaceImage(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    run(async () => {
      const formData = new FormData();
      formData.append('file', file);
      await api(`/admin/applications/${id}/documents`, {
        method: 'PATCH',
        body: formData,
      });
      setFile(null);
      setFileInputKey((k) => k + 1);
      setImageVersion((v) => v + 1);
      await loadApplication();
      setNotice('Image replaced');
    });
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10';

  if (pageLoading) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-sm text-slate-500">Loading application details...</p>
      </main>
    );
  }

  if (loadError || !application) {
    return (
      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm text-red-700"> {loadError || 'Application not found'} </p>
          <Link
            href="/admin"
            className="text-sm font-medium text-teal-800 hover:underline"
          >
            Back to list
          </Link>
        </div>
      </main>
    );
  }

  const reviewable =
    application.status === 'VERIFIED' || application.status === 'SUBMITTED';

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/admin"
          className="inline-flex text-sm font-medium text-teal-800 transition hover:text-teal-700 hover:underline"
        >
          &larr; Back to list
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            Application #{application.id}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColor[application.status]}`}
          >
            {application.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-900">{application.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">PAN</dt>
              <dd className="mt-1 font-medium text-slate-900">{application.pan}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="mt-1 font-medium text-slate-900">{application.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Holder type</dt>
              <dd className="mt-1 font-medium capitalize text-slate-900">
                {application.holderType}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</dt>
              <dd className="mt-1 font-medium text-slate-900">{application.address}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Owner</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {application.user.name}
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {application.user.email} &middot; {application.user.phone}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {new Date(application.createdAt).toLocaleString('en-IN')}
              </dd>
            </div>
          </dl>

          {application.status === 'REJECTED' && application.rejectionReason && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Rejection reason: {application.rejectionReason}
            </div>
          )}
        </div>

        {/* Aadhaar image */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Aadhaar image
          </h2>
          <p className="text-sm leading-6 text-slate-500">
            Review the uploaded document below.
          </p>

          {imageState === 'loading' && (
            <p className="text-sm text-slate-500">Loading Aadhaar image...</p>
          )}
          {imageState === 'missing' && (
            <p className="text-sm leading-6 text-slate-500">
              No Aadhaar image has been uploaded for this application.
            </p>
          )}
          {imageState === 'error' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Could not load the image.
            </p>
          )}
          {imageState === 'ready' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Aadhaar"
              className="max-h-[32rem] max-w-full rounded-xl border border-slate-200 object-contain"
            />
          )}
        </div>


        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {notice && (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            {notice}
          </p>
        )}


        {/* Actions */}
        {reviewable ? (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900">Review actions</h2>
            <p className="text-sm leading-6 text-slate-500">
              Update applicant details or make a verification decision.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Edit address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleSaveAddress}
                disabled={busy}
                className="rounded-xl border border-teal-800 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save address
              </button>
            </div>

            <form onSubmit={handleReplaceImage} className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Replace Aadhaar image (PNG)
              </label>
              <input
                key={fileInputKey}
                type="file"
                accept="image/png"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700"
              />
              <button
                type="submit"
                disabled={busy || !file}
                className="rounded-xl border border-teal-800 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Replace image
              </button>
            </form>

            <div className="space-y-3 border-t pt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy}
                  className="rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectBox((open) => !open);
                    setError('');
                  }}
                  disabled={busy}
                  className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>
              </div>

              {showRejectBox && (
                <div className="space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for rejecting (the user will see this)"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={busy}
                    className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Confirm rejection
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">View-only application</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This application is {application.status}, so it can only be viewed.
              Only VERIFIED or SUBMITTED applications can be changed or decided.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}