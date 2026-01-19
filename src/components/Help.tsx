import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpProps {
  content: string;
}

function Help({ content }: HelpProps) {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClose();
  };

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <button
        className="ml-2 p-1 rounded-full transition-all"
        style={{
          backgroundColor: 'var(--theme-primary-color)',
          color: 'white',
        }}
        title="Справка"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-primary-color-hover)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-primary-color)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <>
          {/* Overlay - клик закрывает */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleOverlayClick}
            onMouseDown={handleOverlayClick}
          />
          {/* Панель справки */}
          <div
            className="fixed top-0 right-0 w-[300px] sm:w-[600px] h-full shadow-2xl z-50 overflow-auto"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderLeft: '1px solid var(--theme-card-border)',
            }}
            onClick={handlePanelClick}
          >
            <div
              className="sticky top-0 flex items-center justify-between p-4"
              style={{
                backgroundColor: 'var(--theme-card-header-bg)',
                borderBottom: '1px solid var(--theme-card-border)',
              }}
            >
              <h3
                className="font-semibold flex items-center gap-2"
                style={{ color: 'var(--theme-content-text)' }}
              >
                <HelpCircle className="w-5 h-5" style={{ color: 'var(--theme-primary-color)' }} />
                Справка
              </h3>
              <button
                className="p-1 rounded hover:bg-slate-500/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                style={{ color: 'var(--theme-content-text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="p-4 prose prose-sm max-w-none"
              style={{ color: 'var(--theme-content-text)', whiteSpace: 'pre-line' }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </>
      )}
    </>
  );
}

export default Help;
