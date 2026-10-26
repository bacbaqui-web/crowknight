import { MAGE_RAIN } from './mage_rain_effect.js';
import { updateTankPattern } from './tank_pattern_helper.js';
import { requestRuntimeAction } from './action_trigger_engine.js';
import { resetPlayerActionState } from './actor_state.js';
import { makeBossHazard } from './boss_hazard_runtime.js';

export const EXPANDED_BOSSES = ['powder_chief', 'fire_mage', 'ram_tank'];
export function updateBossPattern(actor, target, world, dt) {
  if (!EXPANDED_BOSSES.includes(actor.id)) return false;
  const p = actor.player;
  if (p.dead || actor.respawning) {
    actor.bossPattern = null;
    return true;
  }
  let s = actor.bossPattern;
  if (!s || p.animTime < s.clock)
    s = actor.bossPattern = { clock: p.animTime, time: 0, cooldown: actor.id === 'ram_tank' ? 4 : 1, index: 0, phase: 'walk', queue: [], drops: 0 };
  s.clock = p.animTime;
  if (s.phase === 'walk' && !p.isCustomActionActive)
    requestRuntimeAction(
      p,
      { powder_chief: 'powderWalk', fire_mage: 'mageFloat', ram_tank: 'tankDrive' }[actor.id],
      p.facing
    );
  s.time += dt;
  s.cooldown -= dt;
  const distance = world?.quarterView?.distance(actor, target) ?? Math.abs(p.x - target.player.x);
  const emit = (kind, options = {}) => s.queue.push(makeBossHazard(actor, target, world, kind, options));
  if (s.phase === 'stun') {
    p.vx = 0;
    p.vxInertia = 0;
    if (s.time >= 3) {
      s.phase = 'walk';
      s.time = 0;
      s.cooldown = 1;
      p.bossStunned = false;
    }
    return true;
  }
  if (actor.id === 'ram_tank') { updateTankPattern(actor, target, world, dt, emit); return true; }
  if (s.phase === 'cast') {
    if (s.mode === 'rain' && !p.isCustomActionActive) requestRuntimeAction(p, 'mageFire', p.facing);
    if (!s.emitted && s.time >= (s.mode === 'punch' ? 0.28 : 0.8)) {
      s.emitted = true;
      if (actor.id === 'powder_chief') emit(s.mode);
      if (actor.id === 'fire_mage' && s.mode === 'fireball') emit('fireball');
    }
    if (s.mode === 'rain') {
      while (s.drops < 24 && s.time >= MAGE_RAIN.firstDrop + s.drops * 0.16) {
        const i = s.drops++,
          angle = i * 2.399963;
        const radius = i % 6 === 0 ? 0 : 100 + ((i * 73) % 520);
        emit('rain', {
          x: target.player.x + Math.cos(angle) * radius,
          z: (target.quarterDepth || 0) + Math.sin(angle) * radius,
        });
      }
    }
    if (s.time >= (s.mode === 'rain' ? MAGE_RAIN.duration : s.mode === 'punch' ? 0.8 : 2.4)) {
      s.phase = 'walk';
      s.cooldown = s.mode === 'punch' ? 0.7 : 1.2;
      s.time = 0;
    }
    return true;
  }

  if (
    s.cooldown > 0 ||
    p.hurtTime > 0 ||
    (p.isCustomActionActive && p.actionSettings[p.actionKey]?.group !== 'movement')
  )
    return true;
  s.mode =
    actor.id === 'powder_chief'
      ? distance < 140
        ? 'punch'
        : ['roller', 'giant', 'barrel'][s.index % 3]
      : ['line', 'fireball', 'rain'][s.index % 3];
  const key = actor.id === 'powder_chief' ? (s.mode === 'punch' ? 'powderPunch' : 'powderThrow') : 'mageFire';
  if (requestRuntimeAction(p, key, p.facing)) {
    if (s.mode !== 'punch') s.index++;
    s.phase = 'cast';
    s.time = 0;
    s.emitted = false;
    s.drops = 0;
  }
  return true;
}
export function finishBossMotion(actor, start) {
  const s = actor.bossPattern,
    p = actor.player;
  if (!s || !start) return;
  if (s.phase === 'cast' || s.phase === 'stun') {
    p.x = start.x;
    actor.quarterDepth = start.z;
    p.vx = 0;
    p.vxInertia = 0;
  }
}
export function stunTankOnTerrain(actor) {
  if (actor.id !== 'ram_tank' || !actor.player.tankCharge || actor.player.tankCharge.time < 1) return;
  resetPlayerActionState(actor.player);
  actor.player.bossStunned = true;
  actor.bossPattern.phase = 'stun';
  actor.bossPattern.time = 0;
}
