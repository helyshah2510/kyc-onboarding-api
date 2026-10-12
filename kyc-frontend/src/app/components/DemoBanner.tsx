export function DemoBanner() {
  return (
    <div
      role="banner"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs sm:text-sm font-medium text-amber-900 flex items-center justify-center gap-2"
    >
      <span
        aria-hidden="true"
        className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"
      />
      <span>
        <strong className="font-semibold">Demo Environment:</strong> Use sample data only. Do not submit real personal or government documents.
      </span>
    </div>
  );
}
