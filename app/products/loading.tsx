export default function Loading() {
  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-paper-2 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4">
              <div className="aspect-square bg-paper-2 rounded animate-pulse mb-3" />
              <div className="h-4 w-3/4 bg-paper-2 rounded animate-pulse mb-2" />
              <div className="h-4 w-1/2 bg-paper-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
