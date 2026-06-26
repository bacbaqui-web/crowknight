export const COMMON_TIMELINE_CONTROLLER_METHODS = [
  'addKeyframe',
  'copyFrame',
  'currentFrameValue',
  'deleteKeyframe',
  'hasFrameSelection',
  'pasteFrame',
  'resetAnimation',
  'resetSelectionState',
  'stepDuration',
  'stopPreview',
  'syncPreview',
  'togglePlayback',
  'togglePlaybackMode',
  'updatePlaybackRate',
  'updateSetting',
  'writeFrameValue',
];

export function assertTimelineControllerContract(name, controller) {
  const missing = COMMON_TIMELINE_CONTROLLER_METHODS.filter((method) => typeof controller?.[method] !== 'function');
  if (!missing.length) return controller;

  throw new Error(`${name} timeline controller is missing methods: ${missing.join(', ')}`);
}

export function defineTimelineController(name, commonMethods, extensionMethods = {}) {
  return assertTimelineControllerContract(name, {
    ...commonMethods,
    ...extensionMethods,
  });
}
