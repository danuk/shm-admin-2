import { useAuthStore } from '../store/authStore';
import { createApiUrl, createPath } from './basePath';

export async function shm_request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const sessionId = useAuthStore.getState().getSessionId();

  // Ensure API URLs use proper base path
  const fullUrl = url.startsWith('http') ? url : createApiUrl(url);

  const response = await fetch(fullUrl, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'session-id': sessionId } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = createPath('/login');
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any;

    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || response.statusText };
    }

    const error = new Error(errorData.error || errorText || response.statusText) as any;
    error.data = errorData;
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  return data;

}

export interface ApiListResponse<T = any> {
  data: T[];
  total: number;
}

export function normalizeListResponse<T = any>(res: any): ApiListResponse<T> {
  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  const data = res.data || [];
  const total = res.items ?? res.total ?? data.length;
  return { data, total };
}

export async function shm_login(login: string, password: string, otpToken?: string): Promise<any> {
  const response = await fetch(createApiUrl('shm/v1/user/auth'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login,
      password,
      ...(otpToken ? { otp_token: otpToken } : {})
    }),
  });

  if (!response.ok) {
    throw new Error('Неверный логин или пароль');
  }

  const data = await response.json();

  if (data.status === 'fail' && data.msg === 'INVALID_OTP_TOKEN') {
    throw new Error('Неверный OTP код');
  }

  if (data.otp_required) {
    return { otpRequired: true, login: data.login };
  }

  const sessionId = data.id;

  if (!sessionId) {
    throw new Error('Не получен session_id');
  }

  const userResponse = await fetch(createApiUrl('shm/v1/user'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'session-id': sessionId,
    },
  });

  if (userResponse.ok) {
    const userData = await userResponse.json();
    const user = userData.data?.[0] || userData;
    return { user, sessionId };
  }

  return {
    user: {
      user_id: 0,
      login,
      gid: 1
    },
    sessionId
  };
}

// ===== Passkey Functions =====

export function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function checkPasskeyAvailable(login: string): Promise<{ available: boolean; options?: any }> {
  try {
    const response = await fetch(createApiUrl('shm/v1/user/passkey/auth/options/public'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login }),
    });

    if (!response.ok) {
      return { available: false };
    }

    const data = await response.json();
    const result = data.data?.[0] || data;
    
    if (result.passkey_available === 0 || !result.challenge) {
      return { available: false };
    }

    return { available: true, options: result };
  } catch {
    return { available: false };
  }
}

export async function authenticateWithPasskey(login: string, options: any): Promise<any> {
  // Преобразуем challenge и credential IDs
  const challenge = base64urlToArrayBuffer(options.challenge);
  
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: options.timeout,
    rpId: options.rpId,
    allowCredentials: options.allowCredentials?.map((cred: any) => ({
      ...cred,
      id: base64urlToArrayBuffer(cred.id),
    })),
    userVerification: options.userVerification as UserVerificationRequirement,
  };

  // Вызываем WebAuthn API
  const credential = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Не удалось получить credential');
  }

  const assertionResponse = credential.response as AuthenticatorAssertionResponse;

  // Отправляем результат на сервер
  const authResponse = await fetch(createApiUrl('shm/v1/user/passkey/auth/public'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login,
      credential_id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      response: {
        clientDataJSON: arrayBufferToBase64url(assertionResponse.clientDataJSON),
        authenticatorData: arrayBufferToBase64url(assertionResponse.authenticatorData),
        signature: arrayBufferToBase64url(assertionResponse.signature),
        userHandle: assertionResponse.userHandle ? arrayBufferToBase64url(assertionResponse.userHandle) : null,
      },
    }),
  });

  if (!authResponse.ok) {
    const errorData = await authResponse.json();
    throw new Error(errorData.error || 'Ошибка аутентификации с Passkey');
  }

  const authData = await authResponse.json();
  const result = authData.data?.[0] || authData;
  
  if (!result.id) {
    throw new Error('Не получен session_id');
  }

  // Получаем данные пользователя
  const userResponse = await fetch(createApiUrl('shm/v1/user'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'session-id': result.id,
    },
  });

  if (userResponse.ok) {
    const userData = await userResponse.json();
    const user = userData.data?.[0] || userData;
    return { user, sessionId: result.id };
  }

  return {
    user: {
      user_id: 0,
      login,
      gid: 1
    },
    sessionId: result.id
  };
}
