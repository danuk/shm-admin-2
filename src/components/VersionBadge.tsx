import { useEffect, useState } from 'react';
import { getVersion, VersionInfo } from '../lib/version';
import toast from 'react-hot-toast';
import {
  Calendar,
  Tag,
  GithubIcon,
  Copy,
  X,
  Hash
} from 'lucide-react';

export function VersionBadge() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewerVersion, setHasNewerVersion] = useState(false);
  const [newerVersion, setNewerVersion] = useState('');

  useEffect(() => {
    getVersion().then(setVersion);

    // Проверяем наличие новой версии
    const hasNewer = sessionStorage.getItem('hasNewerVersion') === 'true';
    const newer = sessionStorage.getItem('newerVersion') || '';
    setHasNewerVersion(hasNewer);
    setNewerVersion(newer);
  }, []);

  const handleCopy = (value: any) => {
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    navigator.clipboard.writeText(text);
    toast.success('Скопировано');
  };

  if (!version) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
          title="Информация о версии"
        >
          {version.backend.version}
          {hasNewerVersion && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-6 min-w-[400px] max-w-[90vw] max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                    Информация о версии
                    <button
                        onClick={() => handleCopy(version)}
                        className="self-end px-3 rounded items-center gap-2 text-sm"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                {hasNewerVersion && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Доступна новая версия: {newerVersion}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Версия
                  <button
                    onClick={() => handleCopy(version.backend.version)}
                    className="self-end px-3 rounded items-center gap-2 text-sm"
                   >
                    <Copy className="w-3 h-3" />
                  </button></div>
                  <div className="font-mono font-semibold text-base">{version.backend.version}</div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {version.backend.commitSha && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-2">
                            Backend
                            <button
                                onClick={() => handleCopy(version.backend)}
                                className="self-end px-3 rounded items-center gap-2 text-sm"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded break-all">
                        <GithubIcon className="inline-block mr-1 mb-0.5 w-4 h-4 text-gray-400" />
                        {version.backend.commitUrl ? (
                            <a
                              href={version.backend.commitUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {version.backend.commitSha}
                            </a>
                          ) : (
                            version.backend.commitSha
                          )}
                          {version.backend.version && (
                            <div className="mt-1 text-gray-500">
                              Version: {version.backend.version}
                            </div>
                          )}
                          {version.backend.branch && (
                            <div className="mt-1 text-gray-500">
                              Branch: {version.backend.branch}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {version.frontend.commitSha && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-2">
                            Frontend
                            <button
                                onClick={() => handleCopy(version.frontend)}
                                className="self-end px-3 rounded items-center gap-2 text-sm"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded break-all">
                          <GithubIcon className="inline-block mr-1 mb-0.5 w-4 h-4 text-gray-400" />
                          {version.frontend.commitUrl ? (
                            <a
                              href={version.frontend.commitUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {version.frontend.commitSha}
                            </a>
                          ) : (
                            version.frontend.commitSha
                          )}
                          {version.frontend.version && (
                            <div className="mt-1 text-gray-500">
                              Version: {version.frontend.version}
                            </div>
                          )}
                          {version.frontend.branch && (
                            <div className="mt-1 text-gray-500">
                              Branch: {version.frontend.branch}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
