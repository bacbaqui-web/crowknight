import { createProjectSaveQueue } from './project_save_queue.js';
import { OBSOLETE_STORAGE_KEYS, STORAGE_KEY } from './game_config_data.js';
import { createActorDefsSnapshot } from './actor_factory.js';
import {
  DEFAULT_SCENE_SESSION_ID,
  normalizeSceneSession,
  normalizeSceneSessions,
  syncWorldToSceneSession,
} from './scene_session_data.js';

const PROJECT_URLS = {
  local: './data/draft.json',
  beta: './data/beta.json',
  published: './data/published.json',
};
let exitGuardInstalled = false;
const saveQueue = createProjectSaveQueue({
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  clearTimer: (timer) => window.clearTimeout(timer),
  onStatus: (detail) => window.dispatchEvent(new window.CustomEvent('project-save-status', { detail })),
  async write(state) {
    const response = await window.fetch('./api/project/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: state,
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || '베타 저장 실패');
    return result;
  },
});

export async function loadSavedState({ source = 'local' } = {}) {
  try {
    const response = await window.fetch(`${PROJECT_URLS[source]}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return normalizeSavedState(await response.json());
  } catch {
    return null;
  }
}

export function flushProjectSave() {
  return saveQueue.flush();
}

export function retryProjectSave() {
  return saveQueue.retry();
}

export function saveActorState(actors, sceneSession = null) {
  saveGameState({
    actors,
    activeSessionId: sceneSession?.id || DEFAULT_SCENE_SESSION_ID,
    sessions: sceneSession ? { [sceneSession.id]: sceneSession } : null,
  });
}

export function saveGameState({ actors, characterDefs = null, activeSessionId, sessions, effectAssetSources = {} }) {
  const state = createSavedStateSnapshot({ actors, characterDefs, activeSessionId, sessions, effectAssetSources });
  saveLocalState(state);
}

export function syncSceneWorldBeforeSave(sceneSession, world) {
  if (!sceneSession || !world) return;
  syncWorldToSceneSession(sceneSession, world);
}

export function createSavedStateSnapshot({
  actors,
  characterDefs = null,
  activeSessionId,
  sessions,
  effectAssetSources = {},
  releaseVersion = 0,
}) {
  const actorsState = {};
  actors.forEach((actor) => {
    actorsState[actor.id] = {
      name: actor.name,
      tuning: actor.tuning,
      assets: actor.assetSources || {},
    };
  });

  return {
    version: 2,
    releaseVersion: Number.isFinite(Number(releaseVersion)) ? Number(releaseVersion) : 0,
    savedAt: Date.now(),
    activeSessionId,
    sessions,
    effectAssets: effectAssetSources,
    characters: createActorDefsSnapshot(characterDefs || actors),
    actors: actorsState,
  };
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
    releaseVersion: saved?.releaseVersion || 0,
    revision: saved?.revision || '',
    savedAt: Number.isFinite(saved?.savedAt) ? saved.savedAt : 0,
    activeSessionId: normalized.activeSessionId,
    sessions: normalized.sessions,
    sceneSession: normalized.sceneSession,
    effectAssets: saved?.effectAssets || {},
    characters: Array.isArray(saved?.characters) ? saved.characters : null,
    actors: saved?.actors || {},
  };
}

function saveLocalState(state) {
  // Capture at the edit boundary, so later mutations cannot alter an earlier save.
  const serialized = JSON.stringify(state);
  saveQueue.schedule(serialized);
  if (!exitGuardInstalled && window.addEventListener) {
    window.addEventListener('beforeunload', (event) => {
      if (!saveQueue.isDirty()) return;
      event.preventDefault();
      event.returnValue = '';
    });
    exitGuardInstalled = true;
  }
  try {
    OBSOLETE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Disk-backed project saves still work when browser storage is full.
  }
}
