'use client';

import { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';

type AppNotification = {
    id: number;
    message: string;
    readAt: string | null;
    createdAt: string;
};

export function ResultPopup() {
    const [item, setItem] = useState<AppNotification | null>(null);

    useEffect(() => {
        let cancelled = false;
        let isFirstLoad = true;
        let knownIds = new Set<number>();

        async function checkNotifications() {
            try {
                const list = await api<AppNotification[]>('/notifications');
                if (cancelled) return;

                if (isFirstLoad) {
                    // On first load, show the newest unread notification, if any.
                    knownIds = new Set(list.map((n) => n.id));
                    const newest = list.find((n) => !n.readAt);
                    if (newest) setItem(newest);
                    isFirstLoad = false;
                    return;
                }

                // Only pop up for notifications that arrived after the first fetch.
                const newItem = list.find((n) => !knownIds.has(n.id));
                knownIds = new Set(list.map((n) => n.id));

                if (newItem) {
                    setItem(newItem);
                }
            } catch {
                // Keep the dashboard usable if notifications cannot be fetched.
            }
        }

        void checkNotifications();
        const timer = setInterval(() => {
            void checkNotifications();
        }, 5000);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    async function close() {
        if (!item) return;
        const id = item.id;
        setItem(null);
        try {
            await api(`/notifications/${id}/read`, { method: 'PATCH' });
        } catch {
            // it will simply show again next time
        }
        // tell the bell to reload, so its red number clears right away
        window.dispatchEvent(new Event('notifications-changed'));
    }

    if (!item) return null;

    const text = item.message.toLowerCase();
    const approved = text.includes('approved');
    const rejected = text.includes('rejected');

    const title = approved ? 'KYC approved' : rejected ? 'KYC rejected' : 'New notification';
    const circle = approved
        ? 'bg-green-100 text-green-700'
        : rejected
            ? 'bg-red-100 text-red-700'
            : 'bg-teal-100 text-teal-700';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
            <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-xl">
                <div
                    className={`mx-auto flex size-12 items-center justify-center rounded-full text-2xl font-bold ${circle}`}
                >
                    {approved ? '✓' : rejected ? '✕' : '!'}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600">{item.message}</p>
                <button
                    type="button"
                    onClick={close}
                    className="w-full rounded-lg bg-teal-800 py-2 font-medium text-white hover:bg-teal-700"
                >
                    Got it
                </button>
            </div>
        </div>
    );
}