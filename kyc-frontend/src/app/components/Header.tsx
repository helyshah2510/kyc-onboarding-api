'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getRole, logout } from '@/src/lib/auth';


export function Header() {
  return (
    <Suspense fallback={<div className="h-16 border-b border-gray-200 bg-white" />}>
      <HeaderContent />
    </Suspense>
  );
}

function HeaderContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<'USER' | 'ADMIN' | null>(null);

  useEffect(() => {
    setRole(getRole());
  }, [pathname]);

  function handleLogout() {
    logout();
    setRole(null);
    router.push('/login');
  }

  return (
    <header className="border-b border-gray-200 bg-white shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs group-hover:bg-teal-700 transition">
            KYC
          </div>
          <span className="font-semibold text-gray-900 tracking-tight text-base sm:text-lg">
            KYC Portal
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          {role === 'ADMIN' ? (
            <>
              <Link
                href="/admin"
                className={`font-medium transition px-2.5 py-1.5 rounded-md ${pathname?.startsWith('/admin')
                    ? 'text-teal-800 bg-teal-50'
                    : 'text-gray-600 hover:text-teal-800 hover:bg-teal-50'
                  }`}
              >
                Admin Panel
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 font-medium px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition"
              >
                Logout
              </button>
            </>
          ) : role === 'USER' ? (
            <>
              <Link
                href="/dashboard"
                className={`font-medium transition px-2.5 py-1.5 rounded-md ${pathname === '/dashboard'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Dashboard
              </Link>
              <Link
                href="/kyc/new"
                className={`font-medium transition px-2.5 py-1.5 rounded-md ${pathname === '/kyc/new'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                New KYC
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 font-medium px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`font-medium transition px-3 py-1.5 rounded-md ${pathname === '/login'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-teal-800 px-3.5 py-1.5 font-medium text-white hover:bg-teal-700 shadow-xs transition"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
