import { createTimelineControllerCommonMethods, createTimelineControllerCore } from './timeline_engine.js';

export function createTimelineController({ name, core }) {
  const coreApi = createTimelineControllerCore(core);
  const defineController = ({ common, extensions = {} }) =>
    defineTimelineController(
      name,
      createTimelineControllerCommonMethods({
        ...coreApi,
        ...common,
      }),
      extensions
    );

  return {
    ...coreApi,
    defineController,
  };
}

const COMMON_TIMELINE_CONTROLLER_METHODS = [
  'addKeyframe',
  'copyFrame',
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
];

function defineTimelineController(name, commonMethods, extensionMethods = {}) {
  return assertTimelineControllerContract(name, {
    ...commonMethods,
    ...extensionMethods,
  });
}

function assertTimelineControllerContract(name, controller) {
  const missing = COMMON_TIMELINE_CONTROLLER_METHODS.filter((method) => typeof controller?.[method] !== 'function');
  if (!missing.length) return controller;

  throw new Error(`${name} timeline controller is missing methods: ${missing.join(', ')}`);
}
