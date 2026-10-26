import { ACTION_FPS } from './game_config_data.js';
import { actionTimelineMirrorSign } from './action_mirror_helper.js';

// Original speed-linked posture deltas, layered over authored animation.
const OFFSETS = {
  head: { x: 59, y: 49, rot: 0 },
  cape: { x: 45.9, y: 19.5, rot: 53.1 },
  body: { x: -2.8, y: 1.2, rot: 56.5 },
  shoulderR: { x: 29.7, y: 34, rot: 60 },
};

export function movementPoseOffset(player, key, offset) {
  const settings = player.actionSettings?.[player.actionKey] || {};
  const delta = OFFSETS[key];
  if (!delta || player.actionPreview || player.dead || player.hurtTime > 0 ||
      !player.onGround || settings.group !== 'movement' || settings.condition === 'air') return offset;
  const speed = player.groundPoseSpeed ?? Math.abs(Number(player.vx || 0)) * ACTION_FPS;
  const ratio = Math.max(0, Math.min(1, (speed - 100) / 1000));
  if (!ratio) return offset;
  const mirror = actionTimelineMirrorSign(settings, player.facing);
  return {
    ...offset,
    x: Number(offset?.x || 0) + delta.x * ratio * mirror,
    y: Number(offset?.y || 0) + delta.y * ratio,
    rot: Number(offset?.rot || 0) + delta.rot * ratio * mirror,
  };
}
