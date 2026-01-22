import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Plus, Trash2, Bot, Globe, CreditCard, List, Palette, Shield, ShieldOff, AlertTriangle, Copy, ExternalLink, Key, Edit2 } from 'lucide-react';
import { shm_request, normalizeListResponse } from '../lib/shm_request';
import { buildApiFilters, appendFilterToUrl } from '../lib/filterUtils';
import toast from 'react-hot-toast';
import DataTable, { SortDirection } from '../components/DataTable';
import { ConfigModal, ConfigCreateModal } from '../modals';
import Help from '../components/Help';
import { useConfirm } from '../components/ConfirmModal';
import { Link } from 'react-router-dom';
import TemplateSelect from '../components/TemplateSelect';
import QRCode from 'qrcode';

interface ConfigItem {
  key: string;
  value: any;
}

type TabType = 'general' | 'branding' | 'telegram' | 'security' | 'payment' | 'all';

interface TelegramBot {
  token: string;
  secret?: string | null;
  template_id?: string | null;
  webhook_set?: boolean;
  description?: string | null;
  chat_id?: string | null;
}

interface PasskeyCredential {
  id: string;
  name: string;
  created_at: string;
}

const currencies = [
  { "currency": "AED", "name": "Дирхам ОАЭ" },
  { "currency": "AMD", "name": "Армянских драмов" },
  { "currency": "AUD", "name": "Австралийский доллар" },
  { "currency": "AZN", "name": "Азербайджанский манат" },
  { "currency": "BDT", "name": "Так" },
  { "currency": "BGN", "name": "Болгарский лев" },
  { "currency": "BHD", "name": "Бахрейнский динар" },
  { "currency": "BOB", "name": "Боливиано" },
  { "currency": "BRL", "name": "Бразильский реал" },
  { "currency": "BYN", "name": "Белорусский рубль" },
  { "currency": "CAD", "name": "Канадский доллар" },
  { "currency": "CHF", "name": "Швейцарский франк" },
  { "currency": "CNY", "name": "Юань" },
  { "currency": "CUP", "name": "Кубинских песо" },
  { "currency": "CZK", "name": "Чешских крон" },
  { "currency": "DKK", "name": "Датская крона" },
  { "currency": "DZD", "name": "Алжирских динаров" },
  { "currency": "EGP", "name": "Египетских фунтов" },
  { "currency": "ETB", "name": "Эфиопских быров" },
  { "currency": "EUR", "name": "Евро" },
  { "currency": "GBP", "name": "Фунт стерлингов" },
  { "currency": "GEL", "name": "Лари" },
  { "currency": "HKD", "name": "Гонконгский доллар" },
  { "currency": "HUF", "name": "Форинтов" },
  { "currency": "IDR", "name": "Рупий" },
  { "currency": "INR", "name": "Индийских рупий" },
  { "currency": "IRR", "name": "Иранских риалов" },
  { "currency": "JPY", "name": "Иен" },
  { "currency": "KGS", "name": "Сомов" },
  { "currency": "KRW", "name": "Вон" },
  { "currency": "KZT", "name": "Тенге" },
  { "currency": "MDL", "name": "Молдавских леев" },
  { "currency": "MMK", "name": "Кьятов" },
  { "currency": "MNT", "name": "Тугриков" },
  { "currency": "NGN", "name": "Найр" },
  { "currency": "NOK", "name": "Норвежских крон" },
  { "currency": "NZD", "name": "Новозеландский доллар" },
  { "currency": "OMR", "name": "Оманский риал" },
  { "currency": "PLN", "name": "Злотый" },
  { "currency": "QAR", "name": "Катарский риал" },
  { "currency": "RON", "name": "Румынский лей" },
  { "currency": "RUB", "name": "Российский рубль" },
  { "currency": "RSD", "name": "Сербских динаров" },
  { "currency": "SAR", "name": "Саудовский риял" },
  { "currency": "SEK", "name": "Шведских крон" },
  { "currency": "SGD", "name": "Сингапурский доллар" },
  { "currency": "XTR", "name": "Telegram Stars" },
  { "currency": "THB", "name": "Батов" },
  { "currency": "TJS", "name": "Сомони" },
  { "currency": "TMT", "name": "Новый туркменский манат" },
  { "currency": "TRY", "name": "Турецких лир" },
  { "currency": "UAH", "name": "Гривен" },
  { "currency": "USD", "name": "Доллар США" },
  { "currency": "UZS", "name": "Узбекских сумов" },
  { "currency": "VND", "name": "Донгов" },
  { "currency": "XDR", "name": "СДР (специальные права заимствования)" },
  { "currency": "ZAR", "name": "Рэндов" }
]


