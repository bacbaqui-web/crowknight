const DEFAULT_LOCAL_API_ORIGIN = 'http://127.0.0.1:4176';
const LIVE_SERVER_PORTS = new Set(['5500', '5501', '5502']);

export function localApiUrl(path) {
  const normalizedPath = normalizeApiPath(path);
  if (usesSeparateLocalApi()) {
    return `${localApiOrigin()}${normalizedPath}`;
  }
  return `.${normalizedPath}`;
}

function usesSeparateLocalApi() {
  const port = window.location?.port || '';
  return LIVE_SERVER_PORTS.has(port);
}

function localApiOrigin() {
  const configured =
    window.CROW_KNIGHT_LOCAL_API_ORIGIN ||
    safeLocalStorageValue('crowKnight.localApiOrigin') ||
    DEFAULT_LOCAL_API_ORIGIN;
  return String(configured).replace(/\/+$/, '');
}

function normalizeApiPath(path) {
  const value = String(path || '').trim();
  if (!value) return '/api';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const url = new window.URL(value);
    return url.pathname + url.search;
  }
  return `/${value.replace(/^\.?\//, '')}`;
}

function safeLocalStorageValue(key) {
  try {
    return window.localStorage?.getItem(key);
  } catch {
    return '';
  }
}
