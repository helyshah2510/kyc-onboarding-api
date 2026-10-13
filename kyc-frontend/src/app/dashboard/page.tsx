'use client';

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { getRole, logout } from "@/src/lib/auth";
import { ResultPopup } from '../components/ResultPopup';

type Application = {
    id: number;
    pan: string;
    name: string;
    status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;
};

const statusInfo: Record<
    Application['status'],
    { title: string, text: string, badge: string }
> = {
    DRAFT: {
        title: 'Continue your KYC',
        text: 'Your application is saved as a draft. Complete the remaining details and submit it for review.',
        badge: 'bg-yellow-100 text-yellow-800',
    },
    VERIFIED: {
        title: 'Under Verification',
        text: 'Your identity details have been verified. Your application is awaiting the next review decision.',
        badge: 'bg-blue-100 text-blue-800',
    },
    SUBMITTED: {
        title: 'under Verification',
        text: 'Your updated application has been submitted and is awaiting review.',
        badge: 'bg-blue-100 text-blue-800',
    },
    APPROVED: {
        title: 'Kyc Approved',
        text: 'Your KYC application has been approved. No further action is required right now.',
        badge: 'bg-green-100 text-green-800',
    },
    REJECTED: {
        title: 'Kyc rejected',
        text: 'Your application was rejected. Review the reason below, make the necessary changes, and resubmit it.',
        badge: 'bg-red-100 text-red-800',
    }
};

export default function DashboardPage() {
    const router = useRouter();
    const [application, setApplication] = useState<Application | null>(null);
    const [loading, setLoading] = useState(true);
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

        api<Application[]>('/applications')
            .then((list) => {
                const latest = [...list].sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )[0];
                setApplication(latest ?? null);
            })
            .catch((err) => {
                if (err instanceof Error && err.message === 'Unauthorized') {
                    logout();
                    router.replace('/login');
                    return;
                }
                setError(err instanceof Error ? err.message : 'Something went wrong')
            })
            .finally(() => setLoading(false));
    }, [router]);

    const info = application ? statusInfo[application.status] : null;
    const canEdit = application?.status === 'DRAFT' || application?.status === 'REJECTED';

    return (
        <main className="flex flex-1 justify-center px-4 py-10 sm:px-6">
            <ResultPopup/>
            <div className="w-full max-w-3xl space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                            My KYC
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Manage your identity verification application.
                        </p>
                    </div>
                </div>

                {loading && <p className="text-gray-600">Loading...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!loading && !error && !application && (
                    <div className="inline-flex items-center justify-center rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
                        <h2 className="text-lg font-semibold text-slate-900">
                            You have not started your KYC yet
                        </h2>
                        <p className="text-gray-600">
                            Enter your PAN to begin. It takes a few minutes.
                        </p>
                        <Link
                            href="/kyc/new"
                            className="inline-block rounded-lg bg-teal-800 px-5 py-2 font-medium text-white hover:bg-blue-700"
                        >
                            Start KYC
                        </Link>
                    </div>
                )}
                {application && info && (
                    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {info.title}
                            </h2>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${info.badge}`}
                            >
                                {application.status}
                            </span>
                        </div>
                        <p className="text-gray-600">{info.text}</p>
                        <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Applicant name
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {application.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    PAN number
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {application.pan}
                                </p>
                            </div>
                        </div>
                        {application.status === 'REJECTED' &&
                            application.rejectionReason && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                    <p className="text-sm font-semibold text-red-900">
                                        Reason for rejection
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-red-800">
                                        {application.rejectionReason}
                                    </p>
                                </div>
                            )}
                        {canEdit && (
                            <Link
                                href={`/kyc/${application.id}`}
                                className="inline-flex items-center justify-center rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                            >
                                {application.status === 'DRAFT'
                                    ? 'Continue KYC'
                                    : 'Edit and resubmit'}
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
