import { resetPlayerActionState } from './actorState.js';
import { syncActorHealthCapacity } from './actorTuning.js';

export function placeEnemiesAhead(actors, playerActor, world) {
  const startX = playerActor.player.x + 260;
  actors.slice(1).forEach((actor, index) => {
    syncActorHealthCapacity(actor, true);
    actor.respawning = false;
    actor.hpPips = actor.maxHpPips;
    actor.player.x = startX + index * 170;
    actor.respawnTargetX = actor.player.x;
    actor.player.y = world.floorY;
    actor.player.vx = 0;
    actor.player.vy = 0;
    actor.player.facing = -1;
    actor.player.hurtTime = 0;
    resetPlayerActionState(actor.player);
    actor.player.updateState();
  });
}

export function lineUpActors(actors, world) {
  const slots = [480, 610, 740, 870, 1000];
  actors.forEach((actor, index) => {
    syncActorHealthCapacity(actor, true);
    actor.hp = 100;
    actor.hpPips = actor.maxHpPips;
    actor.respawning = false;
    actor.invulnTime = 0;
    actor.wasRolling = false;
    actor.hurtCooldown = 0;
    actor.hitStun = 0;
    actor.rollGhosts = [];
    actor.rollGhostTimer = 0;
    actor.lastHitSerials = {};
    actor.player.x = slots[index];
    actor.respawnTargetX = actor.player.x;
    actor.player.y = world.floorY;
    actor.player.vx = 0;
    actor.player.vy = 0;
    actor.player.facing = index === 0 ? 1 : -1;
    actor.player.attackTime = 0;
    actor.player.dashTime = 0;
    actor.player.dashCooldown = 0;
    actor.player.jumpHoldTime = 0;
    actor.player.airFlapCooldownTime = 0;
    actor.player.glideTime = actor.player.glideTimeMax;
    actor.player.glideActive = false;
    actor.player.attackCooldown = 0;
    actor.player.attackCarrySpeed = 0;
    actor.player.hurtTime = 0;
    actor.player.dead = false;
    resetPlayerActionState(actor.player);
    actor.player.onGround = true;
    actor.player.updateState();
  });
}
