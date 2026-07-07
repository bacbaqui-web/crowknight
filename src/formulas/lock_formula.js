export const lockFormula = {
  type: 'lock',
  label: '고정',
  defaultValue: () => ({
    type: 'lock',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
    };
  },
  renderOptions() {},
  runtime: {
    appliesTo: 'viewLock',
  },
};
