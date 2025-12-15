import { useEffect, useRef } from 'react';
import { usePageVisibility } from './usePageVisibility';
import { useCacheStore } from '../store/cacheStore';

interface UseAutoRefreshOptions {
  onRefresh: () => void | Promise<void>;
  cacheKey?: string;
  enabled?: boolean;
  interval?: number;
}

/**
 * Хук для автоматического обновления данных
 * - Работает только когда вкладка активна
 * - Использует настройки кеша для определения времени обновления
 * - Останавливает обновление когда вкладка неактивна
 * - Проверяет кеш при возвращении на вкладку
 */
export function useAutoRefresh({ 
  onRefresh, 
  cacheKey, 
  enabled = true,
  interval = 10000, // По умолчанию проверяем каждые 10 секунд
}: UseAutoRefreshOptions) {
  const { settings, needsBackgroundRefresh } = useCacheStore();
  const intervalIdRef = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Проверяем, нужно ли обновление при возвращении на вкладку
  const handleVisible = () => {
    if (!settings.backgroundRefresh || !enabled || !initialLoadDoneRef.current) return;

    // НЕ делаем запрос сразу при возвращении на вкладку
    // Только запускаем интервал, который сам проверит по расписанию
    
    // Запускаем периодическую проверку
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    
    intervalIdRef.current = window.setInterval(() => {
      if (document.hidden) return; // Двойная проверка
      
      if (cacheKey) {
        if (needsBackgroundRefresh(cacheKey)) {
          onRefreshRef.current();
        }
      } else {
        // Если нет cacheKey, просто обновляем по интервалу
        onRefreshRef.current();
      }
    }, interval);
  };

  // Останавливаем обновление когда вкладка скрыта
  const handleHidden = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  // Используем хук видимости страницы
  const isVisible = usePageVisibility({
    onVisible: handleVisible,
    onHidden: handleHidden,
    enabled: enabled && settings.backgroundRefresh && settings.enabled,
  });

  // Запускаем интервал при монтировании если вкладка активна
  useEffect(() => {
    if (!settings.backgroundRefresh || !enabled || !settings.enabled) return;

    // Отмечаем что компонент смонтирован, можно начинать автообновление
    initialLoadDoneRef.current = true;
    
    // Запускаем интервал только если вкладка активна
    if (!document.hidden) {
      handleVisible();
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [settings.backgroundRefresh, settings.enabled, enabled, interval, cacheKey]);

  return isVisible;
}
