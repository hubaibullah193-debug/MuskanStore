export default function Loading() {
  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card border border-border p-6 rounded-lg">
          <div className="aspect-square bg-paper-2 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-6 w-2/3 bg-paper-2 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-paper-2 rounded animate-pulse" />
            <div className="h-20 w-full bg-paper-2 rounded animate-pulse" />
            <div className="h-10 w-40 bg-paper-2 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
