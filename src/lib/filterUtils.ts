// Поля, которые всегда используют LIKE (независимо от режима)
const ALWAYS_LIKE_FIELDS = ['settings'];

// Поля, которые используют exact при выбранном пользователе
const EXACT_WHEN_USER_SELECTED = ['user_id'];

export function buildApiFilters(
  filters: Record<string, string>,
  filterMode: 'like' | 'exact',
  selectedUserId?: number | null,
): Record<string, any> {
  const activeFilters: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;

    let filterValue: any;

    if (ALWAYS_LIKE_FIELDS.includes(key)) {
      filterValue = { '-like': `%${value}%` };
    } else if (EXACT_WHEN_USER_SELECTED.includes(key) && selectedUserId) {
      filterValue = value;
    } else {
      filterValue = filterMode === 'exact' ? value : { '-like': `%${value}%` };
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

export function appendFilterToUrl(url: string, filters: Record<string, any>): string {
  if (Object.keys(filters).length > 0) {
    return url + `&filter=${encodeURIComponent(JSON.stringify(filters))}`;
  }
  return url;
}
