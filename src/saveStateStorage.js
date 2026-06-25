import { STORAGE_KEY } from './gameConfig.js';
import {
  DEFAULT_SCENE_SESSION_ID,
  normalizeSceneSession,
  normalizeSceneSessions,
  syncWorldToSceneSession,
} from './sceneSession.js';
import { loadRemoteProjectState, saveRemoteProjectState } from './firebaseProjectState.js';

const PROJECT_DEFAULT_STATE_URL = './runtime/project-default-state.json';

export async function loadSavedState() {
  let localState = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      localState = normalizeSavedState(JSON.parse(saved));
    }
  } catch {
    // Ignore broken browser storage and fall back to the project default.
  }

  const remoteState = normalizeNullableSavedState(await loadRemoteProjectState());
  const freshestSavedState = newestSavedState(localState, remoteState);
  if (freshestSavedState) {
    const state = freshestSavedState.savedAt ? freshestSavedState : stampSavedState(freshestSavedState);
    saveLocalState(state);
    return state;
  }

  try {
    const response = await window.fetch(`${PROJECT_DEFAULT_STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const projectState = normalizeSavedState(await response.json());
      saveLocalState(projectState);
      return projectState;
    }
  } catch {
    // The project default file is optional.
  }

  return normalizeSavedState(null);
}

export function saveActorState(actors, sceneSession = null) {
  saveGameState({
    actors,
    activeSessionId: sceneSession?.id || DEFAULT_SCENE_SESSION_ID,
    sessions: sceneSession ? { [sceneSession.id]: sceneSession } : null,
  });
}

export function saveGameState({ actors, activeSessionId, sessions }) {
  const state = createSavedStateSnapshot({ actors, activeSessionId, sessions });
  saveLocalState(state);
}

export function syncSceneWorldBeforeSave(sceneSession, world) {
  if (!sceneSession || !world) return;
  syncWorldToSceneSession(sceneSession, world);
}

export function createSavedStateSnapshot({ actors, activeSessionId, sessions }) {
  const actorsState = {};
  actors.forEach((actor) => {
    actorsState[actor.id] = {
      name: actor.name,
      tuning: actor.tuning,
    };
  });

  return {
    version: 2,
    savedAt: Date.now(),
    activeSessionId,
    sessions,
    actors: actorsState,
  };
}

export async function uploadSavedStateToFirebase({ actors, activeSessionId, sessions }) {
  const state = createSavedStateSnapshot({ actors, activeSessionId, sessions });
  saveLocalState(state);
  return saveRemoteProjectState(state);
}

export async function downloadSavedStateFromFirebase() {
  const remoteState = normalizeNullableSavedState(await loadRemoteProjectState());
  if (!remoteState) return false;
  saveLocalState(remoteState);
  return true;
}

function normalizeSavedState(saved) {
  const activeSessionId = saved?.activeSessionId || saved?.sceneSession?.id || DEFAULT_SCENE_SESSION_ID;
  const normalized = normalizeSceneSessions(saved?.sessions, activeSessionId);
  if (saved?.sceneSession && !saved?.sessions) {
    normalized.sceneSession = normalizeSceneSession(saved.sceneSession);
    normalized.sessions = { [normalized.sceneSession.id]: normalized.sceneSession };
    normalized.activeSessionId = normalized.sceneSession.id;
  }

  return {
    version: 2,
    savedAt: Number.isFinite(saved?.savedAt) ? saved.savedAt : 0,
    activeSessionId: normalized.activeSessionId,
    sessions: normalized.sessions,
    sceneSession: normalized.sceneSession,
    actors: saved?.actors || {},
  };
}

function normalizeNullableSavedState(saved) {
  return saved ? normalizeSavedState(saved) : null;
}

function newestSavedState(...states) {
  return states.filter(Boolean).sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0];
}

function stampSavedState(state) {
  return {
    ...state,
    savedAt: Date.now(),
  };
}

function saveLocalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
