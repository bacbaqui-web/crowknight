export const COMMON_TIMELINE_ADAPTER_METHODS = [
  'addKeyframe',
  'copyFrame',
  'createPreview',
  'deleteKeyframe',
  'ensureKeyframe',
  'ensureSettings',
  'key',
  'keyframes',
  'moveKeyframe',
  'resetAnimation',
  'setDragPreview',
  'settings',
  'settingsByKey',
  'pasteFrameCopy',
  'pasteTargetFrameId',
  'writeFrameValue',
  'writeSetting',
];

export function assertTimelineAdapterContract(name, adapter) {
  const missing = COMMON_TIMELINE_ADAPTER_METHODS.filter((method) => typeof adapter?.[method] !== 'function');
  if (!missing.length) return adapter;

  throw new Error(`${name} timeline adapter is missing methods: ${missing.join(', ')}`);
}

export function defineTimelineAdapter(name, commonMethods, extensionMethods = {}) {
  return assertTimelineAdapterContract(name, {
    ...commonMethods,
    ...extensionMethods,
  });
}
