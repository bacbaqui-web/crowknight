const FEEDBACK_HIDE_DELAY = 1800;

let feedbackElement = null;
let feedbackTimer = null;

export function showPanelActionFeedback(label, status) {
  const element = getFeedbackElement();
  const message = actionFeedbackMessage(label, status);
  element.textContent = message;
  element.classList.remove('is-working', 'is-success', 'is-error');
  element.classList.add('is-visible', `is-${status}`);

  window.clearTimeout(feedbackTimer);
  if (status === 'working') return;

  feedbackTimer = window.setTimeout(() => {
    element.classList.remove('is-visible', 'is-success', 'is-error');
  }, FEEDBACK_HIDE_DELAY);
}

function getFeedbackElement() {
  if (feedbackElement?.isConnected) return feedbackElement;

  feedbackElement = document.createElement('div');
  feedbackElement.className = 'panel-action-feedback';
  feedbackElement.setAttribute('role', 'status');
  feedbackElement.setAttribute('aria-live', 'polite');
  document.body.append(feedbackElement);
  return feedbackElement;
}

function actionFeedbackMessage(label, status) {
  if (status === 'working') return `${label} 중`;
  if (status === 'success') return `${label} 성공`;
  return `${label} 실패`;
}
