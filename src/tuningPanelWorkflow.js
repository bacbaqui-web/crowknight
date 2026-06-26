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
  layer: {
    key: 'layer',
    part: 'character',
    session: 'setup',
  },
});

export function getTuningPanelWorkflowSections(panel) {
  applyTuningPanelWorkflowMetadata(panel);

  return Object.fromEntries(
    Object.keys(TUNING_PANEL_WORKFLOW_SECTIONS).map((key) => [sectionElementKey(key), findWorkflowSection(panel, key)])
  );
}

export function applyTuningPanelWorkflowMetadata(panel) {
  Object.values(TUNING_PANEL_WORKFLOW_SECTIONS).forEach(({ key, part, session }) => {
    const section = findWorkflowSection(panel, key);
    if (!section) return;

    section.dataset.workflowPart = part;
    section.dataset.workflowSession = session;
  });
}

function sectionElementKey(key) {
  return `${key}Section`;
}

function findWorkflowSection(panel, key) {
  return panel.querySelector(`[data-section="${key}"]`);
}
