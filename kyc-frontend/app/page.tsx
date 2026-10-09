import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900">KYC Onboarding</h1>
      <p className="max-w-md text-gray-600">
        Verify your identity online. Enter your PAN, confirm your details,
        upload your Aadhaar, and track your status in one place.
      </p>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-blue-600 px-6 py-3 font-medium text-blue-600 hover:bg-blue-50"
        >
          Register
        </Link>
      </div>
    </main>
  );
}