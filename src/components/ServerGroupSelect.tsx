import React, { useState, useEffect, useRef } from 'react';
import { shm_request } from '../lib/shm_request';
import { Plus } from 'lucide-react';

interface ServerGroup {
  group_id: number;
  name: string;
  server_gid?: number;
  transport?: string;
  type?: string;
  settings?: any;
}

interface ServerGroupSelectProps {
  value?: number | null;
  onChange?: (groupId: number | null, group: ServerGroup | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  className?: string;
  disabled?: boolean;
  /** Показывать кнопку "Добавить группу" */
  showAddButton?: boolean;
}

/**
 * Компонент выбора группы серверов
 */
export default function ServerGroupSelect({
  value,
  onChange,
  onLoadingChange,
  className = '',
  disabled = false,
  showAddButton = false,
}: ServerGroupSelectProps) {
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const lastLoadedIdRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    onLoadingChange?.(true);

    shm_request('/shm/v1/admin/server/group')
      .then((res) => {
        const data = res.data || res;
        const serverGroups = Array.isArray(data) ? data : [];
        
        // Добавляем AUTO группу в начало
        const autoGroup: ServerGroup = {
          group_id: 0,
          name: '<AUTO> - на том же сервере, на котором услуга была создана',
          server_gid: 0,
        };
        
        setGroups([autoGroup, ...serverGroups]);
      })
      .catch((err) => {
        console.error('Ошибка загрузки групп серверов:', err);
        setGroups([]);
      })
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, [onLoadingChange]);

  // Загрузка конкретной группы по ID
  useEffect(() => {
    if (value !== undefined && value !== null && lastLoadedIdRef.current !== value) {
      const found = groups.find((g) => g.group_id === value);
      if (!found && groups.length > 0 && !loading && value !== 0) {
        lastLoadedIdRef.current = value;
        setLoadingGroup(true);
        shm_request(`/shm/v1/admin/server/group?group_id=${value}&limit=1`)
          .then(res => {
            const data = res.data || res;
            const serverGroups = Array.isArray(data) ? data : [];
            if (serverGroups.length > 0) {
              setGroups(prev => {
                const exists = prev.some(g => g.group_id === serverGroups[0].group_id);
                return exists ? prev : [...prev, serverGroups[0]];
              });
            }
          })
          .catch(err => console.error('Failed to load group:', err))
          .finally(() => setLoadingGroup(false));
      } else if (!found && loading) {
        // Если список еще грузится, показываем skeleton
        setLoadingGroup(true);
      } else if (found || value === 0) {
        // Группа найдена или это AUTO, убираем skeleton
        setLoadingGroup(false);
        lastLoadedIdRef.current = value;
      }
    } else if (value === undefined || value === null) {
      setLoadingGroup(false);
      lastLoadedIdRef.current = null;
    }
  }, [value, groups, loading]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value ? Number(e.target.value) : null;
    const group = groups.find((g) => g.group_id === groupId) || null;
    onChange?.(groupId, group);
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  if (showAddButton) {
    return (
      <div className="flex gap-2 w-full">
        {loadingGroup ? (
          <div 
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <div className="flex items-center gap-2">
              <div 
                className="h-4 rounded animate-pulse" 
                style={{ 
                  width: '100px',
                  backgroundColor: 'var(--theme-input-border)',
                }} 
              />
            </div>
          </div>
        ) : (
          <select
            value={value ?? ''}
            onChange={handleChange}
            disabled={disabled || loading}
            className={`flex-1 px-3 py-2 text-sm rounded border ${className}`}
            style={inputStyles}
          >
            <option value="">Выберите группу серверов</option>
            {groups.map((group) => (
              <option key={group.group_id} value={group.group_id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="p-2 rounded hover:bg-opacity-80 transition-colors"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
          title="Добавить группу серверов"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (loadingGroup) {
    return (
      <div 
        className={`px-3 py-2 text-sm rounded border ${className}`}
        style={inputStyles}
      >
        <div className="flex items-center gap-2">
          <div 
            className="h-4 rounded animate-pulse" 
            style={{ 
              width: '60px',
              backgroundColor: 'var(--theme-input-border)',
            }} 
          />
          <div 
            className="h-4 rounded animate-pulse flex-1" 
            style={{ 
              maxWidth: '150px',
              backgroundColor: 'var(--theme-input-border)',
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled || loading}
      className={`px-3 py-2 text-sm rounded border ${className}`}
      style={inputStyles}
    >
      <option value="">Выберите группу серверов</option>
      {groups.map((group) => (
        <option key={group.group_id} value={group.group_id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}
