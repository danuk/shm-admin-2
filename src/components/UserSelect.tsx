import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User as UserIcon } from 'lucide-react';
import { shm_request } from '../lib/shm_request';
import { UserModal } from '../modals';

interface User {
  user_id: number;
  login: string;
  full_name?: string;
  [key: string]: any;
}

interface UserSelectProps {
  value?: number | null;
  onChange?: (userId: number | null, user: User | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  onUserUpdated?: () => void;
  readonly?: boolean;
  placeholder?: string;
  className?: string;
}

export default function UserSelect({
  value,
  onChange,
  onLoadingChange,
  onUserUpdated,
  readonly = false,
  placeholder = '... начните вводить имя, логин или id пользователя',
  className = '',
}: UserSelectProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<User[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadedUserIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatUser = (user: User) => {
    return `${user.user_id}# (${user.login}) ${user.full_name || ''}`.trim();
  };

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (value && lastLoadedUserIdRef.current !== value) {
      lastLoadedUserIdRef.current = value;
      abortControllerRef.current = new AbortController();
      setLoadingUser(true);
      
      shm_request(`/shm/v1/admin/user?user_id=${value}&limit=1`)
        .then(res => {
          const data = res.data || res;
          const users = Array.isArray(data) ? data : [];
          if (users.length > 0) {
            setSelectedUser(users[0]);
            setSearch(formatUser(users[0]));
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
          }
        })
        .finally(() => setLoadingUser(false));
    } else if (!value) {
      lastLoadedUserIdRef.current = null;
      setSelectedUser(null);
      setSearch('');
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value]);

  useEffect(() => {
    onLoadingChange?.(loadingUser);
  }, [loadingUser, onLoadingChange]);

  const handleOpenUserModal = () => {
    if (selectedUser) {
      setUserModalOpen(true);
    }
  };

  const handleSaveUser = async (userData: Record<string, any>) => {
    await shm_request('/shm/v1/admin/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (value) {
      lastLoadedUserIdRef.current = null; 
      const res = await shm_request(`/shm/v1/admin/user?user_id=${value}&limit=1`);
      const data = res.data || res;
      const users = Array.isArray(data) ? data : [];
      if (users.length > 0) {
        setSelectedUser(users[0]);
        setSearch(formatUser(users[0]));
      }
    }
    onUserUpdated?.();
  };
  
  const searchUsers = useCallback((query: string) => {
    if (!query || query.length < 1) {
      setItems([]);
      setDropdownVisible(false);
      return;
    }

    setLoading(true);
    
    const filter = {
      block: 0,
      '-or': [
        { 'full_name': { '-like': `%${query}%` } },
        { 'login': { '-like': `%${query}%` } },
        { 'user_id': query },
      ],
    };

    shm_request(`/shm/v1/admin/user?limit=20&filter=${encodeURIComponent(JSON.stringify(filter))}`)
      .then(res => {
        const data = res.data || res;
        const users = Array.isArray(data) ? data : [];
        setItems(users);
        setDropdownVisible(users.length > 0);
        setSelectedIndex(users.length > 0 ? 0 : -1);
      })
      .catch(() => {
        setItems([]);
        setDropdownVisible(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setDropdownVisible(!!newValue);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(newValue);
    }, 300);
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setSearch(formatUser(user));
    setDropdownVisible(false);
    setItems([]);
    onChange?.(user.user_id, user);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownVisible || !items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        selectUser(items[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setDropdownVisible(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const dropdownStyles = {
    backgroundColor: 'var(--theme-content-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-content-text)',
  };

  if (readonly) {
    if (loadingUser) {
      return (
        <div 
          className={`w-full px-3 py-2 text-sm rounded border ${className}`}
          style={inputStyles}
        >
          <div className="flex items-center gap-2">
            <div 
              className="h-4 rounded animate-pulse" 
              style={{ 
                width: '40px',
                backgroundColor: 'var(--theme-input-border)',
              }} 
            />
            <div 
              className="h-4 rounded animate-pulse" 
              style={{ 
                width: '80px',
                backgroundColor: 'var(--theme-input-border)',
              }} 
            />
            <div 
              className="h-4 rounded animate-pulse flex-1" 
              style={{ 
                maxWidth: '120px',
                backgroundColor: 'var(--theme-input-border)',
              }} 
            />
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={selectedUser ? formatUser(selectedUser) : (value ? `#${value}` : '')}
            readOnly
            className={`flex-1 px-3 py-2 text-sm rounded border opacity-60 ${className}`}
            style={inputStyles}
          />
          {selectedUser && (
            <button
              type="button"
              onClick={handleOpenUserModal}
              className="p-2 rounded border hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                borderColor: 'var(--theme-button-secondary-border)',
                color: 'var(--theme-button-secondary-text)',
              }}
              title="Редактировать пользователя"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {selectedUser && (
          <UserModal
            open={userModalOpen}
            onClose={() => setUserModalOpen(false)}
            data={selectedUser}
            onSave={handleSaveUser}
            onRefresh={async () => {
              if (value) {
                lastLoadedUserIdRef.current = null; 
                const res = await shm_request(`/shm/v1/admin/user?user_id=${value}&limit=1`);
                const data = res.data || res;
                const users = Array.isArray(data) ? data : [];
                if (users.length > 0) {
                  setSelectedUser(users[0]);
                  setSearch(formatUser(users[0]));
                }
              }
              onUserUpdated?.();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={handleSearchChange}
        onFocus={() => items.length > 0 && setDropdownVisible(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-3 py-2 text-sm rounded border"
        style={inputStyles}
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: 'var(--theme-input-border)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {dropdownVisible && items.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 rounded border shadow-lg max-h-60 overflow-auto"
          style={dropdownStyles}
        >
          {items.map((item, index) => (
            <li
              key={item.user_id}
              onClick={() => selectUser(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                index === selectedIndex ? 'bg-opacity-20' : ''
              }`}
              style={{
                backgroundColor: index === selectedIndex ? 'var(--accent-primary)' : 'transparent',
                color: index === selectedIndex ? 'var(--accent-text)' : 'inherit',
              }}
            >
              {formatUser(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
