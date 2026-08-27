import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-md border border-border bg-paper-3 px-3 py-2 text-foreground placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
