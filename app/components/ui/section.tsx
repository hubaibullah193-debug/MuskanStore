import { HTMLAttributes } from 'react';

interface SectionProps extends HTMLAttributes<HTMLElement> {
  className?: string;
}

export function Section({ className = '', ...props }: SectionProps) {
  return (
    <section className={`py-xl ${className}`} {...props} />
  );
}
