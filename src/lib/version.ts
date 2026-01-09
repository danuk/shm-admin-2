export interface VersionInfo {
  backend: {
    version: string;
    commitSha: string;
    branch: string;
    commitUrl: string;
  };
  frontend: {
    version: string;
    commitSha: string;
    branch: string;
    commitUrl: string;
  };
}

let versionCache: VersionInfo | null = null;

// Извлекает major.minor из версии (например, "1.0.2-5c213a6" -> "1.0")
function getMajorMinor(version: string): { major: number; minor: number } | null {
  const match = version.match(/^(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
  };
}

// Сравнивает две версии (только major.minor)
// Возвращает true если newVersion > currentVersion
export function isNewerVersion(currentVersion: string, newVersion: string): boolean {
  const current = getMajorMinor(currentVersion);
  const newer = getMajorMinor(newVersion);

  if (!current || !newer) return false;

  if (newer.major > current.major) return true;
  if (newer.major === current.major && newer.minor > current.minor) return true;

  return false;
}

export async function getVersion(): Promise<VersionInfo> {
  if (versionCache) {
    return versionCache;
  }

  try {
    const response = await fetch('/version.json');
    if (!response.ok) {
      throw new Error('Failed to fetch version info');
    }
    const local_version = localStorage.getItem('version') || 'local';
    const github_shm_version = localStorage.getItem('github_shm_version') || '';

    versionCache = await response.json();
    if (versionCache) {
      versionCache.backend.version = local_version;

      // Проверяем наличие новой версии
      if (github_shm_version && isNewerVersion(local_version, github_shm_version)) {
        // Сохраняем информацию о новой версии
        sessionStorage.setItem('hasNewerVersion', 'true');
        sessionStorage.setItem('newerVersion', github_shm_version);
      } else {
        sessionStorage.removeItem('hasNewerVersion');
        sessionStorage.removeItem('newerVersion');
      }
    }
    return versionCache!;
  } catch (error) {
    console.error('Failed to load version info:', error);
    // Return default version info
    return {
        backend: {
          version: '',
          commitSha: '',
          branch: '',
          commitUrl: '',
        },
        frontend: {
          version: '',
          commitSha: '',
          branch: '',
          commitUrl: '',
        },
    }
  }
}

// Export for debugging in console
if (typeof window !== 'undefined') {
  (window as any).getVersion = getVersion;
}
