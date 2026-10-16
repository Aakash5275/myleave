import Link from "next/link";

export default function EmployeeNotFound() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <h1 className="text-xl font-semibold">That record is not available</h1>
      <p className="mt-2 text-sm text-mist">It may belong to someone else, or it has not been issued yet.</p>
      <Link className="mt-4 inline-block text-sm font-semibold text-teal" href="/employee">
        Back to dashboard
      </Link>
    </div>
  );
}
