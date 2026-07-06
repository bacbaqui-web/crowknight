import { PuppetPlayer } from './actor_runtime_engine.js';
import { defaultTuningFor } from './actor_tuning_helper.js';
import { loadCharacterAssets } from './asset_loader_helper.js';
import {
  characterPsdFileNameForGroup,
  inferCharacterGroup,
  isPlayerCharacter,
  isTrashCharacter,
  legacyCharacterFolder,
  normalizeCharacterGroup,
} from './character_group_data.js';
import { ACTOR_DEFS } from './game_config_data.js';
import { mergeTuning } from './project_data_normalizer_helper.js';

export async function createActors(saved, world, { includeTrash = false } = {}) {
  return Promise.all(
    actorDefsFromSavedState(saved, { includeTrash }).map((def) =>
      createActorFromDef(def, saved?.actors?.[def.id], world)
    )
  );
}

export async function createActorFromDef(def, savedActor = null, world) {
  const assetSources = savedActor?.assets || {};
  const assets = await loadCharacterAssets(def.folder, '', assetSources);
  const tuning = mergeTuning(defaultTuningFor(def), savedActor?.tuning);
  const actor = {
    ...def,
    label: def.label || def.name,
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
    assetSources,
    tuning,
    group: def.group,
    deleted: Boolean(def.deleted),
    player: new PuppetPlayer(def.x, world.floorY, assets),
  };

  actor.name = savedActor?.name || def.name;
  actor.player.applyTuning(actor.tuning);
  actor.player.debugInteractionObjects = false;
  return actor;
}

export function actorDefsFromSavedState(saved, { includeTrash = false } = {}) {
  const savedDefs = Array.isArray(saved?.characters) ? saved.characters : null;
  if (!savedDefs?.length)
    return ACTOR_DEFS.map(normalizeActorDef).filter((def) => includeTrash || !isTrashCharacter(def));

  const normalized = savedDefs.map(normalizeActorDef).filter((def) => def.id && def.folder);
  const visible = includeTrash ? normalized : normalized.filter((def) => !isTrashCharacter(def));
  const hasPlayer = normalized.some((def) => isPlayerCharacter(def));
  return hasPlayer ? visible : [normalizeActorDef(ACTOR_DEFS[0]), ...visible];
}

export function createActorDefsSnapshot(actors) {
  return actors.map((actor) =>
    normalizeActorDef({
      id: actor.id,
      type: actor.type,
      label: actor.label,
      name: actor.name,
      x: actor.x,
      folder: actor.folder,
      tint: actor.tint,
      deletable: actor.deletable,
      group: actor.group,
      deleted: actor.deleted,
      storageFolder: actor.storageFolder,
      psdFileName: actor.psdFileName,
    })
  );
}

function normalizeActorDef(def) {
  const group = normalizeCharacterGroup(def?.group || inferCharacterGroup(def));
  const folder = legacyCharacterFolder(def?.folder || def?.id || '');
  return {
    id: String(def?.id || '').trim(),
    type: String(def?.type || (group === 'players' || def?.id === 'player' ? 'player' : 'enemy')).trim(),
    label: String(def?.label || def?.name || def?.id || '캐릭터').trim(),
    name: String(def?.name || def?.label || def?.id || '캐릭터').trim(),
    x: Number.isFinite(Number(def?.x)) ? Number(def.x) : 480,
    folder,
    tint: String(def?.tint || '#7cc3a2'),
    deletable: Boolean(def?.deletable),
    group,
    deleted: Boolean(def?.deleted),
    storageFolder: legacyCharacterFolder(def?.storageFolder || folder),
    psdFileName: String(def?.psdFileName || characterPsdFileNameForGroup(group)),
  };
}
