import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Plus, Trash2, Bot, Globe, CreditCard, List, Palette } from 'lucide-react';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import toast from 'react-hot-toast';
import DataTable, { SortDirection } from '../components/DataTable';
import { ConfigModal, ConfigCreateModal } from '../modals';
import Help from '../components/Help';
import { Link } from 'react-router-dom';
import TemplateSelect from '../components/TemplateSelect';

interface ConfigItem {
  key: string;
  value: any;
}

type TabType = 'general' | 'branding' | 'telegram' | 'payment' | 'all';

interface TelegramBot {
  token: string;
  secret?: string;
  template_id?: string;
  webhook_set?: boolean;
}

function ConfigurationTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigItem[]>([]);

  // Cloud
  const [CloudAuth, setCloudAuth] = useState('');
  
  // Основные настройки
  const [apiUrl, setApiUrl] = useState('');
  const [cliUrl, setCliUrl] = useState('');
  const [billingType, setBillingType] = useState<'Simpler' | 'Honest'>('Simpler');
  const [partnerIncomePercent, setPartnerIncomePercent] = useState(20);
  const [allowUserRegisterApi, setAllowUserRegisterApi] = useState(true);
  
  // Брендинг (company)
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#22d3ee');
  
  // Telegram боты
  const [telegramBots, setTelegramBots] = useState<Record<string, TelegramBot>>({});
  const [newBotName, setNewBotName] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [newBotSecret, setNewBotSecret] = useState('');
  const [newBotTemplate, setNewBotTemplate] = useState<string | null>('');
  const [showNewBotForm, setShowNewBotForm] = useState(false);
  
  // Модальное окно редактирования бота
  const [editBotModalOpen, setEditBotModalOpen] = useState(false);
  const [editingBotName, setEditingBotName] = useState('');
  const [editBotToken, setEditBotToken] = useState('');
  const [editBotSecret, setEditBotSecret] = useState('');
  const [editBotTemplate, setEditBotTemplate] = useState<string | null>('');

  // Модальное окно установки вебхука
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookBotName, setWebhookBotName] = useState('');
  const [webhookBotData, setWebhookBotData] = useState<TelegramBot | null>(null);

  // DataTable состояния для вкладки "Все настройки"
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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

  const tabButtonStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
    color: isActive ? 'var(--accent-text)' : 'var(--theme-content-text)',
    borderColor: isActive ? 'var(--accent-primary)' : 'var(--theme-card-border)',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchTableData(limit, offset, filters, sortField, sortDirection);
    }
  }, [activeTab, limit, offset, filters, sortField, sortDirection]);

  const fetchTableData = useCallback((l: number, o: number, f: Record<string, string>, sf?: string, sd?: SortDirection) => {
    setTableLoading(true);
    let url = `shm/v1/admin/config?limit=${l}&offset=${o}`;

    if (Object.keys(f).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(f))}`;
    }

    if (sf && sd) {
      url += `&sort_field=${sf}&sort_direction=${sd}`;
    }
    shm_request(url)
      .then(res => {
        const { data: items, total: count } = normalizeListResponse(res);
        if (sf && sd) {
          const direction = sd === 'asc' ? 1 : -1;
          const sorted = [...items].sort((a, b) => {
            const aVal = a?.[sf];
            const bVal = b?.[sf];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return -1 * direction;
            if (bVal == null) return 1 * direction;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return (aVal - bVal) * direction;
            }
            return String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' }) * direction;
          });
          setTableData(sorted);
        } else {
          setTableData(items);
        }
        setTotal(count);
      })
      .catch(() => setTableData([]))
      .finally(() => setTableLoading(false));
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await shm_request('shm/v1/admin/config');
      const configData = response.data || [];
      setConfig(configData);
      
      // Парсим данные для вкладок
      configData.forEach((item: ConfigItem) => {
        if (item.key === 'api') {
          setApiUrl(item.value?.url || '');
        } else if (item.key === 'cli') {
          setCliUrl(item.value?.url || '');
        } else if (item.key === 'billing') {
          setBillingType(item.value?.type || 'Simpler');
          setPartnerIncomePercent(item.value?.partner?.income_percent || 20);
          setAllowUserRegisterApi(item.value?.allow_user_register_api !== undefined ? item.value.allow_user_register_api : true);
        } else if (item.key === 'company') {
          setCompanyName(item.value?.name || '');
          setLogoUrl(item.value?.logoUrl || '');
          setPrimaryColor(item.value?.primaryColor || '#22d3ee');
        } else if (item.key === 'telegram') {
          // Отделяем xtr_exchange_rate от ботов
          const { xtr_exchange_rate, ...bots } = item.value || {};
          setTelegramBots(bots || {});
        } else if (item.key === '_shm') {
          setCloudAuth(item.value?.cloud?.auth || null);
        }
      });
    } catch (error) {
      toast.error('Ошибка загрузки конфигурации');
    } finally {
      setLoading(false);
    }
  };

  const saveConfigItem = async (key: string, value: any) => {
    try {
      await shm_request('shm/v1/admin/config', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      });
      toast.success(`Настройка "${key}" сохранена`);
      loadConfig();
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  const saveApiUrl = () => {
    saveConfigItem('api', { url: apiUrl });
  };

  const saveCliUrl = () => {
    saveConfigItem('cli', { url: cliUrl });
  };

  const saveBilling = () => {
    saveConfigItem('billing', {
      type: billingType,
      partner: { income_percent: partnerIncomePercent },
      allow_user_register_api: allowUserRegisterApi,
    });
  };

  const saveCompany = () => {
    saveConfigItem('company', {
      name: companyName,
      logoUrl: logoUrl,
      primaryColor: primaryColor,
    });
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 50; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const addNewBot = async () => {
    if (!newBotName || !newBotToken) {
      toast.error('Заполните имя и токен бота');
      return;
    }

    // Проверка что имя только латиница
    if (!/^[a-zA-Z_]+$/.test(newBotName)) {
      toast.error('Имя бота должно содержать только латинские буквы и подчеркивания');
      return;
    }

    const secret = newBotSecret || generateSecret();
    const updatedBots = {
      ...telegramBots,
      [newBotName]: {
        token: newBotToken,
        secret: secret,
        template_id: newBotTemplate || undefined,
        webhook_set: false,
      },
    };

    await saveConfigItem('telegram', {
      ...updatedBots,
    });
    setNewBotName('');
    setNewBotToken('');
    setNewBotSecret('');
    setNewBotTemplate('');
    setShowNewBotForm(false);
  };

  const openEditBotModal = (botName: string, bot: TelegramBot) => {
    setEditingBotName(botName);
    setEditBotToken(bot.token);
    setEditBotSecret(bot.secret || '');
    setEditBotTemplate(bot.template_id || null);
    setEditBotModalOpen(true);
  };

  const saveBotChanges = async () => {
    if (!editBotToken) {
      toast.error('Токен не может быть пустым');
      return;
    }

    const updatedBots = {
      ...telegramBots,
      [editingBotName]: {
        token: editBotToken,
        secret: editBotSecret || undefined,
        template_id: editBotTemplate || undefined,
        webhook_set: telegramBots[editingBotName]?.webhook_set || false,
      },
    };

    await saveConfigItem('telegram', updatedBots);
    setEditBotModalOpen(false);
  };

  const deleteBot = async (botName: string) => {
    if (!confirm(`Удалить бота "${botName}"?`)) return;

    const updatedBots = { ...telegramBots };
    delete updatedBots[botName];
    await saveConfigItem('telegram', {
      ...updatedBots,
    });
  };

  const updateBotToken = async (botName: string, token: string) => {
    const updatedBots = {
      ...telegramBots,
      [botName]: {
        ...telegramBots[botName],
        token,
      },
    };
    await saveConfigItem('telegram', {
      ...updatedBots,
    });
  };

  const setWebhook = async (botName: string, bot: TelegramBot, fromModal = false) => {
    if (!bot.token || !bot.secret) {
      toast.error('Отсутствует токен или секретный ключ');
      return;
    }

    try {
      const url = webhookUrl || cliUrl || apiUrl;
      if (!url) {
        toast.error('Не настроен URL для вебхука');
        return;
      }

      const response = await shm_request('shm/v1/telegram/set_webhook', {
        method: 'POST',
        body: JSON.stringify({
          url: url,
          secret: bot.secret,
          token: bot.token,
          template_id: bot.template_id || botName,
        }),
      });
      
      if (response.ok && response.result) {
        // Обновляем webhook_set в конфиге
        const updatedBots = {
          ...telegramBots,
          [botName]: {
            ...bot,
            webhook_set: true,
          },
        };
        await saveConfigItem('telegram', {
          ...updatedBots,
        });
        toast.success(response.description || `Вебхук для бота "${botName}" установлен`);
        setWebhookModalOpen(false);
        if (fromModal) {
          await loadConfig();
        }
      } else {
        toast.error('Ошибка установки вебхука');
      }
    } catch (error) {
      toast.error('Ошибка установки вебхука');
    }
  };

  const openWebhookModal = (botName: string, bot: TelegramBot) => {
    setWebhookBotName(botName);
    setWebhookBotData(bot);
    setWebhookUrl(cliUrl || apiUrl);
    setWebhookModalOpen(true);
  };

  const handlePageChange = (newLimit: number, newOffset: number) => {
    setLimit(newLimit);
    setOffset(newOffset);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(direction ? field : undefined);
    setSortDirection(direction);
    setOffset(0);
  };

  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setOffset(0);
  }, []);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setEditModalOpen(true);
  };

  const handleSave = () => {
    fetchTableData(limit, offset, filters, sortField, sortDirection);
    loadConfig();
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
          <Settings className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
          Конфигурация
        </h1>
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--theme-card-border)' }}>
        <button
          onClick={() => setActiveTab('general')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'general')}
        >
          <Globe className="w-4 h-4" />
          Основные
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'branding')}
        >
          <Palette className="w-4 h-4" />
          Брендинг
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'telegram')}
        >
          <Bot className="w-4 h-4" />
          Telegram боты
        </button>
        {CloudAuth !== null && (
          <Link
            to="/payment-systems"
            className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2 no-underline"
            style={{ 
              borderColor: 'var(--theme-card-border)',
              color: 'var(--theme-content-text)'
            }}
          >
            <CreditCard className="w-4 h-4" />
            Платежные системы
          </Link>
        )}
        <button
          onClick={() => setActiveTab('all')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'all')}
        >
          <List className="w-4 h-4" />
          Все настройки
        </button>
      </div>

      {/* Вкладка "Основные" */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          {/* API URL */}
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
              API URL
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="flex-1 px-3 py-2 rounded border"
                style={inputStyles}
              />
              <button
                onClick={saveApiUrl}
                className="px-4 py-2 rounded flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--accent-success)',
                  color: 'white',
                }}
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>

          {/* CLI URL */}
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
              CLI URL
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={cliUrl}
                onChange={(e) => setCliUrl(e.target.value)}
                placeholder="https://cli.example.com"
                className="flex-1 px-3 py-2 rounded border"
                style={inputStyles}
              />
              <button
                onClick={saveCliUrl}
                className="px-4 py-2 rounded flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--accent-success)',
                  color: 'white',
                }}
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>

          {/* Billing */}
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
              Биллинг
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Тип расчета услуги
                  <Help content="<b>Simpler</b>
Система расчета с фиксированным кол-вом дней в месяце
Считаем, что в месяце всегда 30 дней.
Например, услуга стоит 100р. в месяц, тогда легко подсчитать стоимость услуги за день, за час, за минуту и т.п.
Стоимость дня будет вычислена по формуле: 100р./30дней = 3.33 руб/день.
При заказе услуги дата окончания будет вычислена как текущая дата плюс 30 дней.
Дата окончания услуг плавающая из-за разного кол-ва дней в месяцах.
Этот способ расчетов самый простой и понятный для клиентов.
Календарная система расчетов

<b>Honest</b>
Календарная система расчетов
Самая сложная и самая честная система расчетов стоимости услуг.
Стоимость дня зависит от кол-ва дней в месяце.
Например, стоимость услуги за месяц 100р.:
в Январе 31 день, поэтому, стоимость услуги за день: 100р./31дней = 3.32 руб/день,
в Феврале 28 дней, поэтому, стоимость услуги за день: 100р./28дней = 3.57 руб/день,
Если клиент заказал услугу на месяц 1-ого Января, то дата окончания услуги будет 31-ого Января, тут всё ожидаемо.
Но если клиент заказал услугу на месяц 10 января, то дата окончания услуги будет 9 февраля (а не 10, как ожидалось). 
Это связано с тем, что стоимость услуги в январе меньше, чем в феврале (из-за разного кол-ва дней в месяцах). 
Однако, особо внимательным клиентам кажется, что у них украли день. 
Но бывают и обратные случаи, когда мы “дарим” дни: например, если клиент закажет услугу 27 февраля, то дата окончания будет 29 марта. 
Клиентам приходится объяснять, что “крадут/дарят” дни не мы, а календарь.
Дата окончания услуг плавающая из-за разного кол-ва дней в месяцах.
" />
                </label>
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as 'Simpler' | 'Honest')}
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyles}
                >
                  <option value="Simpler">Simpler</option>
                  <option value="Honest">Honest</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Процент партнерского начисления
                  <Help content="<b>Процент партнерского начисления</b>

Получение бонусов за приведенных клиентов по ссылке.
В SHM реализована двух-степенчатая реферальная программа.
В конфигурации биллинга в секции 'Процент партнерского начисления' можно указать значение партнерского начисления в процентах.
Клиенты могут получать пожизненные бонусы за приведенных клиентов (рефералов) по следующей схеме:
Для Web, клиент распространяет ссылку вида:
https://bill.DOMAIN/#!/?partner_id=USER_ID
где USER_ID это идентификатор клиента

<i>партнерскую ссылку клиент может получить в своём личном кабинете в профиле</i>

Для Telegram, клиент распространяет ссылку вида:
https://t.me/Name_bot?start=USER_ID
где USER_ID это идентификатор клиента
Со всех платежей рефералов, которые зарегистрировались в SHM по партнерской ссылке, клиенту будут начилсяться бонусы в размере установленного процента." />
                </label>
                <input
                  type="number"
                  value={partnerIncomePercent}
                  onChange={(e) => setPartnerIncomePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyles}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowUserRegisterApi"
                  checked={allowUserRegisterApi}
                  onChange={(e) => setAllowUserRegisterApi(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="allowUserRegisterApi" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--theme-content-text)' }}>
                  Разрешена регистрация пользователей через API
                </label>
              </div>
              <button
                onClick={saveBilling}
                className="px-4 py-2 rounded flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--accent-success)',
                  color: 'white',
                }}
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Вкладка "Брендинг" */}
      {activeTab === 'branding' && (
          <div className="space-y-4">
            {/* Название компании */}
            <div className="rounded-lg border p-6" style={cardStyles}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Название компании
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="SHM Admin"
                  className="w-full px-3 py-2 rounded border mb-3"
                  style={inputStyles}
                />
                <p className="text-xs mb-4" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Отображается в заголовке браузера, сайдбаре и на странице входа
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  URL логотипа
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 rounded border mb-3"
                  style={inputStyles}
                />
                <p className="text-xs mb-4" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Оставьте пустым для использования иконки по умолчанию
                </p>
              </div>
            </div>

            {/* Кнопка сохранить */}
            <button
              onClick={saveCompany}
              className="w-full px-4 py-2 rounded flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--accent-success)',
                color: 'white',
              }}
            >
              <Save className="w-4 h-4" />
              Сохранить брендинг
            </button>
          </div>
      )}

      {/* Вкладка "Telegram боты" */}
      {activeTab === 'telegram' && (
        <div className="space-y-4">
          {/* Список ботов - плиткой 3 в ряд */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(telegramBots).map(([botName, bot]) => (
              <div 
                key={botName} 
                className="rounded-lg border p-4 cursor-pointer hover:opacity-80 transition-opacity" 
                style={cardStyles}
                onClick={() => openEditBotModal(botName, bot)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold flex items-center gap-2 truncate" style={{ color: 'var(--theme-content-text)' }}>
                    <Bot className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{botName}</span>
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Вебхук
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: bot.webhook_set ? 'var(--accent-success)' : 'var(--accent-warning)',
                        color: 'white',
                      }}
                    >
                      {bot.webhook_set ? 'Установлен' : 'Не установлен'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Форма создания нового бота */}
          {!showNewBotForm ? (
            <button
              onClick={() => setShowNewBotForm(true)}
              className="w-full p-4 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 hover:opacity-70 transition-opacity"
              style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
            >
              <Plus className="w-5 h-5" />
              Добавить Telegram бота
            </button>
          ) : (
            <div className="rounded-lg border p-6" style={cardStyles}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
                Новый Telegram бот
              </h3>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--accent-warning)' }}>
                Имя бота и название шаблона должны совпадать для корректной работы Telegram бота
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Название бота (только латиница)
                  </label>
                  <input
                    type="text"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                    placeholder="my_bot"
                    className="w-full px-3 py-2 rounded border"
                    style={inputStyles}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Токен бота
                  </label>
                  <input
                    type="text"
                    value={newBotToken}
                    onChange={(e) => setNewBotToken(e.target.value)}
                    placeholder="123456:ABC-DEF1234..."
                    className="w-full px-3 py-2 rounded border font-mono text-sm"
                    style={inputStyles}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Секретный ключ для вебхука
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newBotSecret}
                      onChange={(e) => setNewBotSecret(e.target.value)}
                      placeholder="Автоматически сгенерируется"
                      className="flex-1 px-3 py-2 rounded border font-mono text-sm"
                      style={inputStyles}
                    />
                    <button
                      onClick={() => setNewBotSecret(generateSecret())}
                      className="px-4 py-2 rounded flex items-center gap-2 whitespace-nowrap"
                      style={{
                        backgroundColor: 'var(--theme-button-secondary-bg)',
                        color: 'var(--theme-button-secondary-text)',
                      }}
                    >
                      Сгенерировать
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Шаблон 
                  </label>
                    <TemplateSelect
                    value={newBotTemplate}
                    onChange={(id) => setNewBotTemplate(id)}
                    className="flex-1"
                    />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addNewBot}
                    className="px-4 py-2 rounded flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--accent-success)',
                      color: 'white',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Создать
                  </button>
                  <button
                    onClick={() => {
                      setShowNewBotForm(false);
                      setNewBotName('');
                      setNewBotToken('');
                      setNewBotSecret('');
                      setNewBotTemplate('');
                    }}
                    className="px-4 py-2 rounded"
                    style={{
                      backgroundColor: 'var(--theme-button-secondary-bg)',
                      color: 'var(--theme-button-secondary-text)',
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Вкладка "Все настройки" */}
      {activeTab === 'all' && (
        <div>
          <div className="flex items-center mb-4">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium ml-auto btn-primary"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-text)',
              }}
            >
              <Plus className="w-4 h-4" />
              Добавить
            </button>
          </div>
          <DataTable
            columns={[
              { key: 'key', label: 'Ключ', visible: true, sortable: true },
              { key: 'value', label: 'Значение', visible: true, sortable: false },
            ]}
            data={tableData}
            loading={tableLoading}
            total={total}
            limit={limit}
            offset={offset}
            onPageChange={handlePageChange}
            onSort={handleSort}
            onFilterChange={handleFilterChange}
            sortField={sortField}
            sortDirection={sortDirection}
            onRefresh={() => fetchTableData(limit, offset, filters, sortField, sortDirection)}
            onRowClick={handleRowClick}
            storageKey="config"
          />
        </div>
      )}

      <ConfigModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={selectedRow}
        onSave={handleSave}
      />
      <ConfigCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSave}
      />

      {/* Модальное окно редактирования бота */}
      {editBotModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditBotModalOpen(false)}
        >
          <div 
            className="rounded-lg border p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={cardStyles}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
                <Bot className="w-6 h-6" />
                {editingBotName}
              </h2>
              <button
                onClick={() => deleteBot(editingBotName)}
                className="px-3 py-2 rounded flex items-center gap-2 text-sm"
                style={{
                  backgroundColor: 'var(--accent-danger)',
                  color: 'white',
                }}
              >
                <Trash2 className="w-4 h-4" />
                Удалить бота
              </button>
            </div>

            <div className="space-y-4">
              {/* Токен */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Токен бота
                </label>
                <input
                  type="text"
                  value={editBotToken}
                  onChange={(e) => setEditBotToken(e.target.value)}
                  className="w-full px-3 py-2 rounded border font-mono text-sm"
                  style={inputStyles}
                  placeholder="123456:ABC-DEF1234..."
                />
              </div>

              {/* Секретный ключ */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Секретный ключ для вебхука
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editBotSecret}
                    onChange={(e) => setEditBotSecret(e.target.value)}
                    className="flex-1 px-3 py-2 rounded border font-mono text-sm"
                    style={inputStyles}
                    placeholder="Введите секретный ключ"
                  />
                  <button
                    onClick={() => setEditBotSecret(generateSecret())}
                    className="px-4 py-2 rounded flex items-center gap-2 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--theme-button-secondary-bg)',
                      color: 'var(--theme-button-secondary-text)',
                    }}
                  >
                    Сгенерировать
                  </button>
                </div>
              </div>

              {/* Шаблон */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Шаблон
                </label>
                <TemplateSelect
                  value={editBotTemplate}
                  onChange={(id) => setEditBotTemplate(id)}
                  className="w-full"
                />
              </div>

              {/* Статус вебхука */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <label className="block text-sm font-medium" style={{ color: 'var(--theme-content-text)' }}>
                    Статус вебхука
                  </label>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: telegramBots[editingBotName]?.webhook_set ? 'var(--accent-success)' : 'var(--accent-warning)',
                      color: 'white',
                    }}
                  >
                    {telegramBots[editingBotName]?.webhook_set ? 'Установлен' : 'Не установлен'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditBotModalOpen(false);
                    openWebhookModal(editingBotName, {
                      token: editBotToken,
                      secret: editBotSecret,
                      template_id: editBotTemplate || undefined,
                      webhook_set: telegramBots[editingBotName]?.webhook_set,
                    });
                  }}
                  className="w-full px-4 py-2 rounded flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-text)',
                  }}
                >
                  <Bot className="w-4 h-4" />
                  {telegramBots[editingBotName]?.webhook_set ? 'Переустановить вебхук' : 'Установить вебхук'}
                </button>
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
                <button
                  onClick={saveBotChanges}
                  className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-success)',
                    color: 'white',
                  }}
                >
                  <Save className="w-4 h-4" />
                  Сохранить изменения
                </button>
                <button
                  onClick={() => setEditBotModalOpen(false)}
                  className="px-4 py-2 rounded"
                  style={{
                    backgroundColor: 'var(--theme-button-secondary-bg)',
                    color: 'var(--theme-button-secondary-text)',
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно установки вебхука */}
      {webhookModalOpen && webhookBotData && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setWebhookModalOpen(false)}
        >
          <div 
            className="rounded-lg border p-6 max-w-2xl w-full mx-4"
            style={cardStyles}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
              <Bot className="w-6 h-6" />
              Установка вебхука для {webhookBotName}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  URL вебхука
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyles}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                  {cliUrl ? `Используется CLI URL: ${cliUrl}` : apiUrl ? `Используется API URL: ${apiUrl}` : 'URL не настроен'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Токен бота
                </label>
                <input
                  type="text"
                  value={webhookBotData.token}
                  disabled
                  className="w-full px-3 py-2 rounded border font-mono text-sm opacity-60"
                  style={inputStyles}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Секретный ключ
                </label>
                <input
                  type="text"
                  value={webhookBotData.secret || ''}
                  disabled
                  className="w-full px-3 py-2 rounded border font-mono text-sm opacity-60"
                  style={inputStyles}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Шаблон
                </label>
                <input
                  type="text"
                  value={webhookBotData.template_id || webhookBotName}
                  disabled
                  className="w-full px-3 py-2 rounded border opacity-60"
                  style={inputStyles}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
                <button
                  onClick={() => setWebhook(webhookBotName, webhookBotData, true)}
                  className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-success)',
                    color: 'white',
                  }}
                >
                  <Bot className="w-4 h-4" />
                  Установить вебхук
                </button>
                <button
                  onClick={() => setWebhookModalOpen(false)}
                  className="px-4 py-2 rounded"
                  style={{
                    backgroundColor: 'var(--theme-button-secondary-bg)',
                    color: 'var(--theme-button-secondary-text)',
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigurationTabs;
