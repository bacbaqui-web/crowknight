import { depthOf } from './camera.js';

export function constrainGroundPosition(actor, world = null) {
  actor.player.x = Math.max(world?.minX ?? -Infinity, Math.min(world?.maxX ?? Infinity, actor.player.x));
  actor.quarterDepth = Math.max(-480, Math.min(480, depthOf(actor)));
  actor.player.quarterDepth = actor.quarterDepth;
}
