import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export default function Input({
  label,
  error,
  fullWidth = false,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-[var(--text)]">{label}</label>}
      <input
        id={inputId}
        className={`block rounded-2xl border px-4 py-3.5 text-[var(--text)] shadow-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/30' : 'border-[var(--line)] bg-white/50 focus:border-[var(--accent)] focus:ring-[var(--accent)]/25'} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={{ backgroundColor: 'color-mix(in srgb, var(--panel-strong) 88%, white 12%)' }}
        {...props}
      />
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}
