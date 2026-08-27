import { HTMLAttributes } from 'react';

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function PageContainer({ className = '', ...props }: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    />
  );
}
