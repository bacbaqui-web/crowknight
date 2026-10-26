import { COMBAT_SOUNDS, soundPlacement } from './combat_sound_catalog.js';

export function createCombatAudioPlayer() {
  const { fetch, URL, console } = window;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass)
    return {
      play() {},
      reset() {},
      setPaused() {},
      setListener() {},
      unlock: async () => {},
      loading: Promise.resolve(),
      loadedCount: () => 0,
    };
  const context = new AudioContextClass();
  const master = context.createGain(),
    limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 12;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;
  master.connect(limiter);
  limiter.connect(context.destination);
  const buffers = new Map(),
    voices = new Set(),
    lastPlayed = new Map();
  let muted = false,
    paused = false,
    ready = false,
    listener = null,
    volume = 0.65,
    played = 0;
  try {
    const saved = JSON.parse(window.localStorage.getItem('crowKnight.sound') || 'null');
    if (saved) {
      muted = saved.muted === true;
      volume = Math.max(0, Math.min(1, Number.isFinite(Number(saved.volume)) ? Number(saved.volume) : 0.65));
    }
  } catch {
    /* Sound stays available when storage is blocked. */
  }
  master.gain.value = muted ? 0 : volume;
  const loading = Promise.all(
    [...new Set(Object.values(COMBAT_SOUNDS).flatMap((s) => s.files))].map(async (file) => {
      try {
        const response = await fetch(new URL(`../assets/audio/combat/${file}`, import.meta.url));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffers.set(file, await context.decodeAudioData(await response.arrayBuffer()));
      } catch (error) {
        console.warn(`전투 효과음 로드 실패: ${file}`, error);
      }
    })
  ).then(() => {
    ready = true;
  });
  function unlock() {
    return context.resume().catch(() => {});
  }
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) reset();
  });
  const controls = document.createElement('div');
  controls.style.cssText =
    'position:fixed;right:12px;bottom:12px;z-index:20;display:flex;align-items:center;gap:8px;background:#182331;color:#fff;border:1px solid #758391;border-radius:8px;padding:7px';
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'combatSoundToggle';
  button.style.cssText = 'background:transparent;color:inherit;border:0;cursor:pointer';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(Math.round(volume * 100));
  slider.setAttribute('aria-label', '효과음 음량');
  slider.style.width = '75px';
  function sync() {
    button.textContent = muted ? '소리 꺼짐' : '소리 켜짐';
    button.setAttribute('aria-label', muted ? '효과음 켜기' : '효과음 끄기');
    button.setAttribute('aria-pressed', String(!muted));
    master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.015);
    try {
      window.localStorage.setItem('crowKnight.sound', JSON.stringify({ muted, volume }));
    } catch {
      /* Optional preference. */
    }
  }
  button.addEventListener('click', () => {
    muted = !muted;
    if (muted) reset();
    sync();
  });
  slider.addEventListener('input', () => {
    volume = Number(slider.value) / 100;
    sync();
  });
  const credits = document.createElement('a');
  credits.href = new URL('../assets/audio/combat/credits.html', import.meta.url).href;
  credits.textContent = '음원 출처';
  credits.target = '_blank';
  credits.rel = 'noopener';
  credits.style.cssText = 'color:#b6dbae;font-size:11px';
  controls.append(button, slider, credits);
  document.body.append(controls);
  sync();
  function play(name, position = null) {
    const sound = COMBAT_SOUNDS[name];
    if (!ready || muted || paused || !sound || volume === 0 || context.state !== 'running' || document.hidden)
      return false;
    const spatial = soundPlacement(position, listener);
    if (spatial.gain < 0.03) return false;
    const now = context.currentTime;
    if (now - (lastPlayed.get(name) ?? -Infinity) < sound.cooldown) return false;
    const file = sound.files[Math.floor(Math.random() * sound.files.length)],
      buffer = buffers.get(file);
    if (!buffer) return false;
    if ([...voices].filter((v) => v.name === name).length >= 4) return false;
    if (voices.size >= 24) {
      const victim = [...voices].find((v) => v.priority < sound.priority);
      if (!victim) return false;
      voices.delete(victim);
      victim.source.stop();
    }
    lastPlayed.set(name, now);
    const source = context.createBufferSource(),
      gain = context.createGain(),
      pan = context.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = sound.rate;
    gain.gain.value = sound.gain * spatial.gain;
    pan.pan.value = spatial.pan;
    source.connect(gain);
    gain.connect(pan);
    pan.connect(master);
    const voice = { source, name, priority: sound.priority };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
    source.start();
    played++;
    return true;
  }
  function reset() {
    for (const v of voices) v.source.stop();
    voices.clear();
    lastPlayed.clear();
  }
  function setPaused(value) {
    if (value && !paused) reset();
    paused = Boolean(value);
  }
  return {
    play,
    reset,
    loading,
    unlock,
    setPaused,
    setListener(value) {
      listener = value;
    },
    loadedCount: () => buffers.size,
    diagnostics: () => ({
      loaded: buffers.size,
      voices: voices.size,
      played,
      paused,
      muted,
      volume,
      state: context.state,
    }),
  };
}
