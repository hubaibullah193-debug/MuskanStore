import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-card shadow-sm ${className}`}
      {...props}
    />
  );
}
