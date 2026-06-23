import { STORAGE_KEY } from './gameConfig.js';

export function loadSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveActorState(actors) {
  const actorsState = {};
  actors.forEach((actor) => {
    actorsState[actor.id] = {
      name: actor.name,
      tuning: actor.tuning,
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ actors: actorsState }));
}
