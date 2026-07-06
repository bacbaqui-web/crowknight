import { getTuningPanelElements, syncPanelToggleState } from './editor_panel_dom_helper.js';
import { renderStageRulesPanels } from './stage_rules_panel_renderer.js';

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
