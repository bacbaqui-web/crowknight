// Attraction begins after the fragment has touched the floor, preserving its launch.
export function attractPickup(pickup, actor, dt, radius, speed) {
  if (!pickup.landed || actor.hp <= 0 || actor.player.dead) return false;
  const targetX = actor.player.x,
    targetY = actor.player.y - 15;
  const dx = targetX - pickup.x,
    dy = targetY - pickup.y;
  const distance = Math.hypot(dx, dy);
  if (!pickup.magnetized && distance > radius) return false;
  pickup.magnetized = true;
  pickup.vx = pickup.vy = 0;
  const step = Math.min(distance, speed * Math.max(0, dt));
  pickup.x += (dx / (distance || 1)) * step;
  pickup.y += (dy / (distance || 1)) * step;
  return distance - step <= 16;
}
