'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import { getRole } from '@/src/lib/auth';

type Application = {
    id: number;
    pan: string;
    name: string;
    phone: string;
    address: string;
    holderType: string;
    status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    kycDocuments?: { id: number; fileName: string; uploadedAt: string }[];
};

export default function KycFormPage() {
    return (
        <Suspense fallback={<main className="p-8 text-gray-600">Loading...</main>}>
            <KycForm />
        </Suspense>
    );
}

function KycForm() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [application, setApplication] = useState<Application | null>(null);
    const [address, setAddress] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [uploadedName, setUploadedName] = useState('');

    const [pageLoading, setPageLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const role = getRole();
        if (!role) {
            router.replace('/login');
            return;
        }
        if (role === 'ADMIN') {
            router.replace('/admin');
            return;
        }

        api<Application>(`/applications/${id}`)
            .then((app) => {
                setApplication(app);
                setAddress(app.address);
                if (app.kycDocuments && app.kycDocuments.length > 0) {
                    setUploadedName(app.kycDocuments[0].fileName);
                }
            })
            .catch((err) =>
                setLoadError(err instanceof Error ? err.message : 'Something went wrong'),
            )
            .finally(() => setPageLoading(false));
    }, [id, router]);

    async function run(action: () => Promise<void>) {
        setError('');
        setBusy(true);
        try {
            await action();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setBusy(false);
        }
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

    function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;

        run(async () => {
            const formData = new FormData();
            formData.append('file', file);

            await api(`/applications/${id}/documents`, {
                method: 'POST',
                body: formData,
            });

            setUploadedName(file.name);
            setFile(null);
            setFileInputKey((k) => k + 1);
        });
    }

    function handleSubmit() {
        const trimmed = address.trim();
        if (!trimmed) {
            setError('Address cannot be empty');
            return;
        }

        run(async () => {
            // Save the address first if it was changed
            if (trimmed !== application?.address) {
                await api(`/applications/${id}/personal-details`, {
                    method: 'PATCH',
                    body: JSON.stringify({ address: trimmed }),
                });
            }

            await api(`/applications/${id}/submit`, {
                method: 'POST',
            });

            router.push('/dashboard');
        });
    }


    const inputClass =
        'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10';

    const buttonClass =
        'w-full rounded-xl bg-teal-800 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-50';


    if (pageLoading) {
        return (
            <main className="flex flex-1 items-center justify-center px-4 py-12">
                <p className="text-sm text-slate-500">Loading your KYC details...</p>
            </main>
        );
    }

    if (loadError || !application) {
        return (
            <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
                <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-sm text-red-700">
                        {loadError || 'Application not found'}
                    </p>
                    <Link
                        href="/dashboard"
                        className="text-sm font-medium text-teal-800 hover:underline"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    const editable =
        application.status === 'DRAFT' || application.status === 'REJECTED';

    if (!editable) {
        return (
            <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
                <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-sm leading-6 text-slate-600">
                        This application can no longer be changed. Current status:{' '}
                        <span className="font-semibold text-slate-900">
                            {application.status}
                        </span>
                    </p>
                    <Link href="/dashboard" className="text-sm text-teal-800 hover:underline">
                        Back to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="mx-auto max-w-md space-y-6 rounded-xl bg-white p-6 shadow">

                <div>
                    <p className="text-sm font-semibold text-teal-800">
                        IDENTITY VERIFICATION
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                        Your KYC details
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Review your information, upload your Aadhaar image, and submit your application.
                    </p>
                </div>


                {application.status === 'REJECTED' && application.rejectionReason && (

                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-900">
                            Changes required
                        </p>
                        <p className="mt-1 text-sm leading-6 text-red-800">
                            Your KYC was rejected. Reason: {application.rejectionReason}
                        </p>
                    </div>
                )}


                <dl className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:p-5">

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
                </dl>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700"> Address </label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={3}
                        className={inputClass}
                    />
                </div>

                <form onSubmit={handleUpload} className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                        Aadhaar image (PNG)
                    </label>
                    <p className="text-xs leading-5 text-slate-500">
                        Upload a PNG image up to 5 MB.
                    </p>
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
                        className="w-full rounded-xl border border-teal-800 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? 'Working...' : 'Upload Aadhaar'}
                    </button>
                    {uploadedName && (
                        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                            Uploaded: {uploadedName}
                        </p>
                    )}
                </form>

                {error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={busy}
                    className={buttonClass}
                >
                    {busy ? 'Working...' : 'Submit KYC'}
                </button>

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