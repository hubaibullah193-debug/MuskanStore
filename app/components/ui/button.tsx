import Link from 'next/link';
import {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactNode,
} from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-dark',
  outline: 'border border-accent text-accent hover:bg-paper-2',
  ghost: 'text-foreground hover:bg-paper-2',
  danger: 'bg-error text-white hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const variant = props.variant ?? 'primary';
  const size = props.size ?? 'md';
  const className = props.className ?? '';
  const classes = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if ('href' in props && props.href !== undefined) {
    const { href, variant: _v, size: _s, className: _c, children: _ch, ...rest } =
      props as ButtonAsLink;
    void _v;
    void _s;
    void _c;
    void _ch;
    return (
      <Link href={href} className={classes} {...rest}>
        {props.children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } =
    props as ButtonAsButton;
  void _v;
  void _s;
  void _c;
  void _ch;
  return (
    <button className={classes} {...rest}>
      {props.children}
    </button>
  );
}
