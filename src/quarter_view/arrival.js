export const ARRIVAL_DURATION = 1.4;
export const ARRIVAL_FLIGHT = 1.15;
export function createArrival(world) {
  let state = null;
  function begin(actor) {
    const p = actor.player;
    state = { actor, x: p.x, z: actor.quarterDepth || 0, time: 0, span: Math.max(600, world.viewW * 0.7) };
    world.quarterView.arrival = state;
    p.vx = p.vy = 0;
    p.facing = 1;
    advance(0);
  }
  function advance(dt, keys, pressed, effects) {
    if (!state) return false;
    effects?.update(dt);
    keys?.clear();
    pressed?.clear();
    state.time += Math.max(0, Math.min(0.1, dt));
    const { actor, x, z, time, span } = state;
    const p = actor.player;
    const t = Math.min(1, time / ARRIVAL_FLIGHT);
    const remaining = (1 - t) ** 2;
    p.x = x - span * remaining;
    actor.quarterDepth = z - 160 * remaining;
    p.quarterDepth = actor.quarterDepth;
    p.y = world.floorY - (100 * (1 - t) + 640 * t * (1 - t));
    p.vx = p.vy = 0;
    p.onGround = t === 1;
    if (p.onGround && !state.landed) {
      state.landed = true;
      effects?.emitLandingDust(p, 0, 0.55);
      effects?.shakeScreen({ magnitude: 2.8, duration: 0.14, direction: 'vertical' });
    }
    p.animTime += dt;
    p.actionPreview = t < 1 ? { action: 'customAction3', t: 0.2 + t * 0.65 } : { action: 'idle', t: 0 };
    if (time >= ARRIVAL_DURATION) {
      p.x = x;
      p.y = world.floorY;
      actor.quarterDepth = p.quarterDepth = z;
      p.actionPreview = null;
      p.state = 'idle';
      p.stateTime = 0;
      p.onGround = true;
      actor.quarterPendingInputs?.clear();
      state = null;
      world.quarterView.arrival = null;
    }
    return true;
  }
  return {
    begin,
    advance,
    get active() {
      return Boolean(state);
    },
  };
}
