export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-line" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}
