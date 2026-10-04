const FILES = {
  clubSwing: ['club-swing.wav', 0.33, 0.92],
  swordSwing: ['sword-swing.wav', 0.26, 1.08],
  bossSwing: ['club-swing.wav', 0.44, 0.68],
  clubHit: ['club-hit.wav', 0.55, 0.9],
  swordHit: ['sword-hit.wav', 0.35, 1],
  bossHit: ['club-hit.wav', 0.65, 0.72],
  guardRaise: ['guard-raise.wav', 0.16, 1.15],
  block: ['shield-block.wav', 0.4, 0.93],
  parry: ['shield-block.wav', 0.48, 1.28],
};

export function createCombatAudioPlayer() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return { play() {}, reset() {}, unlock: async () => {}, loading: Promise.resolve(), loadedCount: () => 0 };
  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = 0.7;
  const limiter = context.createDynamicsCompressor();
  master.connect(limiter);
  limiter.connect(context.destination);
  const buffers = new Map();
  const voices = new Set();
  const lastPlayed = new Map();
  let muted = false;
  let ready = false;
  const loading = Promise.all([...new Set(Object.values(FILES).map(([file]) => file))].map(async (file) => {
    try {
      const response = await fetch(new URL(`../assets/audio/combat/${file}`, import.meta.url));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffers.set(file, await context.decodeAudioData(await response.arrayBuffer()));
    } catch (error) {
      console.warn(`전투 효과음 로드 실패: ${file}`, error);
    }
  })).then(() => { ready = true; });
  function unlock() { return context.resume().catch(() => {}); }
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'combatSoundToggle';
  button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:20;background:#182331;color:#fff;border:1px solid #758391;border-radius:8px;padding:8px;cursor:pointer';
  function syncButton() {
    button.textContent = muted ? '소리 꺼짐' : '소리 켜짐';
    button.setAttribute('aria-label', muted ? '효과음 켜기' : '효과음 끄기');
    button.setAttribute('aria-pressed', String(!muted));
  }
  button.addEventListener('click', () => {
    muted = !muted;
    master.gain.setValueAtTime(muted ? 0 : 0.7, context.currentTime);
    syncButton();
  });
  syncButton();
  document.body.append(button);
  function play(name) {
    const sound = FILES[name];
    if (!ready || muted || !sound || context.state !== 'running' || document.hidden) return;
    const [file, volume, rate] = sound;
    const buffer = buffers.get(file);
    if (!buffer || voices.size >= 20) return;
    const now = context.currentTime;
    if (now - (lastPlayed.get(name) ?? -Infinity) < 0.045) return;
    lastPlayed.set(name, now);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate * (0.96 + Math.random() * 0.08);
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(master);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
  }
  function reset() {
    for (const source of voices) source.stop();
    lastPlayed.clear();
  }
  return { play, reset, loading, unlock, loadedCount: () => buffers.size };
}
