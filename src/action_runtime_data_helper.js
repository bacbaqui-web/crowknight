export function actionRuntimeSettings(player, key) {
  return player.actionSettings?.[key] || {};
}

export function currentCustomAction(player) {
  return runtimeActions(player).find((action) => action?.key === player.customActionKey) || null;
}

export function runtimeActions(player) {
  return (player.actions || player.customActions || []).map((action) => ({
    ...action,
    modifiers: liveActionModifiers(player, action),
  }));
}

export function liveActionModifiers(player, action) {
  return player.modifiers?.action?.[action?.key] || action?.modifiers || [];
}
