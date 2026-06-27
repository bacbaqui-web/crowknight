import { getTuningPanelElements, syncPanelToggleState } from './tuningPanelDom.js';
import { renderStageRulesPanels } from './stageRulesPanelRenderer.js';

export function createTuningPanelBootstrap({ selector = '#tuningPanel' } = {}) {
  const panel = document.querySelector(selector);
  if (!panel) return null;

  renderStageRulesPanels(panel);
  const elements = getTuningPanelElements(panel);
  const syncPanelToggle = () => syncPanelToggleState(panel, elements.openButton);

  return {
    elements,
    panel,
    syncPanelToggle,
  };
}
