export const LIMIT = 520;
export const project = (x, z) => ({ x: (x - z) * 0.8660254, y: (x + z) * 0.5 });
export const unproject = (x, y) => ({ x: x / 1.7320508 + y, z: y - x / 1.7320508 });
export function unit(x, z) {
  const length = Math.hypot(x, z);
  return length ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}
export function move(body, direction, distance) {
  body.x = Math.max(-LIMIT, Math.min(LIMIT, body.x + direction.x * distance));
  body.z = Math.max(-LIMIT, Math.min(LIMIT, body.z + direction.z * distance));
}
export function inStrike(attacker, target, range = 125) {
  const dx = target.x - attacker.x,
    dz = target.z - attacker.z;
  const distance = Math.hypot(dx, dz);
  return distance <= range && (distance < 25 || (dx * attacker.aim.x + dz * attacker.aim.z) / distance > 0.25);
}
export function createState() {
  return {
    hero: { x: 0, z: 0, hp: 100, aim: unit(1, -1), cooldown: 0, dash: 0, dashCooldown: 0, immune: 0, swing: 0 },
    enemies: [],
    effects: [],
    kills: 0,
    wave: 0,
    elapsed: 0,
    nextWave: 0,
    paused: false,
  };
}
export function spawnWave(state) {
  state.wave++;
  state.enemies = Array.from({ length: Math.min(12, 3 + state.wave) }, (_, index) => {
    const angle = (index * Math.PI * 2) / Math.min(12, 3 + state.wave);
    return {
      x: Math.cos(angle) * 420,
      z: Math.sin(angle) * 420,
      hp: 3,
      cooldown: 1,
      warning: 0,
      flash: 0,
      swing: 0,
      aim: unit(1, 0),
    };
  });
}
export function attack(state) {
  const hero = state.hero;
  if (hero.cooldown > 0 || hero.hp <= 0 || state.paused) return false;
  hero.cooldown = 0.36;
  hero.swing = 0.24;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || !inStrike(hero, enemy)) continue;
    enemy.hp--;
    enemy.flash = 0.18;
    move(enemy, hero.aim, 32);
    if (enemy.hp <= 0) state.kills++;
  }
  return true;
}
export function tick(state, dt, direction, wantsAttack, wantsDash) {
  const hero = state.hero;
  if (state.paused || hero.hp <= 0) return;
  state.elapsed += dt;
  for (const key of ['cooldown', 'dash', 'dashCooldown', 'immune', 'swing']) hero[key] = Math.max(0, hero[key] - dt);
  if (wantsDash && !hero.dashCooldown) {
    hero.dash = 0.18;
    hero.immune = 0.25;
    hero.dashCooldown = 0.85;
    hero.dashAim = { ...(Math.hypot(direction.x, direction.z) ? direction : hero.aim) };
  }
  move(hero, hero.dash > 0 ? hero.dashAim : direction, dt * (hero.dash > 0 ? 780 : 230));
  if (wantsAttack) attack(state);
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.swing = Math.max(0, enemy.swing - dt);
    enemy.cooldown -= dt;
    const dx = hero.x - enemy.x,
      dz = hero.z - enemy.z;
    const distance = Math.hypot(dx, dz);
    enemy.aim = unit(dx, dz);
    if (enemy.warning > 0) {
      enemy.warning -= dt;
      if (enemy.warning <= 0) {
        enemy.swing = 0.2;
        if (distance < 72 && hero.immune <= 0) {
          hero.hp = Math.max(0, hero.hp - 12);
          hero.immune = 0.65;
        }
        enemy.cooldown = 1.2;
      }
    } else if (distance < 66 && enemy.cooldown <= 0) enemy.warning = 0.55;
    else if (distance > 48) move(enemy, enemy.aim, dt * Math.min(130, 80 + state.wave * 6));
  }
  // Separate feet on the ground plane, independent of sprite overlap.
  const bodies = [hero, ...state.enemies.filter((enemy) => enemy.hp > 0)];
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i],
        b = bodies[j],
        dx = b.x - a.x,
        dz = b.z - a.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 34) {
        const normal = distance ? unit(dx, dz) : unit(1, 0);
        move(b, normal, (34 - distance) / 2);
        move(a, normal, -(34 - distance) / 2);
      }
    }
  if (state.enemies.every((enemy) => enemy.hp <= 0)) {
    state.nextWave += dt;
    if (state.nextWave > 1.5) {
      state.nextWave = 0;
      hero.hp = Math.min(100, hero.hp + 15);
      spawnWave(state);
    }
  }
}
