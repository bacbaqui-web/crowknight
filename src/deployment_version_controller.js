const VERSION_STORAGE_KEY = 'crowKnight.deploymentVersion';
const VERSION_CHECK_INTERVAL = 300_000;

export function createDeploymentVersionController({ canReload = () => true } = {}) {
  let pendingVersion = '';
  let intervalId = 0;

  registerServiceWorker();
  checkForUpdate();
  intervalId = window.setInterval(checkForUpdate, VERSION_CHECK_INTERVAL);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  async function checkForUpdate() {
    const serverVersion = await loadServerVersion();
    if (!serverVersion) return false;

    const storedVersion = readStoredVersion();
    if (!storedVersion) {
      writeStoredVersion(serverVersion);
      if (currentUrlVersion() !== serverVersion) {
        pendingVersion = serverVersion;
        if (canReload()) applyPendingUpdate();
        return true;
      }
      return false;
    }
    if (storedVersion === serverVersion) return false;

    pendingVersion = serverVersion;
    if (canReload()) applyPendingUpdate();
    return true;
  }

  function applyPendingUpdate() {
    if (!pendingVersion) return false;
    const nextVersion = pendingVersion;
    pendingVersion = '';
    refreshForVersion(nextVersion);
    return true;
  }

  function handleVisibilityChange() {
    if (!document.hidden) checkForUpdate();
  }

  function stop() {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    applyPendingUpdate,
    checkForUpdate,
    stop,
  };
}

async function loadServerVersion() {
  try {
    const response = await window.fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return '';
    const payload = await response.json();
    return String(payload?.version || '').trim();
  } catch {
    return '';
  }
}

async function refreshForVersion(version) {
  writeStoredVersion(version);
  await clearBrowserCaches();
  const url = new window.URL(window.location.href);
  url.searchParams.set('v', version);
  window.location.replace(url);
}

async function clearBrowserCaches() {
  if (!('caches' in window)) return;
  try {
    const names = await window.caches.keys();
    await Promise.all(names.map((name) => window.caches.delete(name)));
  } catch {
    // A cache clear failure should not block the versioned reload.
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in window.navigator)) return;
  try {
    const registration = await window.navigator.serviceWorker.register('./sw.js', {
      scope: './',
      updateViaCache: 'none',
    });
    await registration.update();
  } catch {
    // Versioned reload still works when service workers are unavailable.
  }
}

function readStoredVersion() {
  try {
    return window.localStorage.getItem(VERSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredVersion(version) {
  try {
    window.localStorage.setItem(VERSION_STORAGE_KEY, version);
  } catch {
    // Private browsing may block localStorage.
  }
}

function currentUrlVersion() {
  try {
    return new window.URL(window.location.href).searchParams.get('v') || '';
  } catch {
    return '';
  }
}
