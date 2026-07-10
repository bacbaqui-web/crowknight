export const aiFormula = {
  type: 'ai',
  label: 'AI',
  defaultValue: () => ({
    type: 'ai',
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
  showMiniTimeline() {
    return false;
  },
  frameFields() {
    return [];
  },
  renderOptions() {},
  runtime: {
    appliesTo: 'ai',
  },
};
