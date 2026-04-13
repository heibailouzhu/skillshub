import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const baseStyles = 'glass-panel rounded-3xl overflow-hidden';
  const hoverStyles = hover ? 'cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]' : '';

  return <div className={`${baseStyles} ${hoverStyles} ${className}`} onClick={onClick}>{children}</div>;
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardSectionProps) {
  return <div className={`border-b border-[var(--line)] px-6 py-5 lg:px-7 lg:py-6 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return <div className={`px-6 py-5 lg:px-7 lg:py-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardSectionProps) {
  return <div className={`border-t border-[var(--line)] px-6 py-4 lg:px-7 lg:py-5 ${className}`} style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 86%, white 14%)' }}>{children}</div>;
}
