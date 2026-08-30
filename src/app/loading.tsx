export default function Loading(): React.ReactElement {
  return (
    <main className="min-h-screen">
      <div className="container py-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-full bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="h-48 rounded-2xl bg-muted" />
          <div className="h-48 rounded-2xl bg-muted" />
        </div>
      </div>
    </main>
  );
}
