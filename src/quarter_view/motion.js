import { isRollAction } from '../movement_skill_helper.js';
import { depthOf, normalizeDirection } from './camera.js';
import { constrainGroundPosition } from './bounds.js';
import { prepareQuarterFacing } from './facing.js';
import { prepareActionInput, finishActionInput } from './action_input.js';

export function movementInput(keys) {
  return normalizeDirection(
    Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
    Number(keys.has('QuarterDown')) - Number(keys.has('QuarterUp'))
  );
}
export function preparePlaneMotion(actor, direction, keys = null, pressed = null) {
  const player = actor.player;
  if (keys) prepareQuarterFacing(actor, direction);
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
    time: player.animTime,
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
  const walking =
    start.direction &&
    player.onGround &&
    !actor.quarterImpulse &&
    player.actionSettings?.[player.actionKey]?.group === 'movement';
  const speed = walking ? actor.quarterMoveSpeed || 1 : 1;
  const travel = (player.x - start.x) * (player.facing || 1) * speed;
  const rawX = player.x;
  const projectedX = start.x + travel * axis.x;
  player.x = projectedX;
  actor.quarterDepth = start.z + travel * axis.z;
  if (
    actor.quarterAirControl &&
    !isRollAction(player) &&
    !player.onGround &&
    !actor.quarterImpulse &&
    !(player.hurtTime > 0) &&
    player.actionSettings?.[player.actionKey]?.group !== 'attack'
  ) {
    const dt = Math.max(0, Math.min(0.05, player.animTime - start.time));
    const desired = start.direction || { x: 0, z: 0 };
    const previous = actor.quarterAirVelocity || { x: 0, z: 0 };
    const blend = 1 - Math.exp(-dt / 0.065);
    const vx = previous.x + (desired.x * 300 - previous.x) * blend;
    const vz = previous.z + (desired.z * 300 - previous.z) * blend;
    actor.quarterAirVelocity = { x: vx, z: vz };
    player.x = start.x + vx * dt;
    actor.quarterDepth = start.z + vz * dt;
  } else actor.quarterAirVelocity = null;
  constrainGroundPosition(actor, world);
  const elapsed = player.animTime - start.time;
  if (elapsed > 0) player.groundPoseSpeed = Math.hypot(player.x - start.x, depthOf(actor) - start.z) / elapsed;
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
