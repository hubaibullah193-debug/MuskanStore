export default function Loading() {
  return (
    <div
      className="flex-1 flex items-center justify-center min-h-[60vh] bg-background"
      role="status"
      aria-live="polite"
    >
      <span className="font-display text-xl text-muted-foreground animate-pulse">
        Loading…
      </span>
    </div>
  );
}
