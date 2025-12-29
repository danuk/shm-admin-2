import { useState, useEffect } from 'react';
import { Cloud, LogIn, LogOut, UserPlus, Plus, Check, X, ShoppingCart, CreditCard, FileText, CheckCircle, XCircle, Settings, RefreshCw } from 'lucide-react';
import { shm_request } from '../lib/shm_request';
import toast from 'react-hot-toast';
import { ShmCloudPaymentModal } from '../modals/ShmCloudPaymentModal';
import { IpResetConfirmationModal } from '../modals/IpResetConfirmationModal';
import { Link } from 'react-router-dom';
import type { SubscriptionInfo } from './Subscription';

interface CloudUser {
  login?: string;
  balance?: number;
  [key: string]: any;
}

function SHMCloud() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [loginData, setLoginData] = useState({ login: '', password: '' });
  const [registerData, setRegisterData] = useState({ login: '', password: '' });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [showIpResetModal, setShowIpResetModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const loadSubscriptionInfo = async () => {
    try {
      const response = await shm_request('shm/v1/admin/cloud/proxy/service/sub/get');

      if (response.status === 200 || response) {
        const data = response.data || response;
        setSubscriptionInfo(data);
      }
    } catch (error: any) {
      if (error.status !== 404 && error.response?.status !== 404) {
      }
    }
  };

  const checkAuth = async () => {
    setLoading(true);
    try {
      const res = await shm_request('shm/v1/admin/cloud/user');
      const userData = res.data || res;

      if (Array.isArray(userData) && userData.length > 0) {
        const user = userData[0];
        // Проверяем что user не null
        if (user !== null && (user.user_id || user.login)) {
          setCloudUser(user);
          setIsAuthenticated(true);
          localStorage.setItem('cloud_auth', JSON.stringify({ user }));
          loadSubscriptionInfo();
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('cloud_auth');
        }
      } else if (userData && (userData.user_id || userData.login)) {
        setCloudUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('cloud_auth', JSON.stringify({ user: userData }));
        loadSubscriptionInfo();
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('cloud_auth');
      }
    } catch (error) {
      setIsAuthenticated(false);
      localStorage.removeItem('cloud_auth');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await shm_request('shm/v1/admin/cloud/user/auth', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      await checkAuth();
      await loadSubscriptionInfo();
      toast.success('Успешная авторизация');
      setLoginData({ login: '', password: '' });
    } catch (error: any) {

      let errorData;
      try {
        errorData = typeof error.message === 'string' ? JSON.parse(error.message) : error;
      } catch {
        errorData = error;
      }

      if (errorData.error === 'Login from this IP is prohibited') {
        setShowIpResetModal(true);
      } else {
        const errorMessage = errorData.error || error.error || error.data?.error || 'Ошибка авторизации';
        toast.error(errorMessage);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await shm_request('shm/v1/admin/cloud/user', {
        method: 'PUT',
        body: JSON.stringify(registerData),
      });

      toast.success('Регистрация успешна. Войдите в систему.');
      setShowLogin(true);
      setRegisterData({ login: '', password: '' });
    } catch (error) {
      toast.error('Ошибка регистрации');
    }
  };

  const handleLogout = async () => {
    try {
      await shm_request('shm/v1/admin/cloud/user/auth', {
        method: 'DELETE',
      });
    } catch (error) {
    } finally {
      localStorage.removeItem('cloud_auth');
      setIsAuthenticated(false);
      setCloudUser(null);
      toast.success('Вы вышли из системы');
    }
  };

  const handleIpReset = async () => {
    try {
      await shm_request('shm/v1/admin/cloud/proxy/auth/reset', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      // После успешного сброса IP пробуем войти
      await shm_request('shm/v1/admin/cloud/user/auth', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      await checkAuth();
      await loadSubscriptionInfo();
      toast.success('IP адрес сброшен, вход выполнен');
      setLoginData({ login: '', password: '' });
    } catch (error: any) {
      toast.error(error.data?.error || 'Ошибка сброса IP адреса');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await checkAuth();
      await loadSubscriptionInfo();
      toast.success('Данные обновлены');
    } catch (error) {
      toast.error('Ошибка обновления данных');
    } finally {
      setRefreshing(false);
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
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

  if (!isAuthenticated) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold flex items-center gap-3"
            style={{ color: 'var(--theme-content-text)' }}
          >
            <Cloud className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
            SHM Cloud
          </h1>
        </div>

        {/* Информационное сообщение */}
        <div className="mt-6">
          <div className="rounded-lg border p-6" style={{...cardStyles, borderColor: 'var(--accent-info)'}}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
              Для использования облачных сервисов SHM зарегистрируйтесь или войдите
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-content-text-muted)' }}>
              Если Вы уже зарегистрированы в Telegram боте{' '}
              <a
                href="https://t.me/myshm_support_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent-primary)' }}
              >
                @myshm_support_bot
              </a>
              , для получения Логина и Пароля зайдите в бота и выберите в меню:{' '}
              <code
                className="px-2 py-1 rounded text-sm"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  color: 'var(--theme-content-text)'
                }}
              >
                /password
              </code>
              {' '}или введите эту команду
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto mt-6">
          <div className="rounded-lg border p-6" style={cardStyles}>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 py-2 px-4 rounded transition-colors ${showLogin ? '' : 'opacity-60'}`}
                style={{
                  backgroundColor: showLogin ? 'var(--accent-primary)' : 'transparent',
                  color: showLogin ? 'var(--accent-text)' : 'var(--theme-content-text)',
                }}
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Вход
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 py-2 px-4 rounded transition-colors ${!showLogin ? '' : 'opacity-60'}`}
                style={{
                  backgroundColor: !showLogin ? 'var(--accent-primary)' : 'transparent',
                  color: !showLogin ? 'var(--accent-text)' : 'var(--theme-content-text)',
                }}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Регистрация
              </button>
            </div>

            {showLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Логин
                  </label>
                  <input
                    type="text"
                    value={loginData.login}
                    onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={inputStyles}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={inputStyles}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded font-medium"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-text)',
                  }}
                >
                  Войти
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Логин
                  </label>
                  <input
                    type="text"
                    value={registerData.login}
                    onChange={(e) => setRegisterData({ ...registerData, login: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={inputStyles}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={inputStyles}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded font-medium"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-text)',
                  }}
                >
                  Зарегистрироваться
                </button>
              </form>
            )}
          </div>
        </div>
        <IpResetConfirmationModal
          open={showIpResetModal}
          onClose={() => setShowIpResetModal(false)}
          onConfirm={handleIpReset}
          userData={loginData}
        />
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
          <Cloud className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
          SHM Cloud
        </h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded flex items-center gap-2"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>

      {}
      <div className="rounded-lg border p-6 mb-6" style={cardStyles}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-input-bg)' }}>
              <UserPlus className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                {cloudUser?.login || 'test'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                Баланс {cloudUser?.balance || 0} ₽
              </p>
              {subscriptionInfo && (
                <div className="flex items-center gap-2 mt-1">
                  {subscriptionInfo.status === 'ACTIVE' ? (
                    <>
                      <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                      <span className="text-sm" style={{ color: 'var(--accent-success)' }}>
                        Подписка активна
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                      <span className="text-sm" style={{ color: 'var(--accent-warning)' }}>
                        Подписка неактивна
                      </span>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                color: 'var(--theme-button-secondary-text)',
                border: '1px solid var(--theme-button-secondary-border)',
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-secondary"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-text)',
              }}
            >
              <Plus className="w-6 h-6" />
              Пополнить баланс
            </button>
          </div>
        </div>
      </div>

      {/* Быстрые ссылки на сервисы */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link
          to="/subscription"
          className="rounded-lg border p-4 hover:shadow-lg transition-all"
          style={cardStyles}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-input-bg)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--accent-success)' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                Подписка
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                Управление подпиской на сервисы
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/payment-systems"
          className="rounded-lg border p-4 hover:shadow-lg transition-all"
          style={cardStyles}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-input-bg)' }}>
              <CreditCard className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                Платежные системы
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                Настройка способов приема платежей
              </p>
            </div>
          </div>
        </Link>
        <Link
          to="/currency-converter"
          className="rounded-lg border p-4 hover:shadow-lg transition-all"
          style={cardStyles}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-input-bg)' }}>
              <ShoppingCart className="w-6 h-6" style={{ color: 'var(--accent-warning)' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                Конвертер валют
              </h3>
              <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                Настройка курсов валют и надбавок
              </p>
            </div>
          </div>
        </Link>
      </div>
      <ShmCloudPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      />
      <IpResetConfirmationModal
        open={showIpResetModal}
        onClose={() => setShowIpResetModal(false)}
        onConfirm={handleIpReset}
        userData={loginData}
      />
    </div>
  );
}

export default SHMCloud;
