import { normalizeTuningPanelWorkflowSession, syncTuningPanelWorkflowSession } from './editor_workflow_data.js';
import { createTuningPanelWorkflowNavigation } from './editor_workflow_navigation.js';

export function createTuningPanelWorkflowController({
  panel,
  getActiveSession,
  setActiveSession,
  enterSession = () => {},
  exitSession = () => {},
  syncAllPanels = () => {},
  syncSessionPanels = () => {},
}) {
  let enteredSession = null;
  const navigation = createTuningPanelWorkflowNavigation({
    panel,
    getActiveSession,
    onSessionChange: changeSession,
  });

  function syncAll() {
    const activeSession = normalizeTuningPanelWorkflowSession(getActiveSession());
    setActiveSession(activeSession);
    syncWorkflowSurface(activeSession);
    enterSessionOnce(activeSession, null);
    syncAllPanels(activeSession);
  }

  function changeSession(session) {
    const previousSession = normalizeTuningPanelWorkflowSession(getActiveSession());
    const activeSession = normalizeTuningPanelWorkflowSession(session);

    if (activeSession !== previousSession) {
      exitSession(previousSession, activeSession);
      setActiveSession(activeSession);
      syncWorkflowSurface(activeSession);
      enterSessionOnce(activeSession, previousSession);
    } else {
      syncWorkflowSurface(activeSession);
    }

    syncSessionPanels(activeSession);
  }

  function syncWorkflowSurface(activeSession) {
    syncTuningPanelWorkflowSession(panel, activeSession);
    navigation.sync();
  }

  function enterSessionOnce(activeSession, previousSession) {
    if (enteredSession === activeSession) return;
    enterSession(activeSession, previousSession);
    enteredSession = activeSession;
  }

  return {
    changeSession,
    navigation,
    syncAll,
  };
}
