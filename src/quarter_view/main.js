import { loadSavedState } from '../project_storage_helper.js';
import { actorDefsFromSavedState, createActorFromDef } from '../actor_factory.js';
import { createState, spawnWave, tick, unit, unproject } from './simulation.js';
import { createRenderer } from './renderer.js';

const canvas = document.querySelector('#arena');
const message = document.querySelector('#message');
const keys = new Set();
const controls = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'KeyP',
  'KeyR',
]);
let state,
  renderer,
  pointer = null,
  mouseDown = false;
function clearInput() {
  keys.clear();
  mouseDown = false;
  pointer = null;
}
function restart() {
  if (!renderer) return;
  clearInput();
  state = createState();
  spawnWave(state);
  document.querySelector('#pause').textContent = '일시정지';
}
function pause() {
  if (!state || state.hero.hp <= 0) return;
  state.paused = !state.paused;
  clearInput();
  document.querySelector('#pause').textContent = state.paused ? '계속하기' : '일시정지';
}
window.addEventListener('keydown', (event) => {
  if (
    !controls.has(event.code) ||
    event.target.closest('button, a, input') ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  if (event.code === 'KeyP') {
    if (!event.repeat) pause();
    return;
  }
  if (event.code === 'KeyR') {
    if (!event.repeat) restart();
    return;
  }
  keys.add(event.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code))
    pointer = null;
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => {
  clearInput();
  if (state && !state.paused) pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state && !state.paused) pause();
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse') return;
  const rect = canvas.getBoundingClientRect();
  pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
});
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  canvas.focus();
  mouseDown = true;
  canvas.setPointerCapture(event.pointerId);
});
window.addEventListener('pointerup', () => {
  mouseDown = false;
});
canvas.addEventListener('pointercancel', clearInput);
canvas.addEventListener('pointerleave', () => {
  pointer = null;
});
document.querySelector('#pause').addEventListener('click', () => {
  pause();
  canvas.focus();
});
document.querySelector('#restart').addEventListener('click', () => {
  restart();
  canvas.focus();
});
document.querySelectorAll('[data-key]').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pointer = null;
    button.setPointerCapture(event.pointerId);
    keys.add(button.dataset.key);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
    button.addEventListener(name, () => keys.delete(button.dataset.key));
});
function frame(now) {
  const dt = Math.min(0.035, Math.max(0, (now - frame.previous) / 1000));
  frame.previous = now;
  const horizontal =
    Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  const vertical = Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW'));
  const ground = unproject(horizontal, vertical);
  const direction = unit(ground.x, ground.z);
  if (!state.paused && state.hero.hp > 0) {
    if (pointer) {
      const p = renderer.screen(state.hero.x, state.hero.z);
      const aim = unproject(pointer.x - p.x, pointer.y - p.y);
      if (Math.hypot(aim.x, aim.z) > 5) state.hero.aim = unit(aim.x, aim.z);
    } else if (horizontal || vertical) state.hero.aim = direction;
  }
  state.hero.moving = Boolean(horizontal || vertical);
  tick(
    state,
    dt,
    direction,
    mouseDown || keys.has('KeyQ'),
    keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight')
  );
  state.enemies.forEach((enemy) => {
    enemy.moving = enemy.warning <= 0;
  });
  renderer.draw(state);
  document.querySelector('#health').textContent = `${state.hero.hp} / 100`;
  document.querySelector('#health-meter').value = state.hero.hp;
  document.querySelector('#wave').textContent = String(state.wave).padStart(2, '0');
  document.querySelector('#kills').textContent = state.kills;
  document.querySelector('#dash').textContent =
    state.hero.dashCooldown > 0 ? `회피 ${state.hero.dashCooldown.toFixed(1)}s` : '회피 준비 · SPACE';
  message.textContent =
    state.hero.hp <= 0
      ? '쓰러졌습니다 · R / 다시 시작'
      : state.paused
        ? state.elapsed === 0
          ? '준비되셨나요? · 플레이 시작 / P'
          : '일시정지 · P / 계속하기'
        : state.nextWave > 0
          ? '웨이브 완료 · 체력 회복'
          : '';
  requestAnimationFrame(frame);
}
async function start() {
  const saved = await loadSavedState({ source: 'published' });
  if (!saved) throw new Error('공개 캐릭터 데이터를 불러오지 못했습니다.');
  const defs = actorDefsFromSavedState(saved);
  const heroDef = defs.find((def) => def.type === 'player');
  const enemyDef = defs.find((def) => def.group === 'mobs');
  if (!heroDef || !enemyDef) throw new Error('플레이어 또는 적 캐릭터가 없습니다.');
  const [hero, enemy] = await Promise.all(
    [heroDef, enemyDef].map((def) => createActorFromDef(def, saved.actors[def.id], { floorY: 0 }))
  );
  renderer = createRenderer(canvas, { hero, enemy });
  restart();
  state.paused = true;
  document.querySelector('#pause').textContent = '플레이 시작';
  renderer.draw(state);
  frame.previous = performance.now();
  requestAnimationFrame(frame);
}
start().catch((error) => {
  message.textContent = `${error.message} 새로고침해 주세요.`;
});
