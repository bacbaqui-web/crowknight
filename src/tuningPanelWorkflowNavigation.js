import { TUNING_PANEL_WORKFLOW_SESSION_LABELS, TUNING_PANEL_WORKFLOW_SESSIONS } from './tuningPanelWorkflow.js';

export function createTuningPanelWorkflowNavigation({ panel, getActiveSession, onSessionChange }) {
  panel.querySelector('[data-workflow-navigation]')?.remove();

  const nav = document.createElement('nav');
  nav.className = 'workflow-session-nav';
  nav.dataset.workflowNavigation = 'true';
  nav.setAttribute('aria-label', '제작 세션');
  nav.setAttribute('role', 'tablist');

  const buttons = TUNING_PANEL_WORKFLOW_SESSIONS.map((session) => {
    const label = TUNING_PANEL_WORKFLOW_SESSION_LABELS[session] || session;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.workflowSessionTab = session;
    button.textContent = label;
    button.setAttribute('aria-label', `${label} 세션으로 이동`);
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => onSessionChange(session));
    nav.append(button);
    return button;
  });

  nav.addEventListener('keydown', (event) => {
    const activeIndex = buttons.indexOf(document.activeElement);
    if (activeIndex < 0) return;

    const nextIndex = workflowSessionKeyTargetIndex(event.key, activeIndex, buttons.length);
    if (nextIndex === activeIndex) return;

    event.preventDefault();
    buttons[nextIndex].focus();
    buttons[nextIndex].click();
  });

  panel.querySelector('.panel-header')?.after(nav);

  function sync() {
    const activeSession = getActiveSession();
    nav.dataset.workflowActiveSession = activeSession;
    buttons.forEach((button) => {
      const isActive = button.dataset.workflowSessionTab === activeSession;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('aria-current', isActive ? 'step' : 'false');
      button.tabIndex = isActive ? 0 : -1;
    });
  }

  sync();

  return {
    element: nav,
    sync,
  };
}

function workflowSessionKeyTargetIndex(key, activeIndex, sessionCount) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (activeIndex + 1) % sessionCount;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (activeIndex - 1 + sessionCount) % sessionCount;
  if (key === 'Home') return 0;
  if (key === 'End') return sessionCount - 1;
  return activeIndex;
}
