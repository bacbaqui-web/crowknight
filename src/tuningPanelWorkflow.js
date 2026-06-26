export const TUNING_PANEL_WORKFLOW_SECTIONS = Object.freeze({
  collision: {
    key: 'collision',
    part: 'character',
    session: 'setup',
  },
  part: {
    key: 'part',
    part: 'character',
    session: 'setup',
  },
  pose: {
    key: 'pose',
    part: 'character',
    session: 'animation',
  },
  effect: {
    key: 'effect',
    part: 'character',
    session: 'effect',
  },
  scene: {
    key: 'scene',
    part: 'stage',
    session: 'background',
  },
});

export function getTuningPanelWorkflowSections(panel) {
  return Object.fromEntries(
    Object.keys(TUNING_PANEL_WORKFLOW_SECTIONS).map((key) => [sectionElementKey(key), findWorkflowSection(panel, key)])
  );
}

function sectionElementKey(key) {
  return `${key}Section`;
}

function findWorkflowSection(panel, key) {
  return panel.querySelector(`[data-section="${key}"]`);
}
