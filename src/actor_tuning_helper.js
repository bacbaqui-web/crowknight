import { DEFAULT_PLAYER_TUNING } from './player_default_tuning_data.js';
import { clamp, clone } from './common_helper.js';

export function defaultTuningFor(def) {
  void def;
  const tuning = clone(DEFAULT_PLAYER_TUNING);
  return tuning;
}

export function syncActorHealthCapacity(actor, refill = false) {
  const max = clamp(Math.round(Number(actor.tuning.maxHpPips ?? 5)), 1, 20);
  actor.tuning.maxHpPips = max;
  const runtimeMax = max + (actor.player?.runUpgrades?.health || 0);
  actor.maxHpPips = runtimeMax;
  actor.hpPips = refill ? runtimeMax : clamp(Math.round(Number(actor.hpPips ?? runtimeMax)), 0, runtimeMax);
}
