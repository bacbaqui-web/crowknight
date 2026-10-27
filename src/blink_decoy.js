// A single stationary lure belongs to the current run; using blink replaces it.
export function createBlinkDecoy(actor) {
  const source = actor.player;
  const player = Object.assign(Object.create(Object.getPrototypeOf(source)), source, {
    x: source.x, y: source.floorY ?? source.y, vx: 0, vy: 0,
    customActionKey: null, customActionTime: 0, customActionBlend: null,
    state: 'idle', dead: false, runSkills: null, runDecoy: null,
    runCharge: null, runParryTime: 0, runParryFlash: 0,
    renderPartOffsets: null, captureEditRegions: false,
  });
  source.runDecoy = { ...actor, player, quarterDepth: actor.quarterDepth,
    respawning: false, time: 2 + Math.max(0, (source.runSkills?.blink || 1) - 1) * .5 };
  return source.runDecoy;
}
export function updateBlinkDecoy(actor, dt) {
  const p = actor.player, decoy = p.runDecoy;
  if (!decoy) return;
  decoy.time -= Math.max(0, dt);
  if (p.dead || !p.runSkills?.blink || decoy.time <= 0) p.runDecoy = null;
}
export function enemyTarget(actor) {
  return actor?.player?.runDecoy?.time > 0 && !actor.player.dead ? actor.player.runDecoy : actor;
}
export function drawBlinkDecoy(ctx, decoy) {
  if (!decoy || decoy.time <= 0) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(.75, decoy.time * 2);
  ctx.filter = 'brightness(1.5) saturate(.35)';
  ctx.shadowColor = '#82ffd5';ctx.shadowBlur = 16;
  decoy.player.draw(ctx);
  ctx.filter = 'none';ctx.shadowBlur = 0;
  ctx.strokeStyle = '#82ffd5';ctx.lineWidth = 2;
  ctx.beginPath();ctx.ellipse(decoy.player.x, decoy.player.y, 30, 10, 0, 0, Math.PI * 2);ctx.stroke();
  ctx.restore();
}
