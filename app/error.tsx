'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-background px-4 text-center">
      <h1 className="font-display text-2xl text-foreground mb-2">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        We couldn&apos;t load this page. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-accent-foreground font-medium hover:bg-accent-dark"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-paper-2"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
