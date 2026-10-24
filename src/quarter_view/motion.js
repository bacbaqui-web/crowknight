import { depthOf, normalizeDirection } from './camera.js';
import { prepareActionInput, finishActionInput } from './action_input.js';

export function movementInput(keys) {
  return normalizeDirection(
    Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
    Number(keys.has('QuarterDown')) - Number(keys.has('QuarterUp'))
  );
}
export function preparePlaneMotion(actor, direction, keys = null, pressed = null) {
  const player = actor.player;
  const group = player.actionSettings?.[player.actionKey]?.group;
  if (direction && (!player.isCustomActionActive || group === 'movement')) {
    actor.quarterAim = direction;
    if (keys && direction.x) {
      const facing = direction.x < 0 ? -1 : 1;
      // vx encodes forward speed in the native side-facing coordinate system.
      // Rotate retained velocity together with the visual facing before native action blending.
      player.vx *= facing * (player.facing || 1);
      player.facing = facing;
    }
  }
  actor.quarterAim ||= { x: player.facing || 1, z: 0 };
  // Preserve the original action's scalar velocity; only map its displacement onto the ground.
  actor.quarterMotionStart = {
    x: player.x,
    z: depthOf(actor),
    facing: player.facing || 1,
    serial: player.attackSerial,
    direction,
  };
  const input = { keys: new Set(keys || []), pressed: new Set(pressed || []) };
  if (input.keys.has('ArrowLeft') && input.keys.has('ArrowRight')) {
    input.keys.delete('ArrowLeft');
    input.keys.delete('ArrowRight');
    input.pressed.delete('ArrowLeft');
    input.pressed.delete('ArrowRight');
  }
  if (keys && direction && !input.keys.has('ArrowLeft') && !input.keys.has('ArrowRight')) {
    const code = player.facing < 0 ? 'ArrowLeft' : 'ArrowRight';
    input.keys.add(code);
    if (actor.quarterSynthetic !== code) input.pressed.add(code);
    actor.quarterSynthetic = code;
  } else actor.quarterSynthetic = null;
  if (keys) prepareActionInput(actor, input, direction);
  return input;
}
export function finishPlaneMotion(actor, world = null) {
  const start = actor.quarterMotionStart;
  if (!start) return;
  const player = actor.player;
  const intent = finishActionInput(actor, start.serial);
  if (player.attackSerial !== start.serial && (intent?.direction || start.direction))
    actor.quarterAim = start.direction || intent?.direction;
  if (actor.quarterImpulse && player.attackSerial !== actor.quarterImpulseSerial) actor.quarterImpulse = null;
  if (player.attackSerial !== start.serial && player.customActionBlend && player.facing !== start.facing) {
    // A new action may turn during the native blend while retaining the old velocity.
    player.vx *= -1;
    player.x = start.x - (player.x - start.x);
  }
  const axis = actor.quarterImpulse || actor.quarterAim || { x: player.facing || 1, z: 0 };
  const travel = (player.x - start.x) * (player.facing || 1);
  const rawX = player.x;
  const projectedX = start.x + travel * axis.x;
  player.x = Math.max(world?.minX ?? -Infinity, Math.min(world?.maxX ?? Infinity, projectedX));
  actor.quarterDepth = Math.max(-480, Math.min(480, start.z + travel * axis.z));
  const shift = player.x - rawX;
  const targetMove = player.customActionTargetMove;
  if (targetMove) {
    targetMove.startX += shift;
    targetMove.targetX += shift;
  }
  if (Math.abs(player.vx || 0) < 0.001) actor.quarterImpulse = null;
  actor.quarterVelocityFacing = player.facing || 1;
  delete actor.quarterMotionStart;
}
export function enemyPlaneDirection(actor, target) {
  const dx = target.player.x - actor.player.x;
  const direction = normalizeDirection(dx, depthOf(target) - depthOf(actor));
  // The production AI may deliberately face away during an evade or locked action.
  if (direction && Math.abs(dx) > 0.0001 && dx * actor.player.facing < 0) return { x: -direction.x, z: -direction.z };
  return direction;
}
