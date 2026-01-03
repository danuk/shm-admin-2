/**
 * Utility functions for handling base paths in the application
 */

/**
 * Get the base path from the HTML base tag
 */
export function getBasePath(): string {
  const baseElement = document.querySelector('base');
  let basePath = baseElement?.getAttribute('href') || '/';

  // Ensure base path ends with /
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }

  return basePath;
}

/**
 * Create an absolute path relative to the application base path
 * @param path - The path to make relative to base (should start with /)
 * @returns The full path including base path
 */
export function createPath(path: string): string {
  const basePath = getBasePath();

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // If base path is just '/', return the original path
  if (basePath === '/') {
    return `/${cleanPath}`;
  }

  // Combine base path with the clean path
  return `${basePath}${cleanPath}`;
}

/**
 * Create an API URL with proper base path
 * @param endpoint - API endpoint (e.g., 'shm/v1/users')
 * @returns Full API URL with base path
 */
export function createApiUrl(endpoint: string): string {
  const basePath = getBasePath();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  if (basePath === '/') {
    return `/${cleanEndpoint}`;
  }

  return `${basePath}${cleanEndpoint}`;
}