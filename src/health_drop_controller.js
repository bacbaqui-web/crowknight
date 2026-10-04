import { attractPickup } from './pickup_magnet_helper.js';
export function createHealthDrops({ random = Math.random } = {}) {
  let pending = [],
    drops = [];
  function recordKill(actor) {
    if (actor.group === 'mobs' && random() < 0.2) pending.push(actor);
  }
  function update(dt, playerActor, world) {
    for (const actor of pending) {
      const parts = actor.player.deathRagdoll?.parts;
      if (!parts?.length) continue;
      const [part] = parts.splice(Math.min(parts.length - 1, Math.floor(random() * parts.length)), 1);
      const direction = part.vx < 0 ? -1 : 1;
      drops.push({
        x: part.x,
        y: part.y,
        vx: direction * (250 + random() * 130),
        vy: -320,
        rot: Number(part.rot || 0),
        rotSpeed: Number(part.rotSpeed ?? direction * 8),
        age: 0,
        landed: false,
        grounded: false,
      });
    }
    pending = [];
    for (const drop of drops) {
      drop.age += dt;
      // Bounded steps keep bounce and friction stable even after a slow frame.
      let remaining = Math.min(Math.max(0, dt), Math.max(0, 10 - drop.age + dt));
      while (remaining > 0 && !drop.magnetized) {
        const step = Math.min(remaining, 1 / 60);
        remaining -= step;
        drop.x += drop.vx * step;
        if (drop.grounded) {
          drop.rot += (drop.vx / 12) * step;
          drop.vx *= Math.exp(-3 * step);
          if (Math.abs(drop.vx) < 2) drop.vx = 0;
        } else {
          const gravity = Number(world.gravity ?? 980) * 0.82;
          drop.y += drop.vy * step + gravity * step * step * 0.5;
          drop.vy += gravity * step;
          drop.rot += drop.rotSpeed * step;
          drop.vx *= Math.exp(-0.42 * step);
          if (drop.y >= world.floorY - 12 && drop.vy > 0) {
            drop.y = world.floorY - 12;
            drop.landed = true;
            drop.vy *= -0.24;
            drop.vx *= 0.74;
            drop.rotSpeed *= 0.7;
            if (Math.abs(drop.vy) < 40) {
              drop.vy = 0;
              drop.grounded = true;
            }
          }
        }
      }
      if (drop.age < 10 && attractPickup(drop, playerActor, dt, 40, 260)) {
        playerActor.hp = Math.min(playerActor.maxHp, playerActor.hp + 10);
        drop.age = 10;
      }
    }
    drops = drops.filter((drop) => drop.age < 10);
  }
  function draw(ctx) {
    for (const drop of drops) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, (10 - drop.age) / 2);
      ctx.translate(drop.x, drop.y);
      ctx.rotate(drop.rot);
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#fb7185';
      ctx.strokeStyle = '#fff1f2';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(-22, -4, -10, -18, 0, -7);
      ctx.bezierCurveTo(10, -18, 22, -4, 0, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  return {
    recordKill,
    update,
    draw,
    reset() {
      pending = [];
      drops = [];
    },
    snapshot: () => drops.map((drop) => ({ ...drop })),
  };
}
