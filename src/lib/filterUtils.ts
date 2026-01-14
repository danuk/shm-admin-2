/**
 * Утилиты для работы с фильтрами таблиц
 */

// Поля, которые всегда должны использовать точное совпадение (не LIKE)
const EXACT_MATCH_FIELDS = ['user_id'];

// Поля, которые всегда используют LIKE (независимо от режима)
const ALWAYS_LIKE_FIELDS = ['settings'];

/**
 * Формирует объект фильтров для API запроса
 * @param filters - объект фильтров { key: value }
 * @param filterMode - режим фильтрации ('like' | 'exact')
 * @param externalFilters - внешние фильтры (например, от selectedUser), которые используют exact режим
 */
export function buildApiFilters(
  filters: Record<string, string>,
  filterMode: 'like' | 'exact',
  externalFilters?: Record<string, string>
): Record<string, any> {
  const activeFilters: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;

    // Определяем режим для этого поля
    let filterValue: any;

    // Поля, которые всегда используют LIKE
    if (ALWAYS_LIKE_FIELDS.includes(key)) {
      filterValue = `%${value}%`;
    } else {
      // Определяем, должно ли поле использовать exact режим
      // 1. Если поле в списке EXACT_MATCH_FIELDS и значение совпадает с externalFilters
      // 2. Или если общий режим exact
      const isFromExternalFilter = externalFilters && externalFilters[key] === value;
      const isExactMatchField = EXACT_MATCH_FIELDS.includes(key);
      const useExact = filterMode === 'exact' || (isExactMatchField && isFromExternalFilter);

      filterValue = useExact ? value : { '-like': `%${value}%` };
    }

    // Поддержка вложенных ключей (например, 'event.title')
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = activeFilters;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = filterValue;
    } else {
      activeFilters[key] = filterValue;
    }
  });

  return activeFilters;
}

/**
 * Добавляет параметр filter к URL
 */
export function appendFilterToUrl(url: string, filters: Record<string, any>): string {
  if (Object.keys(filters).length > 0) {
    return url + `&filter=${encodeURIComponent(JSON.stringify(filters))}`;
  }
  return url;
}
