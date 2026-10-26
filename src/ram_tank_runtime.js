export const RAM_TANK = Object.freeze({ warning: 1, charge: 0.9, brake: 0.3, recovery: 1.2, speed: 650 });
export const TANK_PART_ORDER = [
  'shield',
  'lowerLegR',
  'cape',
  'collar',
  'head',
  'upperArmL',
  'upperArmR',
  'body',
  'lowerArmL',
  'backpack',
  'upperLegL',
  'upperLegR',
  'lowerLegL',
  'weapon',
];
export function isRamTank(player) {
  return Boolean(player?.actionSettings?.tankCharge);
}
export function tankPhase(time) {
  if (time < RAM_TANK.warning) return 'warning';
  if (time < RAM_TANK.warning + RAM_TANK.charge) return 'charge';
  if (time < RAM_TANK.warning + RAM_TANK.charge + RAM_TANK.brake) return 'brake';
  return 'recovery';
}
// Integrating a speed profile keeps travel identical at different frame rates.
export function tankChargeDistance(time) {
  const t = Math.max(0, time - RAM_TANK.warning);
  const rush = Math.min(t, RAM_TANK.charge);
  const brake = Math.max(0, Math.min(RAM_TANK.brake, t - RAM_TANK.charge));
  return RAM_TANK.speed * (rush + brake - (brake * brake) / (2 * RAM_TANK.brake));
}
export function prepareTankMotion(actor) {
  const player = actor?.player;
  if (!isRamTank(player)) return null;
  const start = { x: player.x, time: player.customActionElapsed || 0, serial: player.attackSerial };
  if (
    player.dead ||
    actor.respawning ||
    player.actionKey !== 'tankCharge' ||
    actor.hitStun > 0 ||
    player.runParryStun > 0
  ) {
    player.tankCharge = null;
    return start;
  }
  if (!player.tankCharge || player.tankCharge.serial !== start.serial || start.time < player.tankCharge.time) {
    player.tankCharge = {
      serial: start.serial,
      time: start.time,
      x: player.x,
      y: player.y,
      depth: actor.quarterDepth,
      facing: player.customActionFacing || player.facing || 1,
      aim: { ...(actor.quarterAim || { x: player.facing || 1, z: 0 }) },
    };
  }
  player.tankCharge.time = start.time;
  player.facing = player.tankCharge.facing;
  actor.quarterAim = { ...player.tankCharge.aim };
  return start;
}
export function finishTankMotion(actor, start, dt, world) {
  if (!start) return;
  const player = actor.player;
  if (player.tankCharge && player.actionKey === 'tankCharge' && !player.dead) {
    const travel = tankChargeDistance(start.time + Math.max(0, dt)) - tankChargeDistance(start.time);
    player.x = start.x + travel * player.tankCharge.facing;
    if (!world?.quarterView) player.x = Math.max(world?.minX ?? -Infinity, Math.min(world?.maxX ?? Infinity, player.x));
    player.vx = 0;
    player.vxInertia = 0;
  } else if (player.actionKey !== 'tankCharge' || player.dead) player.tankCharge = null;
  player.tankWheelAngle = (player.tankWheelAngle || 0) + ((player.x - start.x) * (player.facing || 1)) / 28;
}
