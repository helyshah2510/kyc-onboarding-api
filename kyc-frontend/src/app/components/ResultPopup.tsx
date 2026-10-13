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
    console.log('ResultPopup is running');
  const [item, setItem] = useState<AppNotification | null>(null);

  useEffect(() => {
    let cancelled = false;

    api<AppNotification[]>('/notifications')
      .then((list) => {
        // the backend sends newest first, so the first unread one is the newest
        const newest = list.find((n) => !n.readAt);
        if (!cancelled && newest) setItem(newest);
      })
      .catch(() => {
        // no popup is better than an error box
      });

    return () => {
      cancelled = true;
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