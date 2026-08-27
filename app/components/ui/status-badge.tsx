import { ReactNode } from 'react';
import { statusTint, getStatusTheme } from '@/lib/ui/status-colors';

interface StatusBadgeProps {
  status: string;
  className?: string;
  children?: ReactNode;
}

export function StatusBadge({ status, className = '', children }: StatusBadgeProps) {
  const { label, tone } = getStatusTheme(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusTint[tone]} ${className}`}
    >
      {children ?? label}
    </span>
  );
}
