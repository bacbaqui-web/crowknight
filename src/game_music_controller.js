export function createGameMusicController() {
  const music = new Audio(new URL('../assets/audio/music/dream-tiger.mp3', import.meta.url).href);
  music.loop = true;
  music.preload = 'metadata';
  music.volume = 0.15;
  music.id = 'gameOst';
  music.hidden = true;
  let active = false;
  let muted = false;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'gameMusicToggle';
  button.style.cssText = 'position:fixed;right:12px;bottom:58px;z-index:20;background:#182331;color:#fff;border:1px solid #758391;border-radius:8px;padding:8px;cursor:pointer';
  function syncButton() {
    button.textContent = muted ? '음악 꺼짐' : '음악 켜짐';
    button.setAttribute('aria-label', muted ? 'OST 켜기' : 'OST 끄기');
    button.setAttribute('aria-pressed', String(!muted));
  }
  function play() {
    if (active && !document.hidden) void music.play().catch(() => {});
  }
  button.addEventListener('click', () => {
    muted = !muted;
    music.muted = muted;
    syncButton();
    play();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music.pause();
    else play();
  });
  // Retry only after a real gesture if the browser initially blocks playback.
  window.addEventListener('pointerdown', play, { capture: true });
  window.addEventListener('keydown', play, { capture: true });
  syncButton();
  document.body.append(music, button);
  return {
    start() { active = true; music.currentTime = 0; play(); },
    stop() { active = false; music.pause(); },
  };
}
