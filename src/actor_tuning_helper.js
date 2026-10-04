import { DEFAULT_PLAYER_TUNING } from './player_default_tuning_data.js';
import { clamp, clone } from './common_helper.js';
import { baseHealth } from './actor_health_helper.js';

export function defaultTuningFor(def) {
  void def;
  return clone(DEFAULT_PLAYER_TUNING);
}

export function syncActorHealthCapacity(actor, refill = false) {
  const runtimeMax = baseHealth(actor.tuning) * (actor.player?.runUpgrades?.health || 1);
  actor.maxHp = runtimeMax;
  actor.hp = refill ? runtimeMax : clamp(Number(actor.hp ?? runtimeMax), 0, runtimeMax);
  if (refill) actor.healthTrail = null;
}
