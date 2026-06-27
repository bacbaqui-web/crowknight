import { DEFAULT_TUNING_PANEL_WORKFLOW_SESSION, normalizeTuningPanelWorkflowSession } from './tuningPanelWorkflow.js';

export function createTuningPanelWorkflowSessionState({ initialSession = DEFAULT_TUNING_PANEL_WORKFLOW_SESSION } = {}) {
  let activeSession = normalizeTuningPanelWorkflowSession(initialSession);

  return {
    getActiveSession: () => activeSession,
    setActiveSession: (session) => {
      activeSession = normalizeTuningPanelWorkflowSession(session);
    },
    resetActiveSession: () => {
      activeSession = DEFAULT_TUNING_PANEL_WORKFLOW_SESSION;
    },
  };
}
