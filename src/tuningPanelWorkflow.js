export const TUNING_PANEL_WORKFLOW_SESSIONS = Object.freeze(['setup', 'animation', 'effect', 'stage']);
export const DEFAULT_TUNING_PANEL_WORKFLOW_SESSION = 'setup';
export const TUNING_PANEL_WORKFLOW_SESSION_LABELS = Object.freeze({
  setup: 'Setup',
  animation: 'Animation',
  effect: 'Effect',
  stage: 'Stage',
});

export const TUNING_PANEL_WORKFLOW_FILTER_MODES = Object.freeze({
  metadata: 'metadata',
  hidden: 'hidden',
  disabled: 'disabled',
});

export const DEFAULT_TUNING_PANEL_WORKFLOW_FILTER_MODE = TUNING_PANEL_WORKFLOW_FILTER_MODES.hidden;

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
    session: 'stage',
  },
  progression: {
    key: 'progression',
    part: 'stage',
    session: 'stage',
  },
  enemy: {
    key: 'enemy',
    part: 'stage',
    session: 'stage',
  },
  reward: {
    key: 'reward',
    part: 'stage',
    session: 'stage',
  },
  score: {
    key: 'score',
    part: 'stage',
    session: 'stage',
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

export function syncTuningPanelWorkflowSession(
  panel,
  activeSession,
  { filterMode = DEFAULT_TUNING_PANEL_WORKFLOW_FILTER_MODE } = {}
) {
  const session = normalizeTuningPanelWorkflowSession(activeSession);
  panel.dataset.workflowActiveSession = session;

  Object.values(TUNING_PANEL_WORKFLOW_SECTIONS).forEach(({ key }) => {
    const section = findWorkflowSection(panel, key);
    if (!section) return;

    const isActive = section.dataset.workflowSession === session;
    section.dataset.workflowSessionActive = String(isActive);
    section.dataset.workflowSessionVisible = String(isActive);
    applyTuningPanelWorkflowFilterMode(section, isActive, filterMode);
  });
}

export function workflowSectionsForSession(session) {
  const normalizedSession = normalizeTuningPanelWorkflowSession(session);
  return Object.values(TUNING_PANEL_WORKFLOW_SECTIONS).filter((section) => section.session === normalizedSession);
}

export function isTuningPanelWorkflowSession(session) {
  return TUNING_PANEL_WORKFLOW_SESSIONS.includes(session);
}

export function normalizeTuningPanelWorkflowSession(session) {
  return isTuningPanelWorkflowSession(session) ? session : DEFAULT_TUNING_PANEL_WORKFLOW_SESSION;
}

function applyTuningPanelWorkflowFilterMode(section, isActive, filterMode) {
  section.hidden = filterMode === TUNING_PANEL_WORKFLOW_FILTER_MODES.hidden && !isActive;
  section.toggleAttribute('inert', filterMode === TUNING_PANEL_WORKFLOW_FILTER_MODES.disabled && !isActive);
  section.setAttribute(
    'aria-disabled',
    String(filterMode === TUNING_PANEL_WORKFLOW_FILTER_MODES.disabled && !isActive)
  );
}

function sectionElementKey(key) {
  return `${key}Section`;
}

function findWorkflowSection(panel, key) {
  return panel.querySelector(`[data-section="${key}"]`);
}
