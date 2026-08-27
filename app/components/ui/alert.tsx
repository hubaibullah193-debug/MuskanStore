import { statusTint, Tone } from '@/lib/ui/status-colors';

interface AlertProps {
  variant?: Tone;
  children: React.ReactNode;
  className?: string;
  role?: string;
}

export function Alert({ variant = 'info', children, className = '', role }: AlertProps) {
  const roleAttr =
    role ??
    (variant === 'error'
      ? 'alert'
      : variant === 'success'
      ? 'status'
      : undefined);

  return (
    <div
      className={`rounded-md border p-3 text-sm ${statusTint[variant]} ${className}`}
      role={roleAttr}
    >
      {children}
    </div>
  );
}
