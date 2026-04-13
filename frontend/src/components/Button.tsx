import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--brand)] text-white hover:brightness-105 focus:ring-[var(--brand)]/40 shadow-[0_12px_40px_-18px_color-mix(in_srgb,var(--brand)_70%,transparent)]',
    secondary: 'border border-[var(--line)] bg-white/10 text-[var(--text)] hover:bg-white/16 focus:ring-[var(--accent)]/30',
    danger: 'bg-[var(--danger)] text-white hover:brightness-105 focus:ring-[var(--danger)]/35',
    ghost: 'bg-transparent text-[var(--text-soft)] hover:bg-white/10 hover:text-[var(--text)] focus:ring-[var(--accent)]/30',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const loadingLabel = typeof document !== 'undefined' && document.documentElement.lang === 'zh-CN'
    ? '加载中...'
    : 'Loading...';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"></path>
          </svg>
          {loadingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
