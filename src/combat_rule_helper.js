import { debugInteractionRuntimeLog } from './interaction_region_engine.js';
import { isRuntimeDebugEnabled } from './runtime_debug_state.js';
import { ACTION_FPS } from './game_config_data.js';
import { normalizeCharacterGroup } from './character_group_data.js';

export function shouldBlockMobBossDamage(attacker, target) {
  return isMobActor(attacker) && isBossActor(target);
}

export function isMobActor(actor) {
  return normalizeCharacterGroup(actor?.group, '') === 'mobs';
}

export function isBossActor(actor) {
  return normalizeCharacterGroup(actor?.group, '') === 'bosses';
}

export function logMobBossDamageBlocked(attacker, target, event) {
  if (!isRuntimeDebugEnabled()) return;
  debugInteractionRuntimeLog(event, {
    attacker: attacker?.id,
    target: target?.id,
    attackerGroup: normalizeCharacterGroup(attacker?.group, ''),
    targetGroup: normalizeCharacterGroup(target?.group, ''),
    attackerAction: attacker?.player?.actionKey,
    targetAction: target?.player?.actionKey,
    reason: 'mob attacks do not affect bosses',
  });
}

export function cancelHitByActorRule(target, world) {
  const rule = enemyActorRuleForActor(world, target);
  const chance = Math.max(0, Math.min(100, Number(rule.hitCancelChance || 0)));
  if (chance <= 0) return false;
  if (chance < 100 && Math.random() * 100 >= chance) return false;

  target.hitCancelFlashTime = Math.max(
    Number(target.hitCancelFlashTime || 0),
    Math.max(1, Number(rule.hitCancelFlashFrames || 3)) / ACTION_FPS
  );
  return true;
}

export function enemyActorRuleForActor(world, actor) {
  const actorId = actor?.runtimeSourceActorId || actor?.id || '';
  const rules = world?.enemyRules?.actorRulesByActor || {};
  return {
    hitCancelChance: Math.max(0, Math.min(100, Number(rules[actorId]?.hitCancelChance || 0))),
    hitCancelFlashFrames: Math.max(1, Math.min(120, Number(rules[actorId]?.hitCancelFlashFrames || 3))),
  };
}
