import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-teal">404</p>
        <h1 className="mt-2 text-3xl font-semibold">That page is not here</h1>
        <Link className="mt-4 inline-block text-sm font-semibold text-teal" href="/">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
