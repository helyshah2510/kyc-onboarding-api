import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8">
      <section className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-2">
          {/* Main introduction */}
          <div className="flex flex-col justify-center px-7 py-12 sm:px-12 sm:py-16">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-teal-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m9 12 2 2 4-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              KYC PORTAL
            </div>

            <h1 className="max-w-md text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Identity verification, made simpler.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Complete your KYC application online, submit your identity
              documents, and track your verification status in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl bg-teal-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
              >
                Create an account
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-6 text-xs leading-5 text-slate-500">
              Have an account already? Sign in to continue your application.
            </p>
          </div>

          {/* Supporting visual */}
          <div className="relative flex min-h-72 flex-col justify-between bg-teal-900 p-8 text-white sm:p-12 md:min-h-full">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 80% 20%, #99f6e4 0, transparent 35%), radial-gradient(circle at 10% 90%, #5eead4 0, transparent 35%)',
              }}
            />

            <div className="relative">
              <p className="text-sm font-medium text-teal-100">
                YOUR APPLICATION
              </p>
              <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-snug sm:text-3xl">
                Your verification journey, all in one place.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-teal-100">
                Submit your details, provide the required document, and follow
                your application through the review process.
              </p>
            </div>

            <div className="relative mt-10 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <rect
                      x="5"
                      y="3"
                      width="14"
                      height="18"
                      rx="2"
                    />
                    <path
                      d="M8 8h8M8 12h8M8 16h4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">KYC application</p>
                  <p className="mt-1 text-xs text-teal-100">
                    Application status at a glance
                  </p>
                </div>
              </div>

              <div className="mt-5 h-px bg-white/15" />

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-teal-100">Application tracking</span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  Available
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}