import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { createApiUrl } from '../lib/basePath';

interface ConsoleProps {
  pipelineId: string | number;
}

export default function Console({ pipelineId }: ConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const offsetRef = useRef(1);
  const destroyedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    destroyedRef.current = false;
    offsetRef.current = 1;

    const sessionId = useAuthStore.getState().getSessionId();

    const getLogs = async () => {
      try {
        const response = await fetch(
          createApiUrl(`shm/admin/console.cgi?id=${pipelineId}&offset=${offsetRef.current}`),
          {
            credentials: 'include',
            headers: {
              'Accept': 'text/plain',
              ...(sessionId ? { 'session-id': `${sessionId}` } : {}),
            },
          }
        );

        const log = await response.text();
        const eof = response.headers.get('x-console-eof');

        if (log && consoleRef.current) {
          offsetRef.current += log.length;
          const text = log.replace(/\n\r?|\r\n?/g, '<br/>');
          consoleRef.current.innerHTML += text;

          if (consoleRef.current.parentElement) {
            consoleRef.current.parentElement.scrollTop = consoleRef.current.parentElement.scrollHeight;
          }
        }

        if (eof === '0' && !destroyedRef.current) {
          timerRef.current = setTimeout(() => {
            getLogs();
          }, 1000);
        } else {
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
      }
    };

    getLogs();

    return () => {
      destroyedRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pipelineId]);

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: '500px' }}>
      <div
        ref={consoleRef}
        style={{
          position: 'relative',
          backgroundColor: '#000',
          color: '#fff',
          width: '100%',
          minHeight: '500px',
          height: '100%',
          display: 'block',
          padding: '10px',
          fontFamily: 'Lucida Console, Lucida Sans Typewriter, monaco, Bitstream Vera Sans Mono, monospace',
          wordWrap: 'break-word',
          border: '1px solid #ccc',
          borderRadius: '3px',
          boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(82, 168, 236, 0.6)',
          overflow: 'auto',
        }}
      />
      {loading && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
