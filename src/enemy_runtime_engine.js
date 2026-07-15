import { requestRuntimeAction } from './action_trigger_engine.js';
import { isActionMirrorEnabled } from './action_mirror_helper.js';
import { resetPlayerActionState } from './actor_state.js';
import { syncActorHealthCapacity } from './actor_tuning_helper.js';
import { normalizeCharacterGroup } from './character_group_data.js';
import { updateActorCombatTimers } from './combat_engine.js';
import { isEnemyAiActionRegistered, resolveEnemyAiSettings } from './enemy_ai_settings_helper.js';
import { activeActionFormulaAtProgress } from './formula_runtime_engine.js';
import { timelineFrameCount } from './timeline_playback_helper.js';

export function updateBattleActorMotion({ actors, playerActor, keys, pressed, world, dt }) {
  updateActorCombatTimers(actors, dt);
  actors.forEach((actor) => updateEnemyAiCooldowns(actor, dt));

  playerActor.player.update(dt, keys, pressed, world);

  actors
    .filter((actor) => actor !== playerActor)
    .forEach((actor) => {
      if (actor.respawning) return;
      faceNpcActorTowardPlayer(actor, playerActor);
      runEnemyRangeAi(actor, playerActor);
      actor.player.updateNpc(dt, playerActor.player, world);
    });
}

function faceNpcActorTowardPlayer(actor, playerActor) {
  if (!shouldNpcFacePlayer(actor, playerActor)) return;
  const lockedFacing = npcLockFormulaFacing(actor, playerActor);
  if (lockedFacing) {
    actor.player.facing = lockedFacing;
    return;
  }
  const deltaX = Number(playerActor.player.x || 0) - Number(actor.player.x || 0);
  if (Math.abs(deltaX) <= 0.0001) return;
  actor.player.facing = deltaX < 0 ? -1 : 1;
}

function npcLockFormulaFacing(actor, playerActor) {
  const player = actor?.player;
  const targetPlayer = playerActor?.player;
  if (!player || !targetPlayer) return null;
  const settings = player.actionSettings?.[player.actionKey] || {};
  const lock = activeActionFormulaAtProgress(
    settings,
    'lock',
    player.getActionFrameProgress?.() || 0,
    timelineFrameCount(settings)
  );
  if (!lock) return null;
  if (lock.direction === 'away') return oppositeFacingFromPlayer(actor, playerActor);
  if (lock.direction === 'left' || lock.direction === 'right') {
    const originalFacing = lock.direction === 'left' ? -1 : 1;
    const actionFacing = player.customActionFacing || player.facing;
    const mirrorSign = isActionMirrorEnabled(settings) && Number(actionFacing) < 0 ? -1 : 1;
    return originalFacing * mirrorSign;
  }
  return null;
}

function oppositeFacingFromPlayer(actor, playerActor) {
  const deltaX = Number(playerActor?.player?.x || 0) - Number(actor?.player?.x || 0);
  if (Math.abs(deltaX) <= 0.0001) return Number(actor?.player?.facing || 1) < 0 ? -1 : 1;
  return deltaX < 0 ? 1 : -1;
}

function shouldNpcFacePlayer(actor, playerActor) {
  if (!actor?.player || !playerActor?.player || actor === playerActor) return false;
  const group = normalizeCharacterGroup(actor.group, '');
  return group === 'mobs' || group === 'bosses';
}

function runEnemyRangeAi(actor, playerActor) {
  if (!shouldNpcFacePlayer(actor, playerActor)) return;
  if (actor.player.isCustomActionActive) return;

  const distance = Math.abs(Number(playerActor.player.x || 0) - Number(actor.player.x || 0));
  const candidate = enemyRangeActionCandidate(actor, distance);
  if (!candidate) return;

  const started = requestRuntimeAction(actor.player, candidate.key, actor.player.facing, 'tap');
  if (started) startEnemyAiActionCooldown(actor, candidate);
}

function enemyRangeActionCandidate(actor, distance) {
  const cooldowns = actor.aiActionCooldowns || {};
  return (actor.player.actions || [])
    .map((action, index) => ({
      action,
      registered: isEnemyAiActionRegistered(actor.player.actionSettings?.[action.key] || {}),
      ai: resolveEnemyAiSettings(actor.player.actionSettings?.[action.key] || {}),
      index,
    }))
    .filter(({ action, ai, registered }) => {
      if (!registered) return false;
      if (!ai.enabled) return false;
      if (Number(cooldowns[action.key] || 0) > 0) return false;
      if (distance < ai.minRange || distance > ai.maxRange) return false;
      if (ai.chance <= 0) return false;
      return ai.chance >= 100 || Math.random() * 100 <= ai.chance;
    })
    .sort((a, b) => b.ai.priority - a.ai.priority || a.index - b.index)[0]?.action;
}

function startEnemyAiActionCooldown(actor, action) {
  const ai = resolveEnemyAiSettings(actor.player.actionSettings?.[action.key] || {});
  const cooldown = Math.max(0, Number(ai.cooldown || 0));
  if (!cooldown) return;
  actor.aiActionCooldowns ||= {};
  actor.aiActionCooldowns[action.key] = cooldown;
}

