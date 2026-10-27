import { createFramePerformance } from '../frame_performance_helper.js';

const STORAGE_KEY = 'crowKnight.quarterFpsVisible';
export function createPerformanceView({
  button,
  panel,
  root,
  getCounters,
  isPaused,
  clock = () => performance.now(),
  storage = browserStorage(),
}) {
  const stats = createFramePerformance();
  const value = panel.querySelector('[data-fps-value]'),
    timing = panel.querySelector('[data-fps-timing]'),
    cache = panel.querySelector('[data-fps-cache]');
  let visible = false,
    refreshed = null,
    before = null;
  try {
    visible = !button.hidden && storage?.getItem(STORAGE_KEY) === '1';
  } catch {
    /* Optional preference. */
  }
  function sync() {
    button.setAttribute('aria-pressed', String(visible));
    button.textContent = `FPS 표시: ${visible ? '켜짐' : '꺼짐'}`;
    panel.hidden = !visible;
    root.classList.toggle('quarter-fps-visible', visible);
    stats.reset();
    refreshed = null;
    before = visible ? { ...getCounters() } : null;
    value.textContent = '측정 중…';
    timing.textContent = '최근 1초 · 0.25초마다 갱신';
    cache.textContent = '';
  }
  button.addEventListener('click', () => {
    visible = !visible;
    sync();
    try {
      storage?.setItem(STORAGE_KEY, visible ? '1' : '0');
    } catch {
      /* Optional preference. */
    }
  });
  sync();
  return {
    start: () => (visible ? clock() : null),
    finish(now, start, rendered) {
      if (!visible || start == null) return;
      stats.record(now, clock() - start, rendered);
      const counters = getCounters();
      if (!before) before = { ...counters };
      if (refreshed != null && now - refreshed < 250) return;
      const sample = stats.snapshot();
      if (!sample) return;
      refreshed = now;
      setText(value, isPaused() ? '일시정지' : `${sample.fps.toFixed(1)} FPS`);
      setText(
        timing,
        isPaused()
          ? `최근 1초 장면 ${sample.rendered}회 · 처리 ${sample.workMs.toFixed(2)}ms`
          : `프레임 ${sample.frameMs.toFixed(1)}ms · 처리 ${sample.workMs.toFixed(2)}ms`
      );
      const hits = counters.groundHits - before.groundHits,
        builds = counters.groundBuilds - before.groundBuilds;
      setText(cache, `바닥 캐시: 재사용 ${hits} · 생성 ${builds}`);
      before = { ...counters };
    },
    reset() {
      stats.reset();
      refreshed = null;
      before = visible ? { ...getCounters() } : null;
    },
  };
}

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}
