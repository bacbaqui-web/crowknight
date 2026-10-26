import { preloadGroundPatterns } from './ground_patterns.js';
import { preloadSceneryArt } from './scenery_art.js';
const { navigator, URL } = window;

function waitFor(target, type, ready) {
  if (ready()) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      target.removeEventListener(type, check);
      resolve();
    };
    const check = () => {
      if (ready()) finish();
    };
    const timer = setTimeout(finish, 4000);
    target.addEventListener(type, check);
    check();
  });
}

// Install the fresh-script fetch path before loading the module graph, including its dependencies.
if ('serviceWorker' in navigator) {
  try {
    const workerUrl = new URL('../../sw.js?runtime=script-refresh-2', import.meta.url);
    const registration = await navigator.serviceWorker.register(workerUrl, {
      scope: new URL('../../', import.meta.url).pathname,
      updateViaCache: 'none',
    });
    const worker = registration.installing || registration.waiting;
    if (worker) await waitFor(worker, 'statechange', () => ['activated', 'redundant'].includes(worker.state));
    await waitFor(
      navigator.serviceWorker,
      'controllerchange',
      () => navigator.serviceWorker.controller?.scriptURL === workerUrl.href
    );
  } catch {
    // Keep the existing game available when the browser cannot install a worker.
  }
}
await Promise.all([preloadSceneryArt(), preloadGroundPatterns()]);
const entry = new URL('../main.js', import.meta.url);
entry.searchParams.set('__source', Date.now().toString(36));
await import(entry.href);
