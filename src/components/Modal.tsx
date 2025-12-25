import React, { ReactNode, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  resizable?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-[400px]',
  md: 'w-[500px]',
  lg: 'w-[700px]',
  xl: 'w-[900px]',
  full: 'w-[95vw]',
};

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'lg',
  closeOnBackdrop = true,
  closeOnEsc = true,
  resizable = false,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        onClose();
      }
    },
    [onClose, closeOnEsc]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10">
      {}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {}
      <div
        className={`relative ${sizeClasses[size]} max-w-[95vw] mx-4 rounded-lg shadow-2xl overflow-hidden`}
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          border: '1px solid var(--theme-card-border)',
          maxHeight: 'calc(100vh - 5rem)',
          display: 'flex',
          resize: resizable ? 'both' : undefined,
          flexDirection: 'column',
        }}
      >
        {}
        {title !== undefined && (
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{
              borderBottom: '1px solid var(--theme-card-border)',
              backgroundColor: 'var(--theme-card-header-bg)',
            }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--theme-content-text)' }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-slate-500/20"
              style={{ color: 'var(--theme-content-text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {}
        <div
          className="flex-1 overflow-auto px-6 py-4"
          style={{ color: 'var(--theme-content-text)' }}
        >
          {children}
        </div>

        {}
        {footer && (
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
            style={{
              borderTop: '1px solid var(--theme-card-border)',
              backgroundColor: 'var(--theme-card-header-bg)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;

