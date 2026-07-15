import { PuppetPlayer } from './actor_runtime_engine.js';
import { isPlayerCharacter, isTrashCharacter, normalizeCharacterGroup } from './character_group_data.js';
import { resolveEnemyActorSpawnRule } from './enemy_runtime_engine.js';

export function createRunActorState({ actors = [], world = null, createRuntimePlayer = defaultRuntimePlayer } = {}) {
  let playerActor = defaultRunPlayerActor(baseActors());
  let runtimeEnemyActors = [];

  function baseActors() {
    return actors.filter((actor) => !isTrashCharacter(actor));
  }

  function findBaseActor(actorId) {
    return baseActors().find((actor) => actor.id === actorId) || null;
  }

  function resolvePlayer(selectedActor = null) {
    const candidates = baseActors();
    const selectedPlayer =
      candidates.includes(selectedActor) && isPlayerCharacter(selectedActor) ? selectedActor : null;
    playerActor = selectedPlayer || defaultRunPlayerActor(candidates) || playerActor;
    return playerActor;
  }

  function rebuildEnemies() {
    runtimeEnemyActors = baseActors()
      .filter((actor) => actor !== playerActor && !isPlayerCharacter(actor))
      .flatMap((actor) => {
        const maxAlive = resolveEnemyActorSpawnRule(world, actor.id).maxAlive;
        return Array.from({ length: maxAlive }, (_, index) => createRuntimeEnemyClone(actor, index));
      });
    return [...runtimeEnemyActors];
  }

  function createRuntimeEnemyClone(source, index) {
    const tuning = { ...source.tuning };
    const player = createRuntimePlayer(source, world);
    player.applyTuning(tuning);
    player.debugInteractionObjects = source.player.debugInteractionObjects;
    return {
      ...source,
      tuning,
      runtimeClone: true,
      runtimeSourceActorId: source.id,
      runtimeInstanceId: `${source.id}#${index + 1}`,
      respawning: false,
      respawnTargetX: source.respawnTargetX,
      invulnTime: 0,
      wasRolling: false,
      hurtCooldown: 0,
      hitStun: 0,
      rollGhosts: [],
      rollGhostTimer: 0,
      lastHitSerials: {},
      aiActionCooldowns: {},
      runtimeBossKillCounted: false,
      hpPips: source.maxHpPips,
      player,
    };
  }

  function clearEnemies() {
    runtimeEnemyActors = [];
  }

  function getPlayer() {
    return playerActor;
  }

  function getEnemyActors() {
    return [...runtimeEnemyActors];
  }

  function getRunActors() {
    return orderRunActors([playerActor, ...runtimeEnemyActors]);
  }

  function getActiveActors({ runActive = false } = {}) {
    return runActive ? getRunActors() : baseActors();
  }

  function getEditorControlActor(selectedActor, activeActors = getActiveActors()) {
    return activeActors.includes(selectedActor) ? selectedActor : playerActor;
  }

  function getRenderActors(activeActors = getActiveActors()) {
    return [...activeActors.filter((actor) => actor !== playerActor), playerActor].filter((actor) =>
      activeActors.includes(actor)
    );
  }

  function orderRunActors(runActors = []) {
    if (!runActors.includes(playerActor)) return runActors;
    return [playerActor, ...runActors.filter((actor) => actor !== playerActor).sort(compareEnemyRunOrder)];
  }

  return {
    baseActors,
    clearEnemies,
    findBaseActor,
    getActiveActors,
    getEditorControlActor,
    getEnemyActors,
    getPlayer,
    getRenderActors,
    getRunActors,
    rebuildEnemies,
    resolvePlayer,
  };
}

function defaultRuntimePlayer(source, world) {
  return new PuppetPlayer(source.player.x, world.floorY, source.player.assets);
}

function defaultRunPlayerActor(actors = []) {
  return actors.find((actor) => isPlayerCharacter(actor)) || actors[0] || null;
}

function compareEnemyRunOrder(a, b) {
  return enemyRunOrderPriority(a) - enemyRunOrderPriority(b);
}

function enemyRunOrderPriority(actor) {
  const group = normalizeCharacterGroup(actor?.group, '');
  if (group === 'mobs') return 0;
  if (group === 'bosses') return 1;
  return 2;
}
