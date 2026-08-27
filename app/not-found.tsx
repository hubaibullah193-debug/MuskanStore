import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-background px-4 text-center">
      <h1 className="font-display text-3xl text-foreground mb-2">
        Page not found
      </h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/products"
        className="rounded-md bg-accent px-4 py-2 text-accent-foreground font-medium hover:bg-accent-dark"
      >
        Browse products
      </Link>
    </div>
  );
}
