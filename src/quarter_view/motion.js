import { depthOf, normalizeDirection } from './camera.js';

export function movementInput(keys) {
  return normalizeDirection(
    Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
    Number(keys.has('QuarterDown')) - Number(keys.has('QuarterUp'))
  );
}
export function preparePlaneMotion(actor, direction, keys = null, pressed = null) {
  const player = actor.player;
  const group = player.actionSettings?.[player.actionKey]?.group;
  if (direction && (!player.isCustomActionActive || group === 'movement')) actor.quarterAim = direction;
  actor.quarterAim ||= { x: player.facing || 1, z: 0 };
  player.quarterAim = { ...actor.quarterAim };
  // Preserve the original action's scalar velocity; only map its displacement onto the ground.
  actor.quarterMotionStart = { x: player.x, z: depthOf(actor) };
  const input = { keys: new Set(keys || []), pressed: new Set(pressed || []) };
  if (keys && direction && !input.keys.has('ArrowLeft') && !input.keys.has('ArrowRight')) {
    const code = player.facing < 0 ? 'ArrowLeft' : 'ArrowRight';
    input.keys.add(code);
    if (actor.quarterSynthetic !== code) input.pressed.add(code);
    actor.quarterSynthetic = code;
  } else actor.quarterSynthetic = null;
  return input;
}
export function finishPlaneMotion(actor) {
  const start = actor.quarterMotionStart;
  if (!start) return;
  const player = actor.player;
  const axis = actor.quarterImpulse || actor.quarterAim || { x: player.facing || 1, z: 0 };
  const travel = (player.x - start.x) * (player.facing || 1);
  const rawX = player.x;
  player.x = start.x + travel * axis.x;
  actor.quarterDepth = Math.max(-480, Math.min(480, start.z + travel * axis.z));
  const shift = player.x - rawX;
  const targetMove = player.customActionTargetMove;
  if (targetMove) {
    targetMove.startX += shift;
    targetMove.targetX += shift;
  }
  if (Math.abs(player.vx || 0) < 0.001) actor.quarterImpulse = null;
  delete actor.quarterMotionStart;
}
export function enemyPlaneDirection(actor, target) {
  const dx = target.player.x - actor.player.x;
  const direction = normalizeDirection(dx, depthOf(target) - depthOf(actor));
  // The production AI may deliberately face away during an evade or locked action.
  if (direction && Math.abs(dx) > 0.0001 && dx * actor.player.facing < 0) return { x: -direction.x, z: -direction.z };
  return direction;
}
