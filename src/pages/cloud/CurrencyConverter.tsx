import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, RefreshCw, ArrowLeft, Save, Undo2 } from 'lucide-react';
import { shm_request } from '../../lib/shm_request';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export interface Currency {
  code?: string;
  currency: string;
  id?: string;
  name: string;
  nominal: number;
  nominal_value: number;
  updated: string;
  value: number;
  addition_type?: 'fixed' | 'numeric' | 'percent' | '';
  addition_value?: number;
}

export interface CurrenciesResponse {
  data: [{
    [key: string]: Currency;
  }];
  status: number;
}

export interface CurrencyUpdate {
  currencies: {
    [currencyCode: string]: {
      addition_type?: 'fixed' | 'numeric' | 'percent' | '';
      addition_value?: number;
    };
  };
}


interface CurrencyWithChanges extends Currency {
  hasChanges?: boolean;
  originalAdditionType?: '' | 'fixed' | 'numeric' | 'percent';
  originalAdditionValue?: number;
}

function CurrencyConverter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyWithChanges[]>([]);
  const [error, setError] = useState<any>();

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async (forceUpdate = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = forceUpdate
        ? 'shm/v1/admin/cloud/currencies?no_cache=1'
        : 'shm/v1/admin/cloud/currencies';

      const response = await shm_request(url) as CurrenciesResponse;

      if (response.data && response.data[0]) {
        const currenciesData = response.data[0];
        const currenciesArray = Object.values(currenciesData).map((curr): CurrencyWithChanges => ({
          ...curr,
          addition_type: (curr.addition_type || '') as '' | 'fixed' | 'numeric' | 'percent',
          addition_value: curr.addition_value || 0,
          originalAdditionType: (curr.addition_type || '') as '' | 'fixed' | 'numeric' | 'percent',
          originalAdditionValue: curr.addition_value || 0,
          hasChanges: false,
        }));

        setCurrencies(currenciesArray);

        if (forceUpdate) {
          toast.success('Курсы валют обновлены');
        }
      }
    } catch (err: any) {
      let errorMessage = 'Ошибка загрузки валют';
      try {
        const parsed = JSON.parse(err.message);
        errorMessage = parsed.error || errorMessage;
      } catch {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyName = (currency: Currency) => {
    if (!currency.name) return currency.currency;

    // Убираем числительные формы из названий
    const name = currency.name
      .replace(/ых|их|ов|ы|и|а$/g, '')
      .trim();

    return `${name} (${currency.currency})`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateFinalRate = (currency: CurrencyWithChanges): number => {
    const baseRate = currency.value;

    if (!currency.addition_type) {
      return baseRate;
    }

    switch (currency.addition_type) {
      case 'fixed':
        return currency.addition_value || 0;
      case 'numeric':
        return baseRate + (currency.addition_value || 0);
      case 'percent':
        return baseRate * (1 + (currency.addition_value || 0) / 100);
      default:
        return baseRate;
    }
  };

  const onModifierTypeChange = (currency: CurrencyWithChanges, newType: string) => {
    setCurrencies((prev) =>
      prev.map((c) => {
        if (c.currency === currency.currency) {
          const typedNewType = newType as '' | 'fixed' | 'numeric' | 'percent';
          const hasChanges =
            typedNewType !== c.originalAdditionType ||
            c.addition_value !== c.originalAdditionValue;

          return {
            ...c,
            addition_type: typedNewType,
            hasChanges,
          };
        }
        return c;
      })
    );
  };

  const onValueChange = (currency: CurrencyWithChanges, newValue: number) => {
    setCurrencies((prev) =>
      prev.map((c) => {
        if (c.currency === currency.currency) {
          const hasChanges =
            c.addition_type !== c.originalAdditionType ||
            newValue !== c.originalAdditionValue;

          return {
            ...c,
            addition_value: newValue,
            hasChanges,
          };
        }
        return c;
      })
    );
  };

  const isValueFieldEnabled = (currency: CurrencyWithChanges): boolean => {
    return !!currency.addition_type;
  };

  const saveCurrencySettings = async (currency: CurrencyWithChanges) => {
    try {
      const updateData: CurrencyUpdate = {
        currencies: {
          [currency.currency]: {
            addition_type: currency.addition_type || '',
            addition_value: currency.addition_value || 0,
          },
        },
      };

      await shm_request('shm/v1/admin/cloud/currencies', {
        method: 'POST',
        body: JSON.stringify(updateData),
      });

      setCurrencies((prev) =>
        prev.map((c) => {
          if (c.currency === currency.currency) {
            return {
              ...c,
              originalAdditionType: c.addition_type,
              originalAdditionValue: c.addition_value,
              hasChanges: false,
            };
          }
          return c;
        })
      );

      toast.success(`Настройки для ${currency.currency} сохранены`);
    } catch (err: any) {
      toast.error(`Ошибка сохранения: ${err.message || 'Неизвестная ошибка'}`);
    }
  };

  const cancelChanges = (currency: CurrencyWithChanges) => {
    setCurrencies((prev) =>
      prev.map((c) => {
        if (c.currency === currency.currency) {
          return {
            ...c,
            addition_type: (c.originalAdditionType || '') as '' | 'fixed' | 'numeric' | 'percent',
            addition_value: c.originalAdditionValue,
            hasChanges: false,
          };
        }
        return c;
      })
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--accent-primary)' }}
          ></div>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>Загрузка валют...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold flex items-center gap-3"
            style={{ color: 'var(--theme-content-text)' }}
          >
            <TrendingUp className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
            Конвертер валют
          </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded flex items-center gap-2"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
        </div>

        <div
          className="rounded-lg border p-6"
          style={{ ...cardStyles, borderColor: 'var(--accent-danger)' }}
        >
          <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
          <button
            onClick={() => loadCurrencies()}
            className="mt-4 px-4 py-2 rounded flex items-center gap-2"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-text)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold flex items-center gap-3"
          style={{ color: 'var(--theme-content-text)' }}
        >
          <TrendingUp className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
          Конвертер валют
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => loadCurrencies(true)}
            className="px-4 py-2 rounded flex items-center gap-2"
            style={{
              backgroundColor: 'var(--accent-success)',
              color: 'white',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
          <Link
            to="/cloud"
            className="px-4 py-2 rounded flex items-center gap-2"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Link>
        </div>
      </div>

      {currencies.length === 0 ? (
        <div className="rounded-lg border p-6" style={cardStyles}>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>Валюты не найдены</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={cardStyles}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--theme-input-bg)' }}>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Валюта
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Код
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Базовый курс
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Номинал
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Модификатор
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Значение
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Итоговый курс
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Обновлено
                  </th>
                  <th
                    className="px-4 py-3 text-center text-sm font-semibold"
                    style={{ color: 'var(--theme-content-text)' }}
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency) => (
                  <tr
                    key={currency.currency}
                    className="border-t"
                    style={{ borderColor: 'var(--theme-card-border)' }}
                  >
                    <td
                      className="px-4 py-3 text-left font-medium"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      {formatCurrencyName(currency)}
                    </td>
                    <td
                      className="px-4 py-3 text-center font-semibold"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {currency.currency}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      {currency.value.toFixed(4)}
                    </td>
                    <td
                      className="px-4 py-3 text-center font-semibold"
                      style={{ color: 'var(--theme-content-text)' }}
                    >
                      {currency.nominal}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={currency.addition_type || ''}
                        onChange={(e) => onModifierTypeChange(currency, e.target.value)}
                        className="px-3 py-1.5 rounded border text-sm w-full max-w-[200px]"
                        style={inputStyles}
                      >
                        <option value="">Нет</option>
                        <option value="fixed">Фиксированное значение</option>
                        <option value="numeric">Числовая надбавка</option>
                        <option value="percent">Процентная надбавка</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={currency.addition_value || 0}
                          onChange={(e) => onValueChange(currency, parseFloat(e.target.value) || 0)}
                          disabled={!isValueFieldEnabled(currency)}
                          className="px-3 py-1.5 rounded border text-sm w-24"
                          style={inputStyles}
                          step="0.01"
                        />
                        {currency.addition_type === 'percent' && (
                          <span style={{ color: 'var(--theme-content-text-muted)' }}>%</span>
                        )}
                        {(currency.addition_type === 'numeric' || currency.addition_type === 'fixed') && (
                          <span style={{ color: 'var(--theme-content-text-muted)' }}>₽</span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-center font-bold"
                      style={{ color: 'var(--accent-success)' }}
                    >
                      {calculateFinalRate(currency).toFixed(4)}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm"
                      style={{ color: 'var(--theme-content-text-muted)' }}
                    >
                      {formatDate(currency.updated)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {currency.hasChanges ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveCurrencySettings(currency)}
                            className="p-1.5 rounded hover:opacity-80"
                            style={{
                              backgroundColor: 'var(--accent-success)',
                              color: 'white',
                            }}
                            title="Сохранить настройки"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cancelChanges(currency)}
                            className="p-1.5 rounded hover:opacity-80"
                            style={{
                              backgroundColor: 'var(--theme-button-secondary-bg)',
                              color: 'var(--theme-button-secondary-text)',
                            }}
                            title="Отменить изменения"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="text-sm"
                          style={{ color: 'var(--theme-content-text-muted)' }}
                        >
                          ✓ Сохранено
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CurrencyConverter;
