import { ACTION_KEYS } from './game_config_data.js';
import { normalizeCustomActions, normalizeDeletedActionKeys } from './action_authoring_data.js';

export function actionKeysForNormalize(customActions = [], deletedActionKeys = []) {
  const deleted = new Set(normalizeDeletedActionKeys(deletedActionKeys));
  return [
    ...ACTION_KEYS.filter((key) => !deleted.has(key)),
    ...normalizeCustomActions(customActions).map((action) => action.key),
  ];
}
