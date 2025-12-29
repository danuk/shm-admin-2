import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, CheckCircle, XCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { shm_request } from '../lib/shm_request';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export interface SubscriptionInfo {
  auto_renewal: boolean;
  expire: string;
  next: number;
  period: number;
  price: number;
  service_id: number;
  status: string;
  tg_url?: string;
}

export interface SubscriptionPlan {
  name: string;
  next?: number;
  period: number;
  price: number;
  price_next?: number;
  service_id: number;
}

function Subscription() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [orderingSubscription, setOrderingSubscription] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-content-text)',
  };

  useEffect(() => {
    loadSubscriptionInfo();
    loadSubscriptionPlans();

    // Очистка интервала при размонтировании компонента
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Эффект для автоматического обновления в зависимости от статуса
  useEffect(() => {
    // Очищаем предыдущий интервал
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (subscriptionInfo && subscriptionInfo.status === 'PROGRESS') {
      // Обновляем каждую секунду для статуса "В процессе"
      pollingIntervalRef.current = setInterval(() => {
        loadSubscriptionInfo(true); // Передаем флаг фонового обновления
      }, 1000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [subscriptionInfo?.status]);

  const loadSubscriptionInfo = async (isBackgroundUpdate = false) => {
    // Показываем загрузку только если это не фоновое обновление
    if (!isBackgroundUpdate) {
      setLoading(true);
    }

    try {
      const response = await shm_request('shm/v1/admin/cloud/proxy/service/sub/get');
      console.log('Subscription response:', response);

      // Проверяем, есть ли ошибка в ответе
      if (response.error) {
        console.log('Response has error:', response.error, 'status:', response.status);
        // Если ошибка с кодом 404 (подписка не найдена), показываем форму без ошибки
        if (response.status === 404 || response.status === '404') {
          setShowSubscriptionForm(true);
          setSubscriptionInfo(null);
          setSubscriptionError('');
        } else {
          // Для других ошибок показываем сообщение
          setSubscriptionError(response.error);
        }
      } else {
        // Успешный ответ
        const data = response.data || response;
        setSubscriptionInfo(data);
        setShowSubscriptionForm(false);

        // Если статус стал ACTIVE, показываем уведомление только при фоновом обновлении
        if (isBackgroundUpdate && data.status === 'ACTIVE' && subscriptionInfo?.status !== 'ACTIVE') {
          toast.success('Подписка успешно активирована!');
        }
      }
    } catch (error: any) {
      console.error('Subscription loading exception:', error);

      // Парсим JSON из текста ошибки
      try {
        const errorText = error.message || String(error);
        const errorData = JSON.parse(errorText);

        // Если это 404 (подписка не найдена), показываем форму без ошибки
        if (errorData.status === 404 || errorData.status === '404') {
          setShowSubscriptionForm(true);
          setSubscriptionInfo(null);
          setSubscriptionError('');
        } else {
          setSubscriptionError(errorData.error || 'Ошибка загрузки информации о подписке');
        }
      } catch {
        // Если не удалось распарсить, показываем общую ошибку
        setSubscriptionError('Ошибка загрузки информации о подписке');
      }
    } finally {
      if (!isBackgroundUpdate) {
        setLoading(false);
      }
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const response = await shm_request('shm/v1/admin/cloud/proxy/service/sub/list');
      const plans = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
      setSubscriptionPlans(plans);
    } catch (error) {
    }
  };

  const orderSubscription = async (serviceId: number) => {
    if (!serviceId) {
      return;
    }

    setOrderingSubscription(true);
    setSubscriptionError('');

    try {
      const response = await shm_request('shm/v1/admin/cloud/proxy/service/sub/reg', {
        method: 'POST',
        body: JSON.stringify({ service_id: serviceId }),
      });

      if (response.status === 200 || response) {
        if (response.error || response.data?.error) {
          const errorMsg = response.error || response.data.error;
          setSubscriptionError(errorMsg);
          toast.error(errorMsg);
        } else {
          toast.success('Подписка успешно оформлена');
          // Начинаем опрашивать статус
          await loadSubscriptionInfo();
        }
      }
    } catch (error: any) {
      const errorData = error.data || error.response?.data || {};
      let errorMessage = errorData.error || 'Ошибка оформления подписки';

      if (errorData.error === 'insufficient money') {
        errorMessage = 'Недостаточно средств на балансе для оформления подписки. Необходимо пополнить баланс, после чего повторить заказ услуги.';
      }

      setSubscriptionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setOrderingSubscription(false);
    }
  };

  const updateRenewalPeriod = async (serviceId: number) => {
    try {
      await shm_request('shm/v1/admin/cloud/proxy/service/sub/renewal', {
        method: 'POST',
        body: JSON.stringify({ service_id: serviceId }),
      });
      toast.success('Период продления обновлен');
        loadSubscriptionInfo();
        loadSubscriptionPlans();
    } catch (error) {
      toast.error('Ошибка обновления периода продления');
    }
  };

  // Функция для перевода статусов
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'ACTIVE': 'Активно',
      'PROGRESS': 'В процессе',
      'NOT PAID': 'Не оплачено',
    };
    return statusMap[status] || status;
  };

  // Функция для получения цвета статуса
  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'var(--accent-success)';
    if (status === 'PROGRESS') return 'var(--accent-warning)';
    if (status === 'NOT PAID') return 'var(--accent-primary)';
    return 'var(--theme-content-text-muted)';
  };

  // Функция для получения иконки статуса
  const getStatusIcon = (status: string) => {
    if (status === 'ACTIVE') {
      return <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />;
    }
    if (status === 'PROGRESS') {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--accent-warning)' }}></div>;
    }
    return <XCircle className="w-4 h-4" style={{ color: 'var(--accent-danger)' }} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
               style={{ borderColor: 'var(--accent-primary)' }}></div>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>Загрузка...</p>
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
          <CreditCard className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
          Подписка
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

      {/* Информация о преимуществах подписки */}
      <div className="rounded-lg border p-6 mb-6" style={{...cardStyles, borderColor: 'var(--accent-info)'}}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
          Преимущества подписки
        </h3>
        <p className="mb-3" style={{ color: 'var(--theme-content-text)' }}>
          Приобретая подписку Вы получаете:
        </p>
        <ul className="space-y-2" style={{ color: 'var(--theme-content-text-muted)' }}>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-success)' }} />
            <span>Техническую поддержку от интеграторов и разработчиков SHM</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-success)' }} />
            <span>Доступ в закрытую группу Telegram для получения поддержки в режиме online</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-success)' }} />
            <span>Скидку 10% и бесплатные обновления для Платежных систем и Шаблонов</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-success)' }} />
            <span>Работу с промокодами</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-success)' }} />
            <span>Конвертер валют для проведения операций в иностранных валютах и приема платежей Telegram (Звезды)</span>
          </li>
        </ul>
      </div>

      {/* Информация о существующей подписке */}
      {subscriptionInfo && (
        <div className="rounded-lg border p-6 mb-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Информация о подписке
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Подписка оплачена до:
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ color: 'var(--theme-content-text)' }}>{subscriptionInfo.expire}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Статус:
                </label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(subscriptionInfo.status)}
                  <span style={{ color: getStatusColor(subscriptionInfo.status) }}>
                    {getStatusText(subscriptionInfo.status)}
                  </span>
                </div>
              </div>
            </div>

            {subscriptionInfo.tg_url && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Ссылка для вступления в группу:
                </label>
                <a
                  href={subscriptionInfo.tg_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  {subscriptionInfo.tg_url}
                </a>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                Период продления подписки:
              </label>
              <select
                className="w-full px-3 py-2 rounded border"
                style={inputStyles}
                value={subscriptionInfo.next}
                onChange={(e) => updateRenewalPeriod(Number(e.target.value))}
              >
                <option value={-1}>Не продлевать</option>
                {subscriptionPlans.map((plan) => (
                  <option key={plan.service_id} value={plan.next ?? plan.service_id}>
                    {plan.name} - {plan.price_next ?? plan.price} руб.
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Форма заказа подписки */}
      {showSubscriptionForm && (
        <div className="rounded-lg border p-6 mb-6" style={cardStyles}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
            Оформление подписки
          </h3>

          {subscriptionError && (
            <div className="p-4 rounded mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>
              {subscriptionError}
            </div>
          )}

          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--theme-content-text)' }}>
              Выберите период:
            </label>
            <div className="grid gap-3">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.service_id}
                  className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                  style={{
                    borderColor: selectedPlan === plan.service_id ? 'var(--accent-primary)' : 'var(--theme-card-border)',
                    backgroundColor: selectedPlan === plan.service_id ? 'rgba(59, 130, 246, 0.1)' : cardStyles.backgroundColor,
                  }}
                  onClick={() => setSelectedPlan(plan.service_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {selectedPlan === plan.service_id && (
                          <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        )}
                        <span className="font-semibold text-lg" style={{ color: 'var(--theme-content-text)' }}>
                          {plan.name}
                        </span>
                      </div>
                      {plan.price_next && (
                        <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                          Далее {plan.price_next} ₽/мес
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-2xl" style={{ color: 'var(--accent-primary)' }}>
                        {plan.price} ₽
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => selectedPlan && orderSubscription(selectedPlan)}
              disabled={!selectedPlan || orderingSubscription}
              className="px-6 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--accent-success)',
                color: 'white',
              }}
            >
              {orderingSubscription ? 'Оформление...' : 'Оформить подписку'}
            </button>
          </div>
        </div>
      )}

      {/* Отображение ошибки загрузки */}
      {subscriptionError && !showSubscriptionForm && (
        <div className="rounded-lg border p-6" style={cardStyles}>
          <div className="p-4 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)' }}>
            <strong>Ошибка загрузки:</strong> {subscriptionError}
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscription;
