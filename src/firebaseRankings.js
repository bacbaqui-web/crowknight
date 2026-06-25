import { FIREBASE_PROJECT_STATE_CONFIG } from './firebaseConfig.js';

const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1';
const REMOTE_RANKING_LIMIT = 100;

export async function loadRemoteRankings() {
  if (!isFirebaseRankingEnabled()) return null;

  try {
    const response = await window.fetch(`${collectionUrl()}?key=${apiKey()}&pageSize=${REMOTE_RANKING_LIMIT}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const payload = await response.json();
    return normalizeRankingEntries(payload.documents || []);
  } catch {
    return null;
  }
}

export async function addRemoteRankingEntry(entry) {
  if (!isFirebaseRankingEnabled() || !entry) return null;

  try {
    const response = await window.fetch(`${collectionUrl()}?key=${apiKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: rankingEntryToFirestoreFields(entry),
      }),
    });
    if (!response.ok) return null;

    const document = await response.json();
    return normalizeRankingEntryDocument(document);
  } catch {
    return null;
  }
}

export async function deleteRemoteRankingEntry(entry) {
  if (!isFirebaseRankingEnabled() || !entry?.remotePath) return false;

  try {
    const response = await window.fetch(`${FIRESTORE_BASE_URL}/${entry.remotePath}?key=${apiKey()}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch {
    return false;
  }
}

function normalizeRankingEntries(documents) {
  return documents
    .map(normalizeRankingEntryDocument)
    .filter(Boolean)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

function normalizeRankingEntryDocument(document) {
  const fields = document?.fields || {};
  if (!document?.name) return null;

  return {
    remotePath: document.name,
    name: stringField(fields.name) || '이름 없음',
    message: stringField(fields.message),
    score: numberField(fields.score),
    survivalTime: numberField(fields.survivalTime),
    kills: numberField(fields.kills),
    date: stringField(fields.date),
    createdAt: numberField(fields.createdAt),
  };
}

function rankingEntryToFirestoreFields(entry) {
  return {
    name: { stringValue: String(entry.name || '이름 없음').slice(0, 12) },
    message: { stringValue: String(entry.message || '').slice(0, 48) },
    score: { integerValue: String(Math.max(0, Math.round(Number(entry.score || 0)))) },
    survivalTime: { doubleValue: Number(entry.survivalTime || 0) },
    kills: { integerValue: String(Math.max(0, Math.round(Number(entry.kills || 0)))) },
    date: { stringValue: entry.date || new Date().toISOString() },
    createdAt: { integerValue: String(Number(entry.createdAt || Date.now())) },
  };
}

function stringField(field) {
  return field?.stringValue || '';
}

function numberField(field) {
  const value = field?.integerValue ?? field?.doubleValue;
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function isFirebaseRankingEnabled() {
  return Boolean(
    FIREBASE_PROJECT_STATE_CONFIG.enabled &&
    FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim() &&
    FIREBASE_PROJECT_STATE_CONFIG.projectId.trim() &&
    FIREBASE_PROJECT_STATE_CONFIG.rankingCollection?.trim()
  );
}

function collectionUrl() {
  const { projectId, rankingCollection } = FIREBASE_PROJECT_STATE_CONFIG;
  return `${FIRESTORE_BASE_URL}/projects/${encodeURIComponent(
    projectId.trim()
  )}/databases/(default)/documents/${encodeURIComponent(rankingCollection.trim())}`;
}

function apiKey() {
  return encodeURIComponent(FIREBASE_PROJECT_STATE_CONFIG.apiKey);
}
