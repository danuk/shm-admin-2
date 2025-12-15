import { useEffect, useRef } from 'react';

interface UsePageVisibilityOptions {
  onVisible?: () => void;
  onHidden?: () => void;
  enabled?: boolean;
}

/**
 * Хук для отслеживания видимости страницы (вкладки)
 * Вызывает callback функции когда вкладка становится видимой/скрытой
 */
export function usePageVisibility({ onVisible, onHidden, enabled = true }: UsePageVisibilityOptions) {
  const onVisibleRef = useRef(onVisible);
  const onHiddenRef = useRef(onHidden);

  useEffect(() => {
    onVisibleRef.current = onVisible;
    onHiddenRef.current = onHidden;
  }, [onVisible, onHidden]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHiddenRef.current?.();
      } else {
        onVisibleRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  return !document.hidden;
}
