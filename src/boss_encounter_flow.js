import { isDeathRagdollVisible } from './death_ragdoll_engine.js';
import { normalizeCharacterGroup } from './character_group_data.js';

const encounters = new WeakMap();
export const isBoss = (actor) => normalizeCharacterGroup(actor?.group, '') === 'bosses';

// One encounter owns the whole boss pool, rather than one respawn timer per species.
export function maintainBossEncounter(bosses, { hide, respawn, eligible, random = Math.random }) {
  if (!bosses.length) return;
  const pool = bosses.filter(eligible);
  let state = encounters.get(bosses[0]);
  if (!state) {
    state = { current: null };
    encounters.set(bosses[0], state);
    bosses.forEach(hide);
  }
  if (state.current && !state.current.player.dead && !state.current.respawning) return;
  // Keep the defeated boss drawable until its fragments finish fading.
  if (state.current?.player.dead && isDeathRagdollVisible(state.current.player)) return;
  bosses.forEach(hide);
  if (!pool.length) {
    state.current = null;
    return;
  }
  state.current = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  respawn(state.current);
}
