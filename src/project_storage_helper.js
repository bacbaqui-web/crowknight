import { FIREBASE_PROJECT_STATE_CONFIG } from './firebaseConfig.js';
import { OBSOLETE_STORAGE_KEYS, STORAGE_KEY } from './game_config.js';
import { createActorDefsSnapshot } from './actor_factory.js';
import {
  DEFAULT_SCENE_SESSION_ID,
  normalizeSceneSession,
  normalizeSceneSessions,
  syncWorldToSceneSession,
} from './scene_session_data.js';

const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1';
const PROJECT_DEFAULT_STATE_URL = './runtime/project-default-state.json';

export async function loadSavedState() {
  removeObsoleteLocalTuningState();

  const remoteState = normalizeNullableSavedState(await loadRemoteProjectState());
  if (remoteState) {
    saveLocalState(remoteState);
    return remoteState;
  }

  let localState = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsedState = JSON.parse(saved);
      localState = normalizeSavedState(parsedState);
    }
  } catch {
    // Ignore broken browser storage and fall back to the project default.
  }

  if (localState) {
    const state = localState.savedAt ? localState : stampSavedState(localState);
    saveLocalState(state);
    return state;
  }

  try {
    const response = await window.fetch(`${PROJECT_DEFAULT_STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const projectState = await response.json();
      const normalizedProjectState = normalizeSavedState(projectState);
      saveLocalState(normalizedProjectState);
      return normalizedProjectState;
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
    savedAt: Date.now(),
    activeSessionId,
    sessions,
    effectAssets: effectAssetSources,
    characters: createActorDefsSnapshot(characterDefs || actors),
    actors: actorsState,
  };
}

export async function uploadSavedStateToFirebase({
  actors,
  characterDefs = null,
  activeSessionId,
  sessions,
  effectAssetSources,
}) {
  const state = createSavedStateSnapshot({ actors, characterDefs, activeSessionId, sessions, effectAssetSources });
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
    effectAssets: saved?.effectAssets || {},
    characters: Array.isArray(saved?.characters) ? saved.characters : null,
    actors: saved?.actors || {},
  };
}

function normalizeNullableSavedState(saved) {
  if (!saved) return null;
  return normalizeSavedState(saved);
}

function stampSavedState(state) {
  return {
    ...state,
    savedAt: Date.now(),
  };
}

function saveLocalState(state) {
  try {
    removeObsoleteLocalTuningState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    window.console?.warn('Local metadata save failed. Firebase upload will continue.', error);
    return false;
  }
}

function removeObsoleteLocalTuningState() {
  try {
    OBSOLETE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    window.console?.warn('Obsolete local metadata cleanup failed.', error);
  }
}

async function loadRemoteProjectState() {
  if (!isFirebaseProjectStateEnabled()) return null;

  try {
    const response = await window.fetch(remoteProjectStateDocumentUrl(), { cache: 'no-store' });
    if (!response.ok) return null;

    const document = await response.json();
    const stateJson = await readFirestoreStateJson(document?.fields || {});
    if (!stateJson) return null;

    return JSON.parse(stateJson);
  } catch {
    return null;
  }
}

async function saveRemoteProjectState(state) {
  if (!isFirebaseProjectStateEnabled() || !state) return false;

  try {
    const stateJson = JSON.stringify(state);
    const stateFields = await createFirestoreStateFields(stateJson);
    const response = await window.fetch(remoteProjectStateDocumentUrl(), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          ...stateFields,
          savedAt: { integerValue: String(state.savedAt || Date.now()) },
        },
      }),
    });
    if (!response.ok) {
      window.console?.warn('Firebase metadata upload failed.', response.status, await responseText(response));
      return false;
    }
    return true;
  } catch (error) {
    window.console?.warn('Firebase metadata upload failed.', error);
    return false;
  }
}

async function readFirestoreStateJson(fields) {
  const encoding = fields.stateEncoding?.stringValue || 'json';
  const stateData = fields.stateData?.stringValue || '';
  if (encoding === 'gzip-base64' && stateData) return decompressBase64Gzip(stateData);
  return fields.stateJson?.stringValue || '';
}

async function createFirestoreStateFields(stateJson) {
  const compressed = await compressToBase64Gzip(stateJson);
  if (compressed) {
    return {
      stateEncoding: { stringValue: 'gzip-base64' },
      stateData: { stringValue: compressed },
      stateJson: { stringValue: '' },
    };
  }

  return {
    stateEncoding: { stringValue: 'json' },
    stateData: { stringValue: '' },
    stateJson: { stringValue: stateJson },
  };
}

async function compressToBase64Gzip(value) {
  if (!window.CompressionStream || !window.TextEncoder || !window.Blob || !window.Response) return '';

  try {
    const bytes = new window.TextEncoder().encode(value);
    const stream = new window.Blob([bytes]).stream().pipeThrough(new window.CompressionStream('gzip'));
    const buffer = await new window.Response(stream).arrayBuffer();
    return bytesToBase64(new Uint8Array(buffer));
  } catch (error) {
    window.console?.warn('Firebase metadata compression failed. Falling back to plain JSON.', error);
    return '';
  }
}

async function decompressBase64Gzip(value) {
  if (!window.DecompressionStream || !window.Blob || !window.Response) return '';

  try {
    const bytes = base64ToBytes(value);
    const stream = new window.Blob([bytes]).stream().pipeThrough(new window.DecompressionStream('gzip'));
    return new window.Response(stream).text();
  } catch (error) {
    window.console?.warn('Firebase metadata decompression failed.', error);
    return '';
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

function base64ToBytes(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function responseText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function isFirebaseProjectStateEnabled() {
  return Boolean(
    FIREBASE_PROJECT_STATE_CONFIG.enabled &&
    FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim() &&
    FIREBASE_PROJECT_STATE_CONFIG.projectId.trim() &&
    FIREBASE_PROJECT_STATE_CONFIG.collection.trim() &&
    FIREBASE_PROJECT_STATE_CONFIG.documentId.trim()
  );
}

function remoteProjectStateDocumentUrl() {
  const { projectId, collection, documentId } = FIREBASE_PROJECT_STATE_CONFIG;
  return `${FIRESTORE_BASE_URL}/projects/${encodeURIComponent(
    projectId.trim()
  )}/databases/(default)/documents/${encodeURIComponent(collection.trim())}/${encodeURIComponent(
    documentId.trim()
  )}?key=${encodeURIComponent(FIREBASE_PROJECT_STATE_CONFIG.apiKey)}`;
}
