import { groundPoint, depthOf } from './camera.js';

export function bossEdgeMarker(actor, view, floorY) {
  if (!actor || actor.respawning || actor.player.dead) return null;
  const p = groundPoint(actor.player.x, depthOf(actor), view);
  const scale = (actor.player.transform?.scale || 1) * view.zoom;
  const bottom = p.y + (actor.player.y - floorY) * view.zoom;
  if (p.x + 90 * scale >= 0 && p.x - 90 * scale <= view.width && bottom >= 0 && bottom - 200 * scale <= view.height)
    return null;
  const dx = p.x - view.width / 2,
    dy = bottom - 100 * scale - view.height / 2;
  const inset = 34;
  const t = Math.min(
    (view.width / 2 - inset) / Math.max(0.001, Math.abs(dx)),
    (view.height / 2 - inset) / Math.max(0.001, Math.abs(dy))
  );
  return { x: view.width / 2 + dx * t, y: view.height / 2 + dy * t, angle: Math.atan2(dy, dx) };
}
export function createBossCompass(container) {
  const element = document.createElement('div');
  element.id = 'quarterBossCompass';
  element.setAttribute('role', 'img');
  element.style.cssText =
    'position:absolute;z-index:40;pointer-events:none;transform:translate(-50%,-50%);width:42px;height:42px;display:none;border:2px solid #e6bc70;border-radius:50%;background:#191c22e8;color:#fff0cf;text-align:center;font:30px/40px sans-serif;box-shadow:0 2px 10px #0009';
  element.textContent = '☠';
  const arrow = document.createElement('span');
  arrow.textContent = '▲';
  arrow.style.cssText =
    'position:absolute;left:13px;top:12px;font:15px/16px sans-serif;transform-origin:8px 8px;color:#e6bc70';
  element.append(arrow);
  container.append(element);
  return (actors, view, floorY) => {
    const boss = actors.find((a) => a.group === 'bosses' && !a.respawning && !a.player.dead);
    const marker = bossEdgeMarker(boss, view, floorY);
    element.style.display = marker ? 'block' : 'none';
    if (!marker) return;
    element.style.left = `${(marker.x / view.width) * 100}%`;
    element.style.top = `${(marker.y / view.height) * 100}%`;
    arrow.style.transform = `rotate(${marker.angle + Math.PI / 2}rad) translateY(-30px)`;
    element.setAttribute('aria-label', `화면 밖 보스: ${boss.name || boss.label || boss.id}`);
  };
}
