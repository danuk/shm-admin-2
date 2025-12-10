import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { shm_request, normalizeListResponse } from '../lib/shm_request';

interface Identity {
  id: number;
  name: string;
}

interface IdentitiesSelectProps {
  value?: number;
  onChange?: (keyId: number, identity?: Identity) => void;
  className?: string;
  showAddButton?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export default function IdentitiesSelect({
  value,
  onChange,
  className = '',
  showAddButton = false,
  onLoadingChange,
}: IdentitiesSelectProps) {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingIdentity, setLoadingIdentity] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastLoadedIdRef = useRef<number | null>(null);

  const selectedIdentity = identities.find((i) => i.id === value);

  useEffect(() => {
    loadIdentities();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownVisible(false);
      }
    };

    if (dropdownVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownVisible]);

  const loadIdentities = async () => {
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const res = await shm_request('/shm/v1/admin/server/identity?limit=1000');
      const { data } = normalizeListResponse(res);
      setIdentities(data);
    } catch (error) {
      console.error('Failed to load identities:', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  // Загрузка конкретного ключа по ID
  useEffect(() => {
    if (value && lastLoadedIdRef.current !== value) {
      const found = identities.find((i) => i.id === value);
      if (!found && identities.length > 0 && !loading) {
        lastLoadedIdRef.current = value;
        setLoadingIdentity(true);
        shm_request(`/shm/v1/admin/server/identity?id=${value}&limit=1`)
          .then(res => {
            const { data } = normalizeListResponse(res);
            if (data.length > 0) {
              setIdentities(prev => {
                const exists = prev.some(i => i.id === data[0].id);
                return exists ? prev : [...prev, data[0]];
              });
            }
          })
          .catch(err => console.error('Failed to load identity:', err))
          .finally(() => setLoadingIdentity(false));
      } else if (!found && loading) {
        // Если список еще грузится, показываем skeleton
        setLoadingIdentity(true);
      } else if (found) {
        // Ключ найден, убираем skeleton
        setLoadingIdentity(false);
        lastLoadedIdRef.current = value;
      }
    } else if (!value) {
      setLoadingIdentity(false);
      lastLoadedIdRef.current = null;
    }
  }, [value, identities, loading]);

  const handleSelect = (identity: Identity) => {
    if (onChange) {
      onChange(identity.id, identity);
    }
    setDropdownVisible(false);
    setSearchTerm('');
  };

  const filteredIdentities = identities.filter((identity) =>
    identity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(identity.id).includes(searchTerm)
  );

  return (
    <div className={`flex items-center gap-2 w-full ${className}`}>
      <div className="relative flex-1" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownVisible(!dropdownVisible)}
          className="w-full px-3 py-2 text-sm rounded border flex items-center justify-between"
          style={{
            backgroundColor: 'var(--theme-input-bg)',
            borderColor: 'var(--theme-input-border)',
            color: 'var(--theme-input-text)',
          }}
          disabled={loadingIdentity}
        >
          {loadingIdentity ? (
            <div className="flex items-center gap-2 flex-1">
              <div 
                className="h-4 rounded animate-pulse" 
                style={{ 
                  width: '100px',
                  backgroundColor: 'var(--theme-input-border)',
                }} 
              />
            </div>
          ) : (
            <span>
              {selectedIdentity ? `${selectedIdentity.name}` : 'Выберите ключ'}
            </span>
          )}
          <ChevronDown className="w-4 h-4 ml-2" />
        </button>

        {dropdownVisible && (
          <div
            className="absolute z-50 w-full mt-1 rounded border shadow-lg"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            <div className="p-2 border-b" style={{ borderColor: 'var(--theme-card-border)' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск..."
                className="w-full px-3 py-2 text-sm rounded border"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  borderColor: 'var(--theme-input-border)',
                  color: 'var(--theme-input-text)',
                }}
                autoFocus
              />
            </div>
            <div>
              {loading ? (
                <div className="p-4 text-center text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Загрузка...
                </div>
              ) : filteredIdentities.length === 0 ? (
                <div className="p-4 text-center text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Ничего не найдено
                </div>
              ) : (
                filteredIdentities.map((identity) => (
                  <button
                    key={identity.id}
                    type="button"
                    onClick={() => handleSelect(identity)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-opacity-80"
                    style={{
                      backgroundColor: identity.id === value ? 'var(--theme-sidebar-item-active-bg)' : 'transparent',
                      color: identity.id === value ? 'var(--theme-sidebar-text-active)' : 'var(--theme-content-text)',
                    }}
                  >
                    {identity.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showAddButton && (
        <button
          type="button"
          onClick={() => {
            // TODO: Открыть модалку создания ключа
            console.log('Add identity clicked');
          }}
          className="p-2 rounded border shrink-0"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
            borderColor: 'var(--accent-primary)',
          }}
          title="Добавить ключ"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
