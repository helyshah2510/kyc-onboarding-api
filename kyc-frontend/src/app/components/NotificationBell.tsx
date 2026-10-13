'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellIcon } from 'lucide-react';
import { api } from '@/src/lib/api';

type AppNotification = {
    id: number;
    message: string;
    readAt: string | null;
    createdAt: string;
};

export function NotificationBell({ refreshKey }: { refreshKey?: string | null }) {
    const [items, setItems] = useState<AppNotification[]>([]);
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            setItems(await api<AppNotification[]>('/notifications'));
        } catch {
            // the bell is not important enough to show an error
        }
    }, []);

    // load now, on every page change, and every 30 seconds
    useEffect(() => {
        load();
        const timer = setInterval(load, 30000);
        return () => {
            clearInterval(timer);
            window.removeEventListener('notifications changed ', load);
        };
    }, [load, refreshKey]);

    const unread = items.filter((n) => !n.readAt).length;

    async function markRead(item: AppNotification) {
        if (item.readAt) return;
        // change the screen first, then tell the backend
        setItems((current) =>
            current.map((n) =>
                n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n,
            ),
        );
        try {
            await api(`/notifications/${item.id}/read`, { method: 'PATCH' });
        } catch {
            load(); // it failed, so show the real state again
        }
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={`Notifications, ${unread} unread`}
                className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100"
            >
                <BellIcon className="size-5" />
                {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <>
                    {/* invisible layer behind the list: clicking it closes the list */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
                        <p className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-900">
                            Notifications
                        </p>

                        {items.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-gray-500">
                                No notifications yet
                            </p>
                        ) : (
                            <ul className="max-h-72 overflow-y-auto">
                                {items.map((item) => (
                                    <li
                                        key={item.id}
                                        onClick={() => markRead(item)}
                                        className={`cursor-pointer border-b border-gray-50 px-4 py-3 last:border-0 hover:bg-gray-50 ${item.readAt ? 'text-gray-600' : 'bg-blue-50 font-medium text-gray-900'
                                            }`}
                                    >
                                        <p className="text-sm">{item.message}</p>
                                        <p className="mt-1 text-xs font-normal text-gray-500">
                                            {new Date(item.createdAt).toLocaleString('en-IN')}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}