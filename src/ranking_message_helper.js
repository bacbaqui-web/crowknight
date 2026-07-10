export const RANKING_MESSAGE_MAX_LENGTH = 20;

const URL_PATTERN = /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|kr|io|gg|co)(?:\b|\/))/i;

export function normalizeRankingMessage(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, RANKING_MESSAGE_MAX_LENGTH);
}

export function hasRankingMessageUrl(value) {
  return URL_PATTERN.test(String(value || ''));
}

export function validRankingMessage(value) {
  const message = normalizeRankingMessage(value);
  return !message || !hasRankingMessageUrl(message);
}
