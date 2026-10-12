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
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900';
    const buttonClass =
        'w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50';

    if (pageLoading) {
        return <main className="p-8 text-gray-600">Loading...</main>;
    }

    if (loadError || !application) {
        return (
            <main className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="mx-auto max-w-md space-y-3 rounded-xl bg-white p-6 shadow">
                    <p className="text-red-600">{loadError || 'Application not found'}</p>
                    <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
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
            <main className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="mx-auto max-w-md space-y-3 rounded-xl bg-white p-6 shadow">
                    <p className="text-gray-700">
                        This application can no longer be changed (status:{' '}
                        {application.status}).
                    </p>
                    <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
                        Back to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="mx-auto max-w-md space-y-6 rounded-xl bg-white p-6 shadow">
                <h1 className="text-2xl font-bold text-gray-900">Your KYC details</h1>

                {application.status === 'REJECTED' && application.rejectionReason && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        Your KYC was rejected. Reason: {application.rejectionReason}
                    </div>
                )}

                <dl className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
                    <div>
                        <dt className="text-gray-500">Name</dt>
                        <dd className="font-medium text-gray-900">{application.name}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">PAN</dt>
                        <dd className="font-medium text-gray-900">{application.pan}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Phone</dt>
                        <dd className="font-medium text-gray-900">{application.phone}</dd>
                    </div>
                </dl>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={3}
                        className={inputClass}
                    />
                </div>

                <form onSubmit={handleUpload} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                        Aadhaar image (PNG)
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
                        className="w-full rounded-lg border border-blue-600 py-2 font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                    >
                        {busy ? 'Working...' : 'Upload Aadhaar'}
                    </button>
                    {uploadedName && (
                        <p className="text-sm text-green-700">Uploaded: {uploadedName}</p>
                    )}
                </form>

                {error && <p className="text-sm text-red-600">{error}</p>}

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