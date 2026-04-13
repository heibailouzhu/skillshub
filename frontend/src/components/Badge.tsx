import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

export default function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'border border-[var(--line)] bg-white/10 text-[var(--text-soft)]',
    primary: 'border border-sky-400/20 bg-sky-400/10 text-sky-500 dark:text-sky-200',
    secondary: 'border border-[var(--line)] bg-white/6 text-[var(--text-soft)]',
    success: 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-200',
    warning: 'border border-amber-400/20 bg-amber-400/10 text-amber-600 dark:text-amber-200',
    danger: 'border border-rose-400/20 bg-rose-400/10 text-rose-600 dark:text-rose-200',
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-3.5 py-1.5 text-sm',
  };

  return <span className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>{children}</span>;
}
