export function isActionMirrorEnabled(settings = {}) {
  return settings?.mirror !== false;
}

export function actionMoveMirrorSign(settings = {}, facing = 1) {
  return isActionMirrorEnabled(settings) && Number(facing) < 0 ? -1 : 1;
}

export function actionTimelineMirrorSign(settings = {}, facing = 1) {
  return !isActionMirrorEnabled(settings) && Number(facing) < 0 ? -1 : 1;
}

export function mirrorActionFrameValue(value, mirrorSign = 1) {
  if (mirrorSign === 1 || !value) return value;
  return {
    ...value,
    x: -Number(value.x || 0),
    rot: -Number(value.rot || 0),
  };
}
