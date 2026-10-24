import { depthOf } from './camera.js';
import { screenPoint } from './attack_geometry.js';

export function createDamageNumbers(ctx, world) {
  const entries = [];
  let lastTime = null,
    serial = 0;
  return {
    show(target, amount) {
      if (!(amount > 0) || !Number.isFinite(amount)) return;
      entries.push({
        x: target.player.x + ((serial++ % 3) - 1) * 12,
        y: target.player.y - 65,
        depth: depthOf(target),
        age: 0,
        text: String(Math.round(amount * 10) / 10),
        friendly: target.group === 'players',
      });
      if (entries.length > 96) entries.shift();
    },
    draw(view, time) {
      const dt = lastTime == null ? 0 : Math.max(0, Math.min(0.1, time - lastTime));
      lastTime = time;
      ctx.save();
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#172019';
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        entry.age += dt;
        if (entry.age >= 0.7) {
          entries.splice(i, 1);
          continue;
        }
        const p = screenPoint({ ...entry, y: entry.y - entry.age * 48 }, world, view);
        ctx.globalAlpha = Math.min(1, (0.7 - entry.age) / 0.25);
        ctx.fillStyle = entry.friendly ? '#ff958d' : '#fff0b5';
        ctx.strokeText(entry.text, p.x, p.y);
        ctx.fillText(entry.text, p.x, p.y);
      }
      ctx.restore();
    },
    reset() {
      entries.length = 0;
      lastTime = null;
      serial = 0;
    },
    get count() {
      return entries.length;
    },
  };
}