function ConfigurationTabs() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigItem[]>([]);

  // Cloud
  const [CloudAuth, setCloudAuth] = useState('');

  // Основные настройки
  const [apiUrl, setApiUrl] = useState('');
  const [cliUrl, setCliUrl] = useState('');
  const [billingType, setBillingType] = useState<'Simpler' | 'Honest'>('Simpler');
  const [billingCurrency, setBillingCurrency] = useState('RUB');
  const [partnerIncomePercent, setPartnerIncomePercent] = useState(20);
  const [allowUserRegisterApi, setAllowUserRegisterApi] = useState(true);

  // Брендинг (company)
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // OTP настройки
  const [otpWindow, setOtpWindow] = useState(1);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpSetupModal, setOtpSetupModal] = useState(false);
  const [otpSetupData, setOtpSetupData] = useState<any>(null);
  const [otpVerifyToken, setOtpVerifyToken] = useState('');
  const [otpError, setOtpError] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Passkey настройки
  const [passkeyCredentials, setPasskeyCredentials] = useState<PasskeyCredential[]>([]);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [passkeyNewName, setPasskeyNewName] = useState('');
  const [passkeyRenameModal, setPasskeyRenameModal] = useState(false);
  const [passkeyRenameId, setPasskeyRenameId] = useState('');
  const [passkeyRenameName, setPasskeyRenameName] = useState('');
  const [passwordAuthDisabled, setPasswordAuthDisabled] = useState(false);

  // Telegram боты
  const [telegramBots, setTelegramBots] = useState<Record<string, TelegramBot>>({});
  const [newBotName, setNewBotName] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [newBotSecret, setNewBotSecret] = useState('');
  const [newBotTemplate, setNewBotTemplate] = useState<string | null>('');
  const [newBotDescription, setNewBotDescription] = useState('');
  const [newBotChatId, setNewBotChatId] = useState('');
  const [showNewBotForm, setShowNewBotForm] = useState(false);

  // Модальное окно редактирования бота
  const [editBotModalOpen, setEditBotModalOpen] = useState(false);
  const [editingBotName, setEditingBotName] = useState('');
  const [editBotToken, setEditBotToken] = useState('');
  const [editBotSecret, setEditBotSecret] = useState('');
  const [editBotTemplate, setEditBotTemplate] = useState<string | null>('');
  const [editBotDescription, setEditBotDescription] = useState('');
  const [editBotChatId, setEditBotChatId] = useState('');

  // Модальное окно установки вебхука
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookBotName, setWebhookBotName] = useState('');
  const [webhookBotData, setWebhookBotData] = useState<TelegramBot | null>(null);
  const [webhookAllowedUpdates, setWebhookAllowedUpdates] = useState<string[]>([
    'message',
    'inline_query',
    'callback_query',
    'pre_checkout_query',
    'my_chat_member',
  ]);
  const [getUpdatesResult, setGetUpdatesResult] = useState<any>(null);
  const [getUpdatesLoading, setGetUpdatesLoading] = useState(false);
  const [getUpdatesError, setGetUpdatesError] = useState('');

  // Все доступные типы обновлений Telegram с описаниями
  const allTelegramUpdates = [
    { key: 'message', label: 'message', description: 'Новые входящие сообщения (текст, фото, стикеры и т.д.)' },
    { key: 'inline_query', label: 'inline_query', description: 'Inline-запросы (@bot запрос)' },
    { key: 'callback_query', label: 'callback_query', description: 'Нажатия на inline-кнопки (callback buttons)' },
    { key: 'my_chat_member', label: 'my_chat_member', description: 'Изменение статуса бота в чате (добавлен, удалён, заблокирован)' },
    { key: 'pre_checkout_query', label: 'pre_checkout_query', description: 'Запрос перед оплатой (подтверждение платежа)' },
    { key: 'edited_message', label: 'edited_message', description: 'Отредактированные сообщения' },
    { key: 'channel_post', label: 'channel_post', description: 'Новые посты в каналах, где бот является администратором' },
    { key: 'edited_channel_post', label: 'edited_channel_post', description: 'Отредактированные посты в каналах' },
    { key: 'business_connection', label: 'business_connection', description: 'Подключение/отключение бизнес-аккаунта к боту' },
    { key: 'business_message', label: 'business_message', description: 'Новые сообщения от бизнес-аккаунта' },
    { key: 'edited_business_message', label: 'edited_business_message', description: 'Отредактированные сообщения бизнес-аккаунта' },
    { key: 'deleted_business_messages', label: 'deleted_business_messages', description: 'Удалённые сообщения бизнес-аккаунта' },
    { key: 'message_reaction', label: 'message_reaction', description: 'Реакция на сообщение была изменена пользователем' },
    { key: 'message_reaction_count', label: 'message_reaction_count', description: 'Изменение счётчика анонимных реакций' },
    { key: 'chosen_inline_result', label: 'chosen_inline_result', description: 'Результат inline-запроса, выбранный пользователем' },
    { key: 'shipping_query', label: 'shipping_query', description: 'Запрос информации о доставке (платежи)' },
    { key: 'poll', label: 'poll', description: 'Изменение состояния опроса (новые голоса, закрытие)' },
    { key: 'poll_answer', label: 'poll_answer', description: 'Ответ пользователя на неанонимный опрос' },
    { key: 'chat_member', label: 'chat_member', description: 'Изменение статуса участника чата (требует явного запроса)' },
    { key: 'chat_join_request', label: 'chat_join_request', description: 'Запрос на вступление в чат' },
    { key: 'chat_boost', label: 'chat_boost', description: 'Буст чата был добавлен или изменён' },
    { key: 'removed_chat_boost', label: 'removed_chat_boost', description: 'Буст чата был удалён' },
    { key: 'purchased_paid_media', label: 'purchased_paid_media', description: 'Пользователь купил платный медиа-контент' },
  ];

  const defaultAllowedUpdates = [
    'message',
    'inline_query',
    'callback_query',
    'pre_checkout_query',
    'my_chat_member',
  ];

  // DataTable состояния для вкладки "Все настройки"
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<'like' | 'exact'>('like');
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
      fetchTableData(limit, offset, filters, filterMode, sortField, sortDirection);
    }
    if (activeTab === 'security') {
      checkOtpStatus();
      checkPasskeyStatus();
    }
  }, [activeTab, limit, offset, filters, filterMode, sortField, sortDirection]);

  // Генерация QR кода когда открывается модальное окно
  useEffect(() => {
    if (otpSetupModal && otpSetupData?.qr_url) {
      QRCode.toDataURL(otpSetupData.qr_url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then((url: string) => setQrCodeDataUrl(url))
    }
  }, [otpSetupModal, otpSetupData]);

  const fetchTableData = useCallback((l: number, o: number, f: Record<string, string>, fm: 'like' | 'exact', sf?: string, sd?: SortDirection) => {
    setTableLoading(true);
    let url = `shm/v1/admin/config?limit=${l}&offset=${o}`;

    const activeFilters = buildApiFilters(f, fm);
    url = appendFilterToUrl(url, activeFilters);

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
          setBillingCurrency(item.value?.currency || 'RUB' );
        } else if (item.key === 'company') {
          setCompanyName(item.value?.name || '');
          setLogoUrl(item.value?.logoUrl || '');
        } else if (item.key === 'telegram') {
          // Отделяем xtr_exchange_rate от ботов
          const { xtr_exchange_rate, ...bots } = item.value || {};
          setTelegramBots(bots || {});
        } else if (item.key === '_shm') {
          setCloudAuth(item.value?.cloud?.auth || null);
        } else if (item.key === 'otp') {
          setOtpWindow(item.value?.window || 1);
        }
      });
    } catch (error) {
      toast.error('Ошибка загрузки конфигурации');
    } finally {
      setLoading(false);
    }
  };

  // await DeleteConfigItem('key', value);

  const DeleteConfigItem = async (key: string, value: any) => {
    try {
      await shm_request(`shm/v1/admin/config/${key}?value=${value}`, {
        method: 'DELETE',
      });
      toast.success(`"${key}" Удален`);
      loadConfig();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const saveConfigItem = async (key: string, value: any) => {
    try {
      await shm_request(`shm/v1/admin/config/${key}`, {
        method: 'POST',
        body: JSON.stringify(value),
      });
      toast.success(`Настройка "${key}" сохранена`);
      loadConfig();
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  const saveTelegramBot = (botKey: string, botValue: TelegramBot | null) => {
    saveConfigItem('telegram', { [botKey]: botValue });
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
      currency: billingCurrency,
    });
  };

  const saveCompany = () => {
    saveConfigItem('company', {
      name: companyName,
      logoUrl: logoUrl,
    });
  };

  const checkOtpStatus = async () => {
    try {
      const response = await shm_request('shm/v1/user/otp/status');
      const status = response.data?.[0];
      if (status && status.enabled) {
        setOtpEnabled(true);
      } else {
        setOtpEnabled(false);
      }
    } catch (error) {
      setOtpEnabled(false);
    }
  };

  const setupOtp = async () => {
    try {
      const response = await shm_request('shm/v1/user/otp/setup', { method: 'POST' });
      const data = response.data?.[0];
      if (data) {
        setOtpSetupData(data);
        setOtpSetupModal(true);
        setOtpVerifyToken('');
        setOtpError('');
      }
    } catch (error) {
      toast.error('Ошибка настройки OTP');
    }
  };

  const verifyAndEnableOtp = async () => {
    setOtpError('');

    if (!otpVerifyToken) {
      setOtpError('Введите код из приложения');
      return;
    }

    try {
      const response = await shm_request('shm/v1/user/otp/enable', {
        method: 'POST',
        body: JSON.stringify({ token: otpVerifyToken }),
      });

      if (response.data && response.data[0] && response.data[0].success) {
        toast.success('OTP успешно включен');
        setOtpSetupModal(false);
        checkOtpStatus();
      }
    } catch (error: any) {
      // Обработка ошибок как в старой версии
      if (error.response?.data?.error) {
        const errorCode = error.response.data.error;
        switch(errorCode) {
          case 'TOKEN_REQUIRED':
            setOtpError('Требуется токен');
            break;
          case 'INVALID_TOKEN':
            setOtpError('Недействительный токен. Проверьте код и попробуйте снова.');
            break;
          case 'OTP_NOT_SETUP':
            setOtpError('OTP не настроен. Начните настройку заново.');
            break;
          default:
            setOtpError(errorCode);
        }
      } else {
        setOtpError('Ошибка сети или сервера');
      }
    }
  };

  const disableOtp = async () => {
    const token = prompt('Введите OTP код для отключения:');
    if (!token || token.length < 6) {
      return;
    }

    try {
      await shm_request('shm/v1/user/otp/disable', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      toast.success('OTP отключен');
      checkOtpStatus();
    } catch (error) {
      toast.error('Ошибка отключения OTP');
    }
  };

  // ===== Passkey Functions =====
  const checkPasskeyStatus = async () => {
    try {
      const response = await shm_request('shm/v1/user/passkey/list');
      const data = response.data?.[0];
      if (data) {
        setPasskeyCredentials(data.credentials || []);
        setPasskeyEnabled(data.enabled || false);
      } else {
        setPasskeyCredentials([]);
        setPasskeyEnabled(false);
      }
      // Загружаем статус входа по паролю
      await checkPasswordAuthStatus();
    } catch (error) {
      setPasskeyCredentials([]);
      setPasskeyEnabled(false);
    }
  };

  const checkPasswordAuthStatus = async () => {
    try {
      const response = await shm_request('shm/v1/user/password-auth/status');
      const data = response.data?.[0];
      if (data) {
        setPasswordAuthDisabled(data.password_auth_disabled || false);
      }
    } catch (error) {
    }
  };

  const togglePasswordAuth = async () => {
    try {
      if (passwordAuthDisabled) {
        // Включаем вход по паролю
        await shm_request('shm/v1/user/password-auth/enable', { method: 'POST' });
        toast.success('Вход по паролю включен');
      } else {
        // Отключаем вход по паролю
        if (!passkeyEnabled) {
          toast.error('Сначала настройте Passkey');
          return;
        }
        const confirmed = await confirm({
          title: 'Отключение входа по паролю',
          message: 'Вы уверены? Вход будет возможен только через Passkey. OTP будет отключен.',
          confirmText: 'Отключить',
          variant: 'warning',
        });
        if (!confirmed) {
          return;
        }
        await shm_request('shm/v1/user/password-auth/disable', { method: 'POST' });
        toast.success('Вход по паролю отключен. Используйте Passkey.');
      }
      await checkPasskeyStatus();
      await checkOtpStatus();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка изменения настроек');
    }
  };

  const isPasskeySupported = () => {
    return window.PublicKeyCredential !== undefined;
  };

  const registerPasskey = async () => {
    if (!isPasskeySupported()) {
      toast.error('Ваш браузер не поддерживает Passkey');
      return;
    }

    setPasskeyRegistering(true);
    try {
      // Получаем опции для регистрации
      const optionsResponse = await shm_request('shm/v1/user/passkey/register/options', { method: 'POST' });
      const options = optionsResponse.data?.[0];

      if (!options) {
        throw new Error('Не удалось получить опции регистрации');
      }

      // Преобразуем base64url в ArrayBuffer
      const challenge = base64urlToArrayBuffer(options.challenge);
      const userId = base64urlToArrayBuffer(options.user.id);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: options.rp,
        user: {
          ...options.user,
          id: userId,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        attestation: options.attestation as AttestationConveyancePreference,
        authenticatorSelection: options.authenticatorSelection,
        excludeCredentials: options.excludeCredentials?.map((cred: any) => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id),
        })),
      };

      // Вызываем WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Не удалось создать credential');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // Отправляем результат на сервер
      const completeResponse = await shm_request('shm/v1/user/passkey/register/complete', {
        method: 'POST',
        body: JSON.stringify({
          credential_id: credential.id,
          rawId: arrayBufferToBase64url(credential.rawId),
          response: {
            clientDataJSON: arrayBufferToBase64url(attestationResponse.clientDataJSON),
            attestationObject: arrayBufferToBase64url(attestationResponse.attestationObject),
          },
          name: passkeyNewName || `Passkey ${passkeyCredentials.length + 1}`,
        }),
      });

      if (completeResponse.data?.[0]?.success) {
        toast.success('Passkey успешно зарегистрирован');
        setPasskeyNewName('');
        checkPasskeyStatus();
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast.error('Регистрация отменена пользователем');
      } else {
        toast.error(error.message || 'Ошибка регистрации Passkey');
      }
    } finally {
      setPasskeyRegistering(false);
    }
  };

  const deletePasskey = async (credentialId: string) => {
    const confirmed = await confirm({
      title: 'Удаление Passkey',
      message: 'Вы уверены, что хотите удалить этот Passkey?',
      confirmText: 'Удалить',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      await shm_request('shm/v1/user/passkey/delete', {
        method: 'POST',
        body: JSON.stringify({ credential_id: credentialId }),
      });
      toast.success('Passkey удален');
      checkPasskeyStatus();
    } catch (error) {
      toast.error('Ошибка удаления Passkey');
    }
  };

  const openRenameModal = (id: string, name: string) => {
    setPasskeyRenameId(id);
    setPasskeyRenameName(name);
    setPasskeyRenameModal(true);
  };

  const renamePasskey = async () => {
    if (!passkeyRenameName.trim()) {
      toast.error('Введите название');
      return;
    }

    try {
      await shm_request('shm/v1/user/passkey/rename', {
        method: 'POST',
        body: JSON.stringify({
          credential_id: passkeyRenameId,
          name: passkeyRenameName,
        }),
      });
      toast.success('Passkey переименован');
      setPasskeyRenameModal(false);
      checkPasskeyStatus();
    } catch (error) {
      toast.error('Ошибка переименования Passkey');
    }
  };

  // Вспомогательные функции для WebAuthn
  const base64urlToArrayBuffer = (base64url: string): ArrayBuffer => {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const arrayBufferToBase64url = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 50; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  // Проверка что строка содержит только латиницу, цифры и подчёркивание
  const isValidBotName = (name: string) => /^[a-zA-Z0-9_-]+$/.test(name);

  const addNewBot = async () => {
    if (!newBotName || !newBotToken) {
      toast.error('Заполните имя и токен бота');
      return;
    }

    if (!isValidBotName(newBotName)) {
      toast.error('Название бота должно содержать только латиницу, цифры, подчёркивание и дефис');
      return;
    }

    // Проверяем, существует ли уже бот с таким именем
    if (telegramBots[newBotName]) {
      toast.error(`Бот с названием "${newBotName}" уже существует`);
      return;
    }

    const secret = newBotSecret || generateSecret();

    await saveTelegramBot(newBotName, {
      token: newBotToken,
      secret,
      template_id: newBotTemplate || null,
      webhook_set: false,
      chat_id: newBotChatId || null,
      description: newBotDescription || null,
    });
    setNewBotName('');
    setNewBotToken('');
    setNewBotSecret('');
    setNewBotTemplate('');
    setNewBotDescription('');
    setNewBotChatId('');
    setShowNewBotForm(false);
  };

  const openEditBotModal = (botName: string, bot: TelegramBot) => {
    setEditingBotName(botName);
    setEditBotToken(bot.token);
    setEditBotSecret(bot.secret || '');
    setEditBotTemplate(bot.template_id || '');
    setEditBotDescription(bot.description || '');
    setEditBotChatId(bot.chat_id || '');
    setEditBotModalOpen(true);
  };

  const saveBotChanges = async () => {
    if (!editBotToken) {
      toast.error('Токен не может быть пустым');
      return;
    }

    await saveTelegramBot(editingBotName, {
      token: editBotToken,
      secret: editBotSecret || null,
      template_id: editBotTemplate || null,
      description: editBotDescription || null,
      webhook_set: telegramBots[editingBotName]?.webhook_set || false,
      chat_id: editBotChatId || null,
    });
    setEditBotModalOpen(false);
  };

  const deleteBot = async (botName: string) => {
    const confirmed = await confirm({
      title: 'Удаление бота',
      message: `Удалить бота "${botName}"?`,
      confirmText: 'Удалить',
      variant: 'danger',
    });
    if (!confirmed) return;

    await DeleteConfigItem('telegram', botName);
    setEditBotModalOpen(false);
  };

  const updateBotToken = async (botName: string, token: string) => {
    // обновляем токен одного бота
    await saveTelegramBot(botName, {
      ...telegramBots[botName],
      token,
    });
  };

  const setWebhook = async (botName: string, bot: TelegramBot, fromModal = false) => {
    if (!bot.token || !bot.secret) {
      toast.error('Отсутствует токен или секретный ключ');
      return;
    }

    try {
      const url = webhookUrl || apiUrl;
      if (!url) {
        toast.error('Не настроен URL для вебхука');
        return;
      }

      const requestBody: any = {
        url: url,
        secret: bot.secret,
        token: bot.token,
        template_id: bot.template_id,
        allowed_updates: webhookAllowedUpdates,
        tg_profile: botName,
      };

      const response = await shm_request('shm/v1/telegram/set_webhook', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (response.ok && response.result) {
        // Обновляем webhook_set в конфиге
        await saveTelegramBot(botName, {
          ...bot,
          webhook_set: true,
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

  const getUpdates = async (token: string) => {
    if (!token) {
      setGetUpdatesError('Токен не указан');
      return;
    }

    setGetUpdatesLoading(true);
    setGetUpdatesError('');
    setGetUpdatesResult(null);

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const data = await response.json();
      setGetUpdatesResult(data);
      if (!data.ok) {
        setGetUpdatesError(data.description || 'Ошибка при получении обновлений');
      }
    } catch (error: any) {
      setGetUpdatesError(error.message || 'Ошибка сети');
    } finally {
      setGetUpdatesLoading(false);
    }
  };

  const openWebhookModal = (botName: string, bot: TelegramBot) => {
    setWebhookBotName(botName);
    setWebhookBotData(bot);
    setWebhookUrl(apiUrl);
    setWebhookAllowedUpdates([...defaultAllowedUpdates]);
    setGetUpdatesResult(null);
    setGetUpdatesError('');
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

  const handleFilterChange = useCallback((newFilters: Record<string, string>, newFilterMode: 'like' | 'exact') => {
    setFilters(newFilters);
    setFilterMode(newFilterMode);
    setOffset(0);
  }, []);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setEditModalOpen(true);
  };

  const handleSave = () => {
    fetchTableData(limit, offset, filters, filterMode, sortField, sortDirection);
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
          <span className="hidden sm:inline">Основные</span>
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'branding')}
        >
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Брендинг</span>
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'telegram')}
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">Telegram боты</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'security')}
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Безопасность</span>
        </button>
        {CloudAuth !== null ? (
          <Link
            to="/payment-systems"
            className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2 no-underline"
            style={{
              borderColor: 'var(--theme-card-border)',
              color: 'var(--theme-content-text)'
            }}
          >
            <CreditCard className="w-4 h-4" />
          <span className="hidden sm:inline">Платежные системы</span>
          </Link>
        ) : (
          <Link
            to="/cloud"
            className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2 no-underline"
            style={{
              borderColor: 'var(--theme-card-border)',
              color: 'var(--theme-content-text)'
            }}
          >
            <CreditCard className="w-4 h-4" />
          <span className="hidden sm:inline">Платежные системы</span>
          </Link>
        )
        }
        <button
          onClick={() => setActiveTab('all')}
          className="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
          style={tabButtonStyle(activeTab === 'all')}
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">Все настройки</span>
        </button>
      </div>

      {/* Вкладка "Основные" */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          {/* API URL */}
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
              API URL
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  для приёма платежей и работы ботов
                </label>
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
                <span className="hidden sm:inline">Сохранить</span>
              </button>
            </div>
          </div>

          {/* CLI URL */}
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-content-text)' }}>
              URL
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  для личного кабинета
                </label>
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
                <span className="hidden sm:inline">Сохранить</span>
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
                  Валюта биллинга
                </label>
                <select
                  value={billingCurrency}
                  onChange={(e) => setBillingCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyles}
                >
                  {currencies.map((c) => (
                    <option key={c.currency} value={c.currency}>
                      {c.currency} - {c.name}
                    </option>
                  ))}
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

      {/* Вкладка "Безопасность" */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Статус OTP */}
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
              <Shield className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              Двухфакторная аутентификация (OTP)
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                    OTP для вашего аккаунта
                  </p>
                  <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
                    {otpEnabled ? 'Двухфакторная аутентификация включена' : 'Двухфакторная аутентификация отключена'}
                  </p>
                </div>
                <div className="flex gap-3">
                  {!otpEnabled ? (
                    <button
                      onClick={setupOtp}
                      className="px-4 py-2 rounded flex items-center gap-2"
                      style={{
                        backgroundColor: 'var(--accent-success)',
                        color: 'white',
                      }}
                    >
                      <Shield className="w-4 h-4" />
                      Настроить OTP
                    </button>
                  ) : (
                    <button
                      onClick={disableOtp}
                      className="px-4 py-2 rounded flex items-center gap-2"
                      style={{
                        backgroundColor: 'var(--accent-danger)',
                        color: 'white',
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Отключить OTP
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Информация о Passkey */}
          <div className="rounded-lg border p-6" style={cardStyles}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
              <Key className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              Passkey (беспарольная аутентификация)
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--theme-content-text-muted)' }}>
              Passkey позволяет входить в систему без пароля, используя биометрию (отпечаток пальца, Face ID)
              или PIN-код устройства. Это более безопасный и удобный способ аутентификации.
            </p>

            {!isPasskeySupported() && (
              <div className="p-3 rounded border mb-4" style={{ backgroundColor: 'var(--accent-warning)', borderColor: 'var(--accent-warning)' }}>
                <p className="text-sm text-white">
                  Ваш браузер не поддерживает Passkey. Попробуйте использовать Chrome, Safari или Edge последней версии.
                </p>
              </div>
            )}

            {/* Список зарегистрированных Passkey */}
            {passkeyCredentials.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-content-text)' }}>
                  Зарегистрированные Passkey
                </h4>
                <div className="space-y-2">
                  {passkeyCredentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between p-3 rounded border"
                      style={{ borderColor: 'var(--theme-card-border)', backgroundColor: 'var(--theme-input-bg)' }}
                    >
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        <div>
                          <p className="font-medium" style={{ color: 'var(--theme-content-text)' }}>
                            {cred.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                            Добавлен: {cred.created_at}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openRenameModal(cred.id, cred.name)}
                          className="p-2 rounded hover:opacity-80"
                          style={{ backgroundColor: 'var(--theme-button-secondary-bg)', color: 'var(--theme-button-secondary-text)' }}
                          title="Переименовать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePasskey(cred.id)}
                          className="p-2 rounded hover:opacity-80"
                          style={{ backgroundColor: 'var(--accent-danger)', color: 'white' }}
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Форма добавления нового Passkey */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--theme-card-border)' }}>
              <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-content-text)' }}>
                Добавить новый Passkey
              </h4>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={passkeyNewName}
                  onChange={(e) => setPasskeyNewName(e.target.value)}
                  placeholder="Название устройства (опционально)"
                  className="flex-1 px-3 py-2 rounded border"
                  style={inputStyles}
                />
                <button
                  onClick={registerPasskey}
                  disabled={passkeyRegistering || !isPasskeySupported()}
                  className="px-4 py-2 rounded flex items-center gap-2"
                  style={{
                    backgroundColor: passkeyRegistering || !isPasskeySupported() ? 'var(--theme-button-secondary-bg)' : 'var(--accent-success)',
                    color: passkeyRegistering || !isPasskeySupported() ? 'var(--theme-button-secondary-text)' : 'white',
                    opacity: passkeyRegistering || !isPasskeySupported() ? 0.6 : 1,
                    cursor: passkeyRegistering || !isPasskeySupported() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {passkeyRegistering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Регистрация...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Добавить Passkey</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Управление входом по паролю */}
            {passkeyEnabled && (
              <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--theme-card-border)' }}>
                <h4 className="text-md font-medium mb-3" style={{ color: 'var(--theme-content-text)' }}>
                  Режим только Passkey
                </h4>
                <p className="text-sm mb-4" style={{ color: 'var(--theme-content-text-muted)' }}>
                  {passwordAuthDisabled
                    ? 'Вход по паролю отключен. Доступен только вход через Passkey.'
                    : 'Вы можете отключить вход по паролю и использовать только Passkey. OTP также будет отключен.'}
                </p>
                <button
                  onClick={togglePasswordAuth}
                  className="px-4 py-2 rounded flex items-center gap-2"
                  style={{
                    backgroundColor: passwordAuthDisabled ? 'var(--accent-success)' : 'var(--accent-danger)',
                    color: 'white',
                  }}
                >
                  {passwordAuthDisabled ? (
                    <>
                      <Shield className="w-4 h-4" />
                      Включить вход по паролю
                    </>
                  ) : (
                    <>
                      <ShieldOff className="w-4 h-4" />
                      Отключить вход по паролю
                    </>
                  )}
                </button>
                {passwordAuthDisabled && (
                  <div className="mt-3 p-3 rounded border" style={{ backgroundColor: 'var(--accent-warning)', borderColor: 'var(--accent-warning)', opacity: 0.9 }}>
                    <p className="text-sm text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Вход по паролю отключен. Убедитесь, что Passkey работает корректно.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Вкладка "Telegram боты" */}
      {activeTab === 'telegram' && (
        <div className="space-y-4">
          {/* Список ботов - плиткой 3 в ряд */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(telegramBots)
              .filter(([botName, bot]) => typeof bot === 'object' && bot !== null && !Array.isArray(bot))
              .map(([botName, bot]) => (
              <div
                key={botName}
                className="rounded-lg border p-4 cursor-pointer hover:opacity-80 transition-opacity"
                style={cardStyles}
                onClick={() => openEditBotModal(botName, bot)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold flex items-center gap-2 truncate" style={{ color: 'var(--theme-content-text)' }}>
                    <Bot className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{botName}</span>
                  </h3>
                </div>
                {bot.description && (
                  <p className="text-xs mb-3 truncate" style={{ color: 'var(--theme-content-text-muted)' }}>
                    {bot.description}
                  </p>
                )}
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
              <div className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                      Название бота (Профиль) <span style={{ color: 'var(--accent-warning)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newBotName}
                      onChange={(e) => {
                        // Разрешаем только латиницу, цифры, подчёркивания и дефисы
                        const value = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                        setNewBotName(value);
                      }}
                      placeholder="my_bot-profile"
                      className="w-full px-3 py-2 rounded border"
                      style={inputStyles}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Только латиница, цифры, подчёркивание и дефис
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                      Шаблон
                    </label>
                      <TemplateSelect
                      value={newBotTemplate}
                      onChange={(id) => setNewBotTemplate(id)}
                      className="flex-1"
                      placeholder="Выберите шаблон (опционально)"
                      />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                      Описание
                    </label>
                    <input
                      type="text"
                      value={newBotDescription}
                      onChange={(e) => setNewBotDescription(e.target.value)}
                      placeholder="Описание бота"
                      className="w-full px-3 py-2 rounded border"
                      style={inputStyles}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                      chat_id
                    </label>
                    <input
                      type="text"
                      value={newBotChatId}
                      onChange={(e) => setNewBotChatId(e.target.value)}
                      placeholder="1234567890 или -1001234567890"
                      className="w-full px-3 py-2 rounded border font-mono text-sm"
                      style={inputStyles}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                      chat_id используется для отправки сообщений от бота в определённый чат или канал.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                      Токен бота <span style={{ color: 'var(--accent-warning)' }}>*</span>
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
                      setNewBotDescription('');
                      setNewBotChatId('');
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
            onRefresh={() => fetchTableData(limit, offset, filters, filterMode, sortField, sortDirection)}
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
              {/* Описание */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Описание
                </label>
                <input
                  type="text"
                  value={editBotDescription}
                  onChange={(e) => setEditBotDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyles}
                  placeholder="Описание бота"
                />
              </div>

              {/* Chat ID */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  chat_id
                </label>
                <input
                  type="text"
                  value={editBotChatId}
                  onChange={(e) => setEditBotChatId(e.target.value)}
                  className="w-full px-3 py-2 rounded border font-mono text-sm"
                  style={inputStyles}
                  placeholder="1234567890 или -1001234567890"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                  chat_id используется для отправки сообщений от бота в определённый чат или канал.
                </p>
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

              {/* Токен */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Токен бота
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editBotToken}
                    onChange={(e) => setEditBotToken(e.target.value)}
                    className="flex-1 px-3 py-2 rounded border font-mono text-sm"
                    style={inputStyles}
                    placeholder="123456:ABC-DEF1234..."
                  />
                  <button
                    onClick={() => getUpdates(editBotToken)}
                    disabled={getUpdatesLoading || !editBotToken}
                    className="px-4 py-2 rounded flex items-center justify-center gap-2 whitespace-nowrap"
                    style={{
                      backgroundColor: getUpdatesLoading || !editBotToken ? 'var(--theme-button-secondary-bg)' : 'var(--accent-primary)',
                      color: getUpdatesLoading || !editBotToken ? 'var(--theme-button-secondary-text)' : 'var(--accent-text)',
                      opacity: getUpdatesLoading || !editBotToken ? 0.6 : 1,
                      cursor: getUpdatesLoading || !editBotToken ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {getUpdatesLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      </>
                    ) : (
                      'getUpdates'
                    )}
                  </button>
                </div>
              </div>

              {/* getUpdates результат */}
              {getUpdatesResult && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Результат getUpdates
                  </label>
                  <div
                    className="p-3 rounded border font-mono text-xs max-h-48 overflow-y-auto"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: getUpdatesError ? 'var(--accent-danger)' : 'var(--theme-input-border)',
                      color: 'var(--theme-content-text)',
                    }}
                  >
                    <pre>{JSON.stringify(getUpdatesResult, null, 2)}</pre>
                  </div>
                  {getUpdatesError && (
                    <p className="text-xs mt-1" style={{ color: 'var(--accent-danger)' }}>
                      ⚠️ {getUpdatesError}
                    </p>
                  )}
                </div>
              )}

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

              {/* Статус вебхука - показываем только если выбран шаблон */}
              {editBotTemplate && (
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
              )}

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
            className="rounded-lg border p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
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

              {/* Allowed Updates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--theme-content-text)' }}>
                    Типы обновлений (allowed_updates)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWebhookAllowedUpdates([...defaultAllowedUpdates])}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--theme-button-secondary-bg)',
                        color: 'var(--theme-button-secondary-text)',
                      }}
                    >
                      По умолчанию
                    </button>
                    <button
                      onClick={() => setWebhookAllowedUpdates(allTelegramUpdates.map(u => u.key))}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--theme-button-secondary-bg)',
                        color: 'var(--theme-button-secondary-text)',
                      }}
                    >
                      Выбрать все
                    </button>
                    <button
                      onClick={() => setWebhookAllowedUpdates([])}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--theme-button-secondary-bg)',
                        color: 'var(--theme-button-secondary-text)',
                      }}
                    >
                      Очистить
                    </button>
                  </div>
                </div>
                <div
                  className="max-h-64 overflow-y-auto rounded border p-3 space-y-2"
                  style={{
                    backgroundColor: 'var(--theme-input-bg)',
                    borderColor: 'var(--theme-input-border)',
                  }}
                >
                  {allTelegramUpdates.map((update) => (
                    <label
                      key={update.key}
                      className="flex items-start gap-2 cursor-pointer p-2 rounded hover:opacity-80"
                      style={{ backgroundColor: webhookAllowedUpdates.includes(update.key) ? 'var(--accent-primary-transparent, rgba(59, 130, 246, 0.1))' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={webhookAllowedUpdates.includes(update.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWebhookAllowedUpdates([...webhookAllowedUpdates, update.key]);
                          } else {
                            setWebhookAllowedUpdates(webhookAllowedUpdates.filter(u => u !== update.key));
                          }
                        }}
                        className="mt-1 w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-mono font-medium" style={{ color: 'var(--theme-content-text)' }}>
                          {update.label}
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-content-text-muted)' }}>
                          {update.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Выбрано: {webhookAllowedUpdates.length} из {allTelegramUpdates.length}
                </p>
              </div>

              {/* getUpdates результат */}
              {getUpdatesResult && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                    Результат getUpdates
                  </label>
                  <div
                    className="p-3 rounded border font-mono text-xs max-h-64 overflow-y-auto"
                    style={{
                      backgroundColor: 'var(--theme-input-bg)',
                      borderColor: getUpdatesError ? 'var(--accent-danger)' : 'var(--theme-input-border)',
                      color: 'var(--theme-content-text)',
                    }}
                  >
                    <pre>{JSON.stringify(getUpdatesResult, null, 2)}</pre>
                  </div>
                  {getUpdatesError && (
                    <p className="text-xs mt-1" style={{ color: 'var(--accent-danger)' }}>
                      ⚠️ {getUpdatesError}
                    </p>
                  )}
                </div>
              )}

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

      {/* Модальное окно настройки OTP */}
      {otpSetupModal && otpSetupData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setOtpSetupModal(false)}
        >
          <div
            className="rounded-lg border p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={cardStyles}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
              <Shield className="w-6 h-6" />
              Настройка двухфакторной аутентификации
            </h2>

            <div className="space-y-6">
              {/* Секретный ключ */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Секретный ключ (для ввода вручную)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otpSetupData.secret}
                    readOnly
                    className="flex-1 px-3 py-2 rounded border font-mono text-sm"
                    style={{ ...inputStyles, opacity: 0.8 }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(otpSetupData.secret);
                      toast.success('Секретный ключ скопирован');
                    }}
                    className="px-3 py-2 rounded flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--theme-button-secondary-bg)',
                      color: 'var(--theme-button-secondary-text)',
                    }}
                    title="Скопировать секрет"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Кнопки открытия в приложениях */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Добавить в приложение-аутентификатор
                </label>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={otpSetupData.qr_url}
                    className="px-4 py-2 rounded flex items-center gap-2 no-underline"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Открыть в приложении
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(otpSetupData.qr_url);
                      toast.success('Ссылка скопирована');
                    }}
                    className="px-4 py-2 rounded flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--theme-button-secondary-bg)',
                      color: 'var(--theme-button-secondary-text)',
                    }}
                  >
                    <Copy className="w-4 h-4" />
                    Скопировать ссылку
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Поддерживаются: Apple Пароли, Bitwarden, 1Password, Google Authenticator, Authy и другие
                </p>
              </div>

              {/* Резервные коды */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Резервные коды (сохраните в безопасном месте)
                </label>
                <div className="p-4 rounded border" style={{ ...inputStyles, opacity: 0.8 }}>
                  <div className="grid grid-cols-2 gap-2">
                    {otpSetupData.backup_codes?.map((code: string, idx: number) => (
                      <code key={idx} className="block font-mono text-sm" style={{ color: 'var(--theme-content-text)' }}>
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--accent-warning)' }}>
                  Сохраните эти коды! Они понадобятся для входа, если вы потеряете доступ к приложению аутентификатора.
                </p>
              </div>

              {/* QR код */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Отсканируйте QR-код в приложении аутентификатора
                </label>
                <div className="flex justify-center p-4 rounded border" style={inputStyles}>
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center" style={{ color: 'var(--theme-content-text-muted)' }}>
                      Генерация QR кода...
                    </div>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                  Используйте Google Authenticator, Authy или любое другое приложение для TOTP
                </p>
              </div>

              {/* Поле ввода кода */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Введите 6-значный код из приложения для подтверждения
                </label>
                <input
                  type="text"
                  value={otpVerifyToken}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpVerifyToken(value);
                    setOtpError('');
                  }}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-3 py-2 rounded border font-mono text-lg text-center"
                  style={inputStyles}
                />
                {otpError && (
                  <p className="text-sm mt-1" style={{ color: 'var(--accent-danger)' }}>
                    {otpError}
                  </p>
                )}
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
                <button
                  onClick={verifyAndEnableOtp}
                  disabled={otpVerifyToken.length !== 6}
                  className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: otpVerifyToken.length === 6 ? 'var(--accent-success)' : 'var(--theme-button-secondary-bg)',
                    color: otpVerifyToken.length === 6 ? 'white' : 'var(--theme-button-secondary-text)',
                    opacity: otpVerifyToken.length === 6 ? 1 : 0.6,
                    cursor: otpVerifyToken.length === 6 ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Shield className="w-4 h-4" />
                  Включить OTP
                </button>
                <button
                  onClick={() => setOtpSetupModal(false)}
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

      {/* Модальное окно переименования Passkey */}
      {passkeyRenameModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setPasskeyRenameModal(false)}
        >
          <div
            className="rounded-lg border p-6 max-w-md w-full mx-4"
            style={cardStyles}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--theme-content-text)' }}>
              <Key className="w-6 h-6" />
              Переименовать Passkey
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
                  Название
                </label>
                <input
                  type="text"
                  value={passkeyRenameName}
                  onChange={(e) => setPasskeyRenameName(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={inputStyles}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
                <button
                  onClick={renamePasskey}
                  className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-success)',
                    color: 'white',
                  }}
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
                <button
                  onClick={() => setPasskeyRenameModal(false)}
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

      <ConfirmDialog />
    </div>
  );
}

export default ConfigurationTabs;
