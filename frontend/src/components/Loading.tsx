import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ size = 'md', text, fullScreen = false }) => {
  const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <svg className={`animate-spin text-[var(--brand)] ${sizeStyles[size]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"></path>
      </svg>
      {text && <p className="text-sm text-[var(--text-soft)]">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 82%, transparent 18%)' }}>{content}</div>;
  }

  return content;
};

export default Loading;
