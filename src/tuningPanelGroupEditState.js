import {
  createDefaultGroupEditValues,
  resetGroupTransformValues as resetGroupTransformValueState,
} from './panelEditState.js';

export function createTuningPanelGroupEditState() {
  let values = createDefaultGroupEditValues();

  return {
    getValues: () => values,
    setValues: (nextValues) => {
      values = nextValues;
    },
    createDefaultValues: createDefaultGroupEditValues,
    resetValues: () => {
      values = createDefaultGroupEditValues();
    },
    resetTransformValues: () => {
      resetGroupTransformValueState(values);
    },
  };
}
