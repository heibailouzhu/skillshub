import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const sizeStyles: Record<NonNullable<ModalProps['size']>, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className={`glass-panel-strong relative w-full ${sizeStyles[size]} rounded-[2rem]`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
            <button onClick={onClose} className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-4 text-[var(--text-soft)]">{children}</div>
          {footer && <div className="flex justify-end space-x-3 border-t border-[var(--line)] px-6 py-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default Modal;
