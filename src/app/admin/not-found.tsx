import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <h1 className="text-xl font-semibold">That record is not available</h1>
      <p className="mt-2 text-sm text-mist">Check the link, or go back to the list.</p>
      <Link className="mt-4 inline-block text-sm font-semibold text-teal" href="/admin">
        Back to dashboard
      </Link>
    </div>
  );
}
