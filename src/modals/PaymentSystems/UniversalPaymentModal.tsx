import React, { useState, useEffect } from 'react';
import { X, Copy, Plus, Trash2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { shm_request } from '../../lib/shm_request';
import DynamicPaymentForm, { PaymentFieldSchema } from '../../components/DynamicPaymentForm';

export interface PaymentSystem {
  name: string;
  title: string;
  description: string;
  infoMessage?: string;
  price?: number;
  paid?: boolean;
  fields: PaymentFieldSchema[];
}

interface UniversalPaymentModalProps {
  open: boolean;
  onClose: () => void;
  system: PaymentSystem;
}

interface CloneInfo {
  key: string;
  name: string;
  index: number;
  data: any;
  fullData?: any;
}

export const UniversalPaymentModal: React.FC<UniversalPaymentModalProps> = ({ open, onClose, system }) => {
  const [loading, setLoading] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'clones'>('main');
  const [clones, setClones] = useState<CloneInfo[]>([]);
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [overrideFields, setOverrideFields] = useState<string[]>([]);
  const [addingFieldsToClone, setAddingFieldsToClone] = useState<string | null>(null);
  const [newFieldsToAdd, setNewFieldsToAdd] = useState<string[]>([]);

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  useEffect(() => {
    if (open) {
      loadExistingData();
    }
  }, [open, system]);

  const loadExistingData = async () => {
    try {
      const configResponse = await shm_request('shm/v1/admin/config/pay_systems');
      const currentConfig = configResponse.data?.[0] || {};

      if (currentConfig[system.name]) {
        setExistingData(currentConfig[system.name]);
      }

      const foundClones: CloneInfo[] = [];
      const clonePattern = new RegExp(`^${system.name}_(\\d+)$`);
      const baseData = currentConfig[system.name] || {};

      Object.keys(currentConfig).forEach(key => {
        const match = key.match(clonePattern);
        if (match) {
          const index = parseInt(match[1], 10);
          const cloneData = currentConfig[key];
          const overriddenData: any = {};
          Object.keys(cloneData).forEach(fieldKey => {
            if (fieldKey === 'paysystem') return;

            if (JSON.stringify(cloneData[fieldKey]) !== JSON.stringify(baseData[fieldKey])) {
              overriddenData[fieldKey] = cloneData[fieldKey];
            }
          });

          foundClones.push({
            key,
            name: `${system.title} (копия ${index})`,
            index,
            data: overriddenData,
            fullData: cloneData
          });
        }
      });

      // Сортируем по индексу
      foundClones.sort((a, b) => a.index - b.index);
      setClones(foundClones);
    } catch (error) {
    }
  };

  const handleFormSubmit = async (formData: Record<string, any>, isClone: boolean = false, cloneKey?: string) => {
    try {
      const systemConfig: any = {
        ...formData,
      };

      if (formData.weight) systemConfig.weight = Number(formData.weight);
      if (formData.lifetime) systemConfig.lifetime = Number(formData.lifetime);

      const saveKey = isClone && cloneKey ? cloneKey : system.name;

      await shm_request('shm/v1/admin/config/pay_systems', {
        method: 'POST',
        body: JSON.stringify({
          [saveKey]: systemConfig
        }),
      });

      toast.success(`Настройки ${isClone ? 'копии ' : ''}${system.title} сохранены`);

      await loadExistingData();

      if (isClone) {
        setShowCloneForm(false);
        setOverrideFields([]);
        setActiveTab('clones');
      } else if (!isClone) {
        onClose();
      }
    } catch (error) {
      toast.error('Ошибка сохранения настроек');
    }
  };

  // Обязательные поля для копии (всегда должны быть выбраны)
  const requiredCloneFields = ['name', 'show_for_client'];

  const handleCreateClone = () => {
    setShowCloneForm(true);
    // Автоматически выбираем обязательные поля
    setOverrideFields([...requiredCloneFields]);
  };

  const handleSaveClone = async (formData: Record<string, any>) => {
    try {
      const maxIndex = clones.length > 0 ? Math.max(...clones.map(c => c.index)) : 0;
      const newIndex = maxIndex + 1;
      const cloneKey = `${system.name}_${newIndex}`;

      const finalData: Record<string, any> = { paysystem: system.name };

      overrideFields.forEach(field => {
        if (formData[field] !== undefined) {
          finalData[field] = formData[field];
        }
      });

      await handleFormSubmit(finalData, true, cloneKey);
    } catch (error) {
      toast.error('Ошибка создания копии');
    }
  };

  const handleDeleteClone = async (cloneKey: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту копию?')) {
      return;
    }

    try {
      await shm_request('shm/v1/admin/config/pay_systems', {
        method: 'POST',
        body: JSON.stringify({
          [cloneKey]: null
        }),
      });

      toast.success('Копия удалена');
      await loadExistingData();
    } catch (error) {
      toast.error('Ошибка удаления копии');
    }
  };

  const handleFieldToggle = (fieldName: string) => {
    // Не даём отключить обязательные поля
    if (requiredCloneFields.includes(fieldName)) {
      return;
    }
    setOverrideFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await shm_request(`shm/v1/admin/cloud/proxy/service/paysystems/order?ps=${system.name}`, {
        method: 'GET',
      });
      toast.success(`Платежная система ${system.title} успешно приобретена`);
      onClose();
      window.location.reload();
    } catch (error: any) {
      const errorMessage = error.data?.error || error.error || 'Ошибка при покупке платежной системы';
      toast.error(errorMessage);
    } finally {
      setPurchasing(false);
    }
  };

  if (!open) return null;

  const renderCloneForm = () => {
    if (!showCloneForm) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
            Создание копии {system.title}
          </h3>
          <button
            onClick={() => {
              setShowCloneForm(false);
              setOverrideFields([]);
            }}
            className="px-3 py-1 rounded text-sm"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
            }}
          >
            Отмена
          </button>
        </div>

        <div className="p-4 rounded border mb-4" style={{ borderColor: 'var(--theme-card-border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
            Выберите поля для переопределения:
          </label>
          <div className="text-xs mb-3" style={{ color: 'var(--theme-content-text-muted)' }}>
            Остальные настройки будут скопированы из основной платежной системы
          </div>
          <div className="space-y-2">
            {system.fields.map(field => (
              <label key={field.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideFields.includes(field.name)}
                  onChange={() => handleFieldToggle(field.name)}
                  className="rounded"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                <span style={{ color: 'var(--theme-content-text)' }}>{field.label}</span>
              </label>
            ))}
          </div>
        </div>

        {overrideFields.length > 0 && (
          <DynamicPaymentForm
            schema={{
              ...system,
              fields: system.fields.filter(f => overrideFields.includes(f.name))
            }}
            existingData={existingData}
            onSubmit={handleSaveClone}
            onCancel={() => {
              setShowCloneForm(false);
              setOverrideFields([]);
            }}
          />
        )}
      </div>
    );
  };

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

        {/* Tabs */}
        {(system.paid || system.price === 0) && (
          <div className="flex border-b" style={{ borderColor: 'var(--theme-card-border)' }}>
            <button
              onClick={() => setActiveTab('main')}
              className="px-6 py-3 font-medium transition-colors"
              style={{
                color: activeTab === 'main' ? 'var(--accent-primary)' : 'var(--theme-content-text-muted)',
                borderBottom: activeTab === 'main' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              Основная
            </button>
            <button
              onClick={() => setActiveTab('clones')}
              className="px-6 py-3 font-medium transition-colors flex items-center gap-2"
              style={{
                color: activeTab === 'clones' ? 'var(--accent-primary)' : 'var(--theme-content-text-muted)',
                borderBottom: activeTab === 'clones' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              <Copy className="w-4 h-4" />
              Копии {clones.length > 0 && `(${clones.length})`}
            </button>
          </div>
        )}

        <div className="p-6">
          {system.description && activeTab === 'main' && (
            <p className="text-sm mb-4" style={{ color: 'var(--theme-content-text-muted)' }}>
              {system.description}
            </p>
          )}

          {!system.paid && system.price && system.price > 0 ? (
            <div className="p-3 rounded mb-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                Стоимость подключения: {system.price} ₽
              </p>
            </div>
          ) : undefined}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2"
                   style={{ borderColor: 'var(--accent-primary)' }}></div>
            </div>
          ) : !system.paid && system.price !== 0 ? (
            <div className="text-center">
              <p className="mb-6" style={{ color: 'var(--theme-content-text-muted)' }}>
                Для настройки платежной системы необходимо сначала её приобрести
              </p>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="px-6 py-3 rounded-lg font-medium transition-opacity disabled:opacity-50 btn-success"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-text)',
                }}
              >
                {purchasing ? 'Покупка...' : 'Купить'}
              </button>
            </div>
          ) : activeTab === 'main' && system.fields ? (
            <DynamicPaymentForm
              schema={{
                name: system.name,
                title: system.title,
                description: system.description,
                infoMessage: system.infoMessage,
                fields: system.fields
              }}
              existingData={existingData}
              onSubmit={(data) => handleFormSubmit(data, false)}
              onCancel={onClose}
            />
          ) : activeTab === 'clones' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                  Копии платежной системы
                </h3>
                {!showCloneForm && (
                  <button
                    onClick={handleCreateClone}
                    className="px-4 py-2 rounded flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Создать копию
                  </button>
                )}
              </div>

              {showCloneForm ? (
                renderCloneForm()
              ) : clones.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--theme-content-text-muted)' }}>
                  <Copy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Копий пока нет</p>
                  <p className="text-sm mt-1">Создайте копию для использования нескольких конфигураций</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clones.map(clone => {
                    // Показываем только поля, которые есть в копии (кроме paysystem)
                    const cloneFieldNames = Object.keys(clone.fullData || {}).filter(k => k !== 'paysystem');
                    const fieldsToShow = system.fields.filter(f => cloneFieldNames.includes(f.name));
                    // Поля, которые можно добавить (которых еще нет в копии)
                    const availableFieldsToAdd = system.fields.filter(f => !cloneFieldNames.includes(f.name));
                    const isAddingFields = addingFieldsToClone === clone.key;

                    return (
                      <div
                        key={clone.key}
                        className="p-4 rounded border"
                        style={{
                          borderColor: 'var(--theme-card-border)',
                          backgroundColor: 'var(--theme-input-bg)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                            {clone.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {availableFieldsToAdd.length > 0 && !isAddingFields && (
                              <button
                                onClick={() => {
                                  setAddingFieldsToClone(clone.key);
                                  setNewFieldsToAdd([]);
                                }}
                                className="p-2 rounded hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--accent-primary)' }}
                                title="Добавить поле"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteClone(clone.key)}
                              className="p-2 rounded hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--accent-danger)' }}
                              title="Удалить копию"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Форма добавления новых полей */}
                        {isAddingFields && (
                          <div className="p-3 mb-4 rounded border" style={{ borderColor: 'var(--theme-card-border)' }}>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                              Выберите поля для добавления:
                            </label>
                            <div className="space-y-2 mb-3">
                              {availableFieldsToAdd.map(field => (
                                <label key={field.name} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newFieldsToAdd.includes(field.name)}
                                    onChange={() => {
                                      setNewFieldsToAdd(prev =>
                                        prev.includes(field.name)
                                          ? prev.filter(f => f !== field.name)
                                          : [...prev, field.name]
                                      );
                                    }}
                                    className="rounded"
                                    style={{ accentColor: 'var(--accent-primary)' }}
                                  />
                                  <span style={{ color: 'var(--theme-content-text)' }}>{field.label}</span>
                                </label>
                              ))}
                            </div>

                            {newFieldsToAdd.length > 0 && (
                              <DynamicPaymentForm
                                schema={{
                                  name: clone.key,
                                  title: 'Новые поля',
                                  fields: system.fields.filter(f => newFieldsToAdd.includes(f.name))
                                }}
                                existingData={existingData}
                                onSubmit={(data) => {
                                  // Объединяем существующие поля копии с новыми
                                  const updatedCloneData: Record<string, any> = {
                                    ...clone.fullData,
                                    paysystem: system.name
                                  };

                                  newFieldsToAdd.forEach(fieldName => {
                                    if (data[fieldName] !== undefined) {
                                      updatedCloneData[fieldName] = data[fieldName];
                                    }
                                  });

                                  handleFormSubmit(updatedCloneData, true, clone.key);
                                  setAddingFieldsToClone(null);
                                  setNewFieldsToAdd([]);
                                }}
                                onCancel={() => {
                                  setAddingFieldsToClone(null);
                                  setNewFieldsToAdd([]);
                                }}
                              />
                            )}

                            {newFieldsToAdd.length === 0 && (
                              <button
                                onClick={() => {
                                  setAddingFieldsToClone(null);
                                  setNewFieldsToAdd([]);
                                }}
                                className="px-3 py-1 rounded text-sm"
                                style={{
                                  backgroundColor: 'var(--theme-button-secondary-bg)',
                                  color: 'var(--theme-button-secondary-text)',
                                }}
                              >
                                Отмена
                              </button>
                            )}
                          </div>
                        )}

                        {fieldsToShow.length > 0 ? (
                          <DynamicPaymentForm
                            schema={{
                              name: clone.key,
                              title: clone.name,
                              fields: fieldsToShow
                            }}
                            existingData={clone.fullData}
                            onSubmit={(data) => {
                              // Сохраняем только те поля что в форме + paysystem
                              const updatedCloneData: Record<string, any> = { paysystem: system.name };

                              fieldsToShow.forEach(field => {
                                if (data[field.name] !== undefined) {
                                  updatedCloneData[field.name] = data[field.name];
                                }
                              });

                              handleFormSubmit(updatedCloneData, true, clone.key);
                            }}
                            onCancel={() => {}}
                          />
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                            Нет переопределенных полей
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-4">
              <p style={{ color: 'var(--theme-content-text-muted)' }}>
                Схема настройки для {system.title} временно недоступна
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
