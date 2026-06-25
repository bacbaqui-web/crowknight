import { FIREBASE_PROJECT_STATE_CONFIG } from './firebaseConfig.js';

const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1';

export async function loadRemoteProjectState() {
  if (!isFirebaseProjectStateEnabled()) return null;

  try {
    const response = await window.fetch(
      `${documentUrl()}?key=${encodeURIComponent(FIREBASE_PROJECT_STATE_CONFIG.apiKey)}`,
      {
        cache: 'no-store',
      }
    );
    if (!response.ok) return null;

    const document = await response.json();
    const stateJson = document?.fields?.stateJson?.stringValue;
    if (!stateJson) return null;

    return JSON.parse(stateJson);
  } catch {
    return null;
  }
}

export async function saveRemoteProjectState(state) {
  if (!isFirebaseProjectStateEnabled() || !state) return false;

  try {
    const response = await window.fetch(
      `${documentUrl()}?key=${encodeURIComponent(FIREBASE_PROJECT_STATE_CONFIG.apiKey)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            stateJson: { stringValue: JSON.stringify(state) },
            savedAt: { integerValue: String(state.savedAt || Date.now()) },
          },
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
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

function documentUrl() {
  const { projectId, collection, documentId } = FIREBASE_PROJECT_STATE_CONFIG;
  return `${FIRESTORE_BASE_URL}/projects/${encodeURIComponent(
    projectId.trim()
  )}/databases/(default)/documents/${encodeURIComponent(collection.trim())}/${encodeURIComponent(documentId.trim())}`;
}