export function maintainEnemyFlow({ actors = [], playerActor = null, world = null, dt = 0 } = {}) {
  const enemyActors = actors.filter((actor) => shouldNpcFacePlayer(actor, playerActor));
  const byActorId = groupEnemyActorsById(enemyActors);

  byActorId.forEach((actorGroup, actorId) => {
    const rule = resolveEnemyActorSpawnRule(world, actorId);
    const aliveActors = actorGroup.filter((actor) => !actor.respawning && !actor.player?.dead);

    aliveActors.slice(rule.maxAlive).forEach((actor) => hideEnemyActor(actor));
    actorGroup.forEach((actor) => updateEnemyRespawn(actor, playerActor, world, actorGroup, rule, dt));
  });
}

function hideEnemyActor(actor) {
  actor.respawning = true;
  actor.enemyRespawnTimer = null;
  actor.hitCancelFlashTime = 0;
  actor.player.dead = true;
  actor.player.deathRagdoll = null;
  actor.player.vx = 0;
  actor.player.vy = 0;
}

function updateEnemyRespawn(actor, playerActor, world, actorGroup, rule, dt) {
  if (!actor.player?.dead && !actor.respawning) return;

  if (actor.enemyRespawnTimer == null) actor.enemyRespawnTimer = actor.respawning ? 0 : rule.intervalSec;
  actor.enemyRespawnTimer = Math.max(0, Number(actor.enemyRespawnTimer || 0) - Math.max(0, Number(dt || 0)));
  if (actor.enemyRespawnTimer > 0) return;
  if (activeEnemyCount(actorGroup, playerActor) >= rule.maxAlive) return;

  respawnEnemyActor(actor, playerActor, world);
}

function activeEnemyCount(enemyActors, playerActor) {
  return enemyActors.filter(
    (actor) => shouldNpcFacePlayer(actor, playerActor) && !actor.respawning && !actor.player?.dead
  ).length;
}

function groupEnemyActorsById(enemyActors) {
  const groups = new Map();
  enemyActors.forEach((actor) => {
    const actorId = actor?.id || 'enemy';
    if (!groups.has(actorId)) groups.set(actorId, []);
    groups.get(actorId).push(actor);
  });
  return groups;
}

export function resolveEnemyActorSpawnRule(world, actorId) {
  const enemyRules = world?.enemyRules || {};
  const actorRule = enemyRules.spawnRulesByActor?.[actorId] || null;
  const poolRule = Array.isArray(enemyRules.pool) ? enemyRules.pool.find((entry) => entry?.actorId === actorId) : null;
  const baseMaxAlive = Math.max(0, Math.round(Number(actorRule?.maxAlive ?? poolRule?.maxAlive ?? 1)));
  return {
    maxAlive: baseMaxAlive,
    intervalSec: Math.max(0.1, Number(actorRule?.intervalSec ?? enemyRules.spawnRule?.intervalSec ?? 2)),
  };
}

function respawnEnemyActor(actor, playerActor, world) {
  syncActorHealthCapacity(actor, true);
  actor.hpPips = actor.maxHpPips;
  actor.respawning = false;
  actor.enemyRespawnTimer = null;
  actor.invulnTime = 0;
  actor.hurtCooldown = 0;
  actor.hitStun = 0;
  actor.hitCancelFlashTime = 0;
  actor.lastHitSerials = {};
  actor.aiActionCooldowns = {};
  actor.runtimeBossKillCounted = false;
  actor.player.dead = false;
  actor.player.deathRagdoll = null;
  actor.player.x = enemyRespawnX(actor, playerActor, world);
  actor.respawnTargetX = actor.player.x;
  actor.player.y = Number(world?.floorY ?? actor.player.y);
  actor.player.vx = 0;
  actor.player.vy = 0;
  actor.player.facing = Number(playerActor?.player?.x || 0) < Number(actor.player.x || 0) ? -1 : 1;
  actor.player.hurtTime = 0;
  resetPlayerActionState(actor.player);
  actor.player.onGround = true;
  actor.player.updateState();
}

function enemyRespawnX(actor, playerActor, world) {
  const spawnRule = world?.enemyRules?.spawnRule || {};
  const min = Math.min(Number(spawnRule.cameraOffsetMin ?? 740), Number(spawnRule.cameraOffsetMax ?? 960));
  const max = Math.max(Number(spawnRule.cameraOffsetMin ?? 740), Number(spawnRule.cameraOffsetMax ?? 960));
  const offset = min + Math.random() * Math.max(0, max - min);
  const playerX = Number(playerActor?.player?.x ?? actor.respawnTargetX ?? actor.player.x ?? 0);
  return playerX + offset;
}

function updateEnemyAiCooldowns(actor, dt) {
  if (!actor.aiActionCooldowns) return;
  Object.keys(actor.aiActionCooldowns).forEach((key) => {
    actor.aiActionCooldowns[key] = Math.max(0, Number(actor.aiActionCooldowns[key] || 0) - dt);
    if (actor.aiActionCooldowns[key] <= 0) delete actor.aiActionCooldowns[key];
  });
}
