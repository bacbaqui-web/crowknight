import { progressionMaxHealth } from './skill_progression_effects.js';
import { DEFAULT_PLAYER_TUNING } from './player_default_tuning_data.js';
import { clamp, clone } from './common_helper.js';

export function defaultTuningFor(def) {
  void def;
  return clone(DEFAULT_PLAYER_TUNING);
}

export function syncActorHealthCapacity(actor, refill = false) {
  const runtimeMax = progressionMaxHealth(actor);
  actor.maxHp = runtimeMax;
  actor.hp = refill ? runtimeMax : clamp(Number(actor.hp ?? runtimeMax), 0, runtimeMax);
  if (refill) actor.healthTrail = null;
}
