import { PuppetPlayer } from './actor_runtime_engine.js';
import { defaultTuningFor } from './actorTuning.js';
import { loadCharacterAssets } from './asset_loader_helper.js';
import { ACTOR_DEFS } from './game_config.js';
import { mergeTuning } from './project_data_normalizer.js';

export async function createActors(saved, world) {
  const created = [];

  for (const def of ACTOR_DEFS) {
    const assets = await loadCharacterAssets(def.folder);
    const tuning = mergeTuning(defaultTuningFor(def), saved?.actors?.[def.id]?.tuning);
    const actor = {
      ...def,
      hp: 100,
      maxHpPips: tuning.maxHpPips,
      hpPips: tuning.maxHpPips,
      respawning: false,
      respawnTargetX: def.x,
      invulnTime: 0,
      wasRolling: false,
      hurtCooldown: 0,
      hitStun: 0,
      rollGhosts: [],
      rollGhostTimer: 0,
      lastHitSerials: {},
      tuning,
      player: new PuppetPlayer(def.x, world.floorY, assets),
    };

    actor.name = saved?.actors?.[def.id]?.name || def.name;
    actor.player.applyTuning(actor.tuning);
    actor.player.debugInteractionObjects = false;
    created.push(actor);
  }

  return created;
}
