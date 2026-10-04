import { timelineFrameCount } from './timeline_playback_helper.js';
import { interactionObjectRole } from './interaction_object_model_data.js';

// Advance windup/recovery faster while keeping the authored hit frames unchanged.
export function upgradeActionDelta(player, dt) {
  const effects = player.runUpgrades;
  if (!effects) return dt;
  const key = player.customActionKey;
  if (key === 'hurt') return dt / effects.stagger;
  const settings = player.actionSettings?.[key] || {};
  if (settings.group !== 'attack') return dt;
  if (effects.windup === 1 && effects.recovery === 1) return dt;
  if (!player.runUpgradeAttackWindow) player.runUpgradeAttackWindow = attackWindow(player, settings);
  const { start, end } = player.runUpgradeAttackWindow;
  const duration = Math.max(0.01, player.customActionDuration || 0.6);
  let elapsed = Math.max(0, player.customActionElapsed || 0),
    remaining = Math.max(0, dt),
    delta = 0;
  while (remaining > 1e-9) {
    const loop = player.customActionTriggerMode === 'pressLoop';
    let local = loop ? elapsed % duration : elapsed;
    if (loop && duration - local < 1e-10) local = 0;
    const boundary =
      local < start * duration - 1e-10
        ? start * duration
        : local < end * duration - 1e-10
          ? end * duration
          : loop
            ? duration
            : Infinity;
    const scale =
      local < start * duration - 1e-10 ? effects.windup : local < end * duration - 1e-10 ? 1 : effects.recovery;
    const used = Math.min(remaining, Math.max(0, boundary - local) * scale);
    const advance = used / scale;
    elapsed += advance;
    delta += advance;
    remaining -= used;
  }
  return delta;
}

export function attackWindow(player, settings) {
  const frames = timelineFrameCount(settings);
  const probe = Object.create(player);
  probe.customActionBlend = null;
  const keys = Object.keys(player.rig || {}).filter((key) => ['attack', 'guard'].includes(interactionObjectRole(key)));
  let first = frames,
    last = -1;
  for (let i = 0; i < frames; i += 1) {
    probe.getActionFrameProgress = () => i / frames;
    if (
      keys.some((key) => {
        const value = probe.getPartOffset(key);
        return Number(value.active) >= 0.5 && Number(value.attack) >= 0.5;
      })
    ) {
      first = Math.min(first, i);
      last = i;
    }
  }
  // Non-damaging actions in the attack group have no meaningful windup/hit boundary.
  return last < 0 ? { start: 0, end: 1 } : { start: first / frames, end: (last + 1) / frames };
}
