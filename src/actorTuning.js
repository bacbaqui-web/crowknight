import { ACTOR_DEFS } from './gameConfig.js';
import { DEFAULT_PLAYER_TUNING } from './playerDefaultTuning.js';
import { clamp, clone } from './utils.js';

export function defaultTuningFor(def) {
  const tuning = clone(DEFAULT_PLAYER_TUNING);
  if (def.id !== 'player') {
    tuning.speed = 150 + ACTOR_DEFS.findIndex((item) => item.id === def.id) * 18;
    tuning.jumpPower = 580;
    tuning.glideTimeMax = 0.75;
    tuning.rollDistance = 190;
    tuning.dashCooldownMax = 0.75;
  }
  return tuning;
}

export function syncActorHealthCapacity(actor, refill = false) {
  const max = clamp(Math.round(Number(actor.tuning.maxHpPips ?? 5)), 1, 20);
  actor.tuning.maxHpPips = max;
  actor.maxHpPips = max;
  actor.hpPips = refill ? max : clamp(Math.round(Number(actor.hpPips || max)), 0, max);
}
