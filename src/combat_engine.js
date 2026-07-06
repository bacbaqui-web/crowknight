export function updateBattleActorMotion({ actors, playerActor, keys, pressed, world, dt }) {
  updateActorCombatTimers(actors, dt);

  playerActor.player.update(dt, keys, pressed, world);

  actors.slice(1).forEach((actor) => {
    actor.player.updateNpc(dt, playerActor.player, world);
  });
}

export function resolveCombat({ actors, playerActor, world, particleEffects, onPlayerDeath, onPlayerKill }) {
  void world;

  actors.forEach((attacker) => {
    if (attacker.respawning) return;
    const attackRegions = attacker.player.attackInteractionRegions || [];
    if (!attackRegions.length) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(attacker, target)) return;
      if (target.lastHitSerials[attacker.id] === attacker.player.attackSerial) return;
      const attackRegion = overlappingAttackRegion(attackRegions, target.player.hurtInteractionRegions);
      if (!attackRegion) return;

      const comboStep = attacker.player.comboStep || 1;
      target.lastHitSerials[attacker.id] = attacker.player.attackSerial;
      const removed = applyHitDamage({
        attacker,
        target,
        comboStep,
        playerActor,
        particleEffects,
        onPlayerDeath,
        onPlayerKill,
      });
      if (removed) return;

      applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects);
    });
  });
}

function overlappingAttackRegion(attackRegions, hurtRegions) {
  return attackRegions.find((attackRegion) =>
    (hurtRegions || []).some((hurtRegion) => interactionRegionsOverlap(attackRegion, hurtRegion))
  );
}

function interactionRegionsOverlap(activeRegion, targetRegion) {
  if (!activeRegion?.points?.length) return rectsOverlap(activeRegion, targetRegion);
  if (!rectsOverlap(activeRegion, targetRegion)) return false;
  return convexPolygonsOverlap(activeRegion.points, regionPoints(targetRegion));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function convexPolygonsOverlap(a, b) {
  return ![a, b].some((points) => {
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const axis = { x: -(next.y - current.y), y: next.x - current.x };
      const projectionA = projectPolygon(a, axis);
      const projectionB = projectPolygon(b, axis);
      if (projectionA.max < projectionB.min || projectionB.max < projectionA.min) return true;
    }
    return false;
  });
}

function regionPoints(region) {
  if (region?.points?.length) return region.points;
  return [
    { x: region.x, y: region.y },
    { x: region.x + region.w, y: region.y },
    { x: region.x + region.w, y: region.y + region.h },
    { x: region.x, y: region.y + region.h },
  ];
}

function projectPolygon(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.y * axis.y);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function maintainEnemyFlow() {
  // Enemy flow is no longer hardcoded. Spawn, despawn, and movement should be data-authored rules.
}

function updateActorCombatTimers(actors, dt) {
  actors.forEach((actor) => {
    actor.hurtCooldown = Math.max(0, actor.hurtCooldown - dt);
    actor.hitStun = Math.max(0, actor.hitStun - dt);
    actor.invulnTime = Math.max(0, actor.invulnTime - dt);
  });
}

function shouldSkipTarget(attacker, target) {
  return (
    target === attacker ||
    target.respawning ||
    target.hurtCooldown > 0 ||
    target.invulnTime > 0 ||
    target.player.isRolling
  );
}

function applyHitDamage({ attacker, target, comboStep, playerActor, particleEffects, onPlayerDeath, onPlayerKill }) {
  target.hpPips = Math.max(0, target.hpPips - 1);
  if (target.hpPips > 0) return false;

  if (target === playerActor) {
    onPlayerDeath();
    return true;
  }

  if (attacker === playerActor) onPlayerKill();
  particleEffects.triggerHitImpact(attacker, target, comboStep, true);
  target.respawning = false;
  target.hurtCooldown = 0;
  target.hitStun = 0;
  target.invulnTime = 0;
  target.player.dead = true;
  target.player.updateState();
  return true;
}

function applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects) {
  void attackRegion;
  particleEffects.triggerHitImpact(attacker, target, comboStep);
}
