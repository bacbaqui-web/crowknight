import { defineTimelineController } from './timelineControllerContract.js';
import { createTimelineControllerCommonMethods, createTimelineControllerCore } from './timelineControllerCore.js';

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
