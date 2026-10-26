export function prepareBossTuning(id, tuning) {
  if (!['powder_chief', 'fire_mage', 'ram_tank'].includes(id)) return;
  tuning.transform.scale *= 0.8;
  if (id !== 'powder_chief') return;
  tuning.customActions.push({
    key: 'powderPunch',
    name: '근접 주먹질',
    trigger: { type: 'single', keys: [], triggerMode: 'tap' },
  });
  tuning.actionSettings.powderPunch = {
    ...globalThis.structuredClone(tuning.actionSettings.powderThrow),
    duration: 0.8,
    ai: { enabled: false },
    formulas: [],
  };
  tuning.actionOffsets.powderPunch = {
    weapon: { opacity: 0 },
    shoulderR: {
      keyframes: [
        { t: 0, rot: -25 },
        { t: 0.25, rot: 10 },
        { t: 0.4, rot: -85 },
        { t: 0.65, rot: -85 },
        { t: 1, rot: -25 },
      ],
    },
    master: {
      keyframes: [
        { t: 0, x: 0 },
        { t: 0.4, x: 12 },
        { t: 1, x: 0 },
      ],
    },
  };
}
