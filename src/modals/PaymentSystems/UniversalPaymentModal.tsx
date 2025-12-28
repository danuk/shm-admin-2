import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { shm_request } from '../../lib/shm_request';

export interface PaymentSystem {
  descr: string;
  name: string;
  title: string;
  url_file: string;
  url_form: string;
  url_logo?: string;
  logo?: string;
  price?: number;
}

interface UniversalPaymentModalProps {
  open: boolean;
  onClose: () => void;
  system: PaymentSystem;
}

export const UniversalPaymentModal: React.FC<UniversalPaymentModalProps> = ({ open, onClose, system }) => {
  const [formHtml, setFormHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [existingData, setExistingData] = useState<any>(null);

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  useEffect(() => {
    if (open && system.url_form) {
      loadExistingData();
      loadFormHtml();
    }
  }, [open, system]);

  const loadExistingData = async () => {
    try {
      // Загружаем существующие настройки платежной системы
      const configResponse = await shm_request('shm/v1/admin/config/pay_systems');
      const currentConfig = configResponse.data?.[0] || {};
      
      // Получаем данные для текущей платежной системы
      if (currentConfig[system.name]) {
        setExistingData(currentConfig[system.name]);
      }
    } catch (error) {
      // Не показываем ошибку пользователю, просто оставляем форму пустой
    }
  };

  const loadFormHtml = async () => {
    setLoading(true);
    try {
      // Загружаем форму через прокси на бэкенде, чтобы обойти CORS
      const data = await shm_request(`shm/v1/admin/cloud/paysystems/form?name=${system.url_form}`);
      
      // Бэкенд возвращает HTML в формате {data: [html_string]}
      const html = data.data && data.data[0] ? data.data[0] : '';
      setFormHtml(html);
    } catch (error) {
      toast.error('Не удалось загрузить форму настройки');
      setFormHtml(`
        <div class="text-center p-4">
          <p style="color: var(--theme-content-text-muted);">
            Форма настройки для ${system.title} временно недоступна
          </p>
        </div>
      `);
    } finally {
      setLoading(false);
    }
  };

  // Заполняем форму существующими данными
  useEffect(() => {
    if (!open || loading || !formHtml || !existingData) return;

    const modalContent = document.getElementById('payment-form-container');
    if (modalContent) {
      const form = modalContent.querySelector('form');
      if (form) {
        // Заполняем все поля формы
        Object.keys(existingData).forEach((key) => {
          const value = existingData[key];
          const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement | HTMLSelectElement;
          
          if (input) {
            if (input.type === 'checkbox') {
              (input as HTMLInputElement).checked = value === true || value === 'true';
            } else {
              input.value = value;
            }
          }
        });
      }
    }
  }, [open, loading, formHtml, existingData]);

  useEffect(() => {
    if (!open || loading || !formHtml) return;

    // Обработка кнопки отмены
    const handleCancel = () => {
      onClose();
    };

    // Обработка отправки формы
    const handleFormSubmit = async (e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const formFields: any = {};
      
      formData.forEach((value, key) => {
        formFields[key] = value;
      });

      // Валидация lifetime для wata (10-43200 минут)
      if (system.name === 'wata' && formFields.lifetime) {
        const lifetime = Number(formFields.lifetime);
        if (lifetime < 10 || lifetime > 43200) {
          toast.error('Lifetime должен быть от 10 до 43200 минут');
          return;
        }
      }

      try {
        // Получаем текущие настройки платежных систем
        const configResponse = await shm_request('shm/v1/admin/config/pay_systems');
        const currentConfig = configResponse.data?.[0] || {};

        // Подготовка данных для сохранения
        const systemConfig: any = {
          ...formFields,
          name: formFields.name || system.title,
          show_for_client: formFields.show_for_client === 'true' || formFields.show_for_client === true,
        };

        // Преобразуем числовые поля
        if (formFields.weight) systemConfig.weight = Number(formFields.weight);
        if (formFields.lifetime) systemConfig.lifetime = Number(formFields.lifetime);

        // Добавляем/обновляем настройки для текущей платежной системы
        const updatedConfig = {
          ...currentConfig,
          [system.name]: systemConfig
        };

        // Сохраняем обновленную конфигурацию
        await shm_request('shm/v1/admin/config', {
          method: 'POST',
          body: JSON.stringify({
            key: 'pay_systems',
            value: updatedConfig,
          }),
        });

        toast.success(`Настройки ${system.title} сохранены`);
        onClose();
      } catch (error) {
        toast.error('Ошибка сохранения настроек');
      }
    };

    // Находим форму в загруженном HTML и добавляем обработчики
    const modalContent = document.getElementById('payment-form-container');
    if (modalContent) {
      const form = modalContent.querySelector('form');
      const cancelButton = modalContent.querySelector('button[type="button"]');
      
      if (form) {
        form.addEventListener('submit', handleFormSubmit);
      }
      
      if (cancelButton) {
        cancelButton.addEventListener('click', handleCancel);
      }

      return () => {
        if (form) {
          form.removeEventListener('submit', handleFormSubmit);
        }
        if (cancelButton) {
          cancelButton.removeEventListener('click', handleCancel);
        }
      };
    }
  }, [open, loading, formHtml, system, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={cardStyles}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b sticky top-0 z-10"
             style={{ 
               borderColor: 'var(--theme-card-border)',
               backgroundColor: 'var(--theme-card-bg)'
             }}>
          <h2 className="text-xl font-semibold">{system.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--theme-content-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {system.descr && (
            <p className="text-sm mb-4" style={{ color: 'var(--theme-content-text-muted)' }}>
              {system.descr}
            </p>
          )}

          {system.price && (
            <div className="p-3 rounded mb-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                Стоимость подключения: {system.price} ₽
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2"
                   style={{ borderColor: 'var(--accent-primary)' }}></div>
            </div>
          ) : (
            <div 
              id="payment-form-container"
              dangerouslySetInnerHTML={{ __html: formHtml }}
              style={{
                color: 'var(--theme-content-text)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
