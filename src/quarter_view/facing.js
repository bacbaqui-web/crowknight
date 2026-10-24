export function prepareQuarterFacing(actor, direction) {
  actor.quarterInputDirection = direction;
  actor.player.resolveActionFacing ||= (key, facing, consumedCodes = []) => {
    const player = actor.player;
    if (player.actionSettings?.[key]?.group !== 'attack') return facing;
    const queued = consumedCodes
      .map((code) => actor.quarterPendingInputs?.get(code))
      .find((intent) => intent?.direction);
    const aim = actor.quarterInputDirection || queued?.direction || actor.quarterAim;
    if (!aim) return facing;
    actor.quarterAim = aim;
    if (!aim.x) return facing;
    const next = aim.x < 0 ? -1 : 1;
    // Align retained native velocity before the new pose blend and action formulas run.
    player.vx = Number(player.vx || 0) * next * (player.facing || 1);
    actor.quarterVelocityFacing = next;
    if (actor.quarterMotionStart) actor.quarterMotionStart.facing = next;
    return next;
  };
}
