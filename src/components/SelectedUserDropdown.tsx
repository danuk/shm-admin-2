import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  ChevronDown, 
  UserCircle, 
  Package, 
  CreditCard, 
  Gift, 
  TrendingDown,
  FileText,
  Database,
  X 
} from 'lucide-react';
import { useSelectedUserStore } from '../store/selectedUserStore';
import { shm_request } from '../lib/shm_request';
import { UserModal } from '../modals';

export default function SelectedUserDropdown() {
  const { selectedUser, clearSelectedUser } = useSelectedUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!selectedUser) {
    return null;
  }

  const menuItems = [
    {
      icon: UserCircle,
      label: 'Профиль',
      onClick: () => {
        setUserModalOpen(true);
        setIsOpen(false);
      }
    },
    {
      icon: Package,
      label: 'Услуги',
      onClick: () => {
        navigate('/user-services');
        setIsOpen(false);
      }
    },
    {
      icon: CreditCard,
      label: 'Платежи',
      onClick: () => {
        navigate('/pays');
        setIsOpen(false);
      }
    },
    {
      icon: Gift,
      label: 'Бонусы',
      onClick: () => {
        navigate('/bonuses');
        setIsOpen(false);
      }
    },
    {
      icon: TrendingDown,
      label: 'Списания',
      onClick: () => {
        navigate('/withdraws');
        setIsOpen(false);
      }
    },
    {
      icon: FileText,
      label: 'Персональные данные',
      onClick: () => {
        navigate('/profiles');
        setIsOpen(false);
      }
    },
    {
      icon: Database,
      label: 'Хранилище',
      onClick: () => {
        navigate('/storage');
        setIsOpen(false);
      }
    },
  ];

  const displayName = selectedUser.login || selectedUser.full_name || selectedUser.email || selectedUser.name || `ID: ${selectedUser.user_id}`;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded transition-colors"
          style={{
            backgroundColor: isOpen ? 'var(--theme-button-secondary-bg)' : 'transparent',
            color: 'var(--theme-header-text)',
          }}
          title="Выбранный пользователь"
        >
          <User className="w-4 h-4" />
          <span className="text-sm font-medium max-w-[150px] truncate">
            {displayName}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <div
              className="absolute left-0 top-full mt-1 w-56 rounded shadow-lg z-50 py-1"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                border: '1px solid var(--theme-card-border)',
              }}
            >
              {}
              <div 
                className="px-4 py-2 border-b"
                style={{
                  borderColor: 'var(--theme-border)',
                }}
              >
                <div className="text-sm font-medium" style={{ color: 'var(--theme-content-text)' }}>
                  {displayName}
                </div>
                <div className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                  ID: {selectedUser.user_id}
                </div>
              </div>

              {}
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors"
                    style={{
                      color: 'var(--theme-content-text)',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-hover-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}

              {}
              <div 
                className="border-t mt-1 pt-1"
                style={{
                  borderColor: 'var(--theme-border)',
                }}
              >
                <button
                  onClick={() => {
                    clearSelectedUser();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors"
                  style={{
                    color: 'var(--theme-button-danger-text)',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm">Закрыть</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {}
      <UserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        data={selectedUser}
        onSave={async () => {
          setUserModalOpen(false);
        }}
        onRefresh={async () => {
          if (selectedUser?.user_id) {
            const userData = await shm_request(`/shm/v1/admin/user?user_id=${selectedUser.user_id}`);
            if (userData.user) {
              const { setSelectedUser } = useSelectedUserStore.getState();
              setSelectedUser(userData.user);
            }
          }
        }}
      />
    </>
  );
}
