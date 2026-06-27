import { getTuningPanelElements, syncPanelToggleState } from './tuningPanelDom.js';

export function createTuningPanelBootstrap({ selector = '#tuningPanel' } = {}) {
  const panel = document.querySelector(selector);
  if (!panel) return null;

  const elements = getTuningPanelElements(panel);
  const syncPanelToggle = () => syncPanelToggleState(panel, elements.openButton);

  return {
    elements,
    panel,
    syncPanelToggle,
  };
}
