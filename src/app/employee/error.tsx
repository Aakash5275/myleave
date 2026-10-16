"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-semibold">This page could not be loaded</h2>
      <p className="mt-2 text-sm text-mist">Refresh the page or try the action again.</p>
      <button className="mt-4 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
