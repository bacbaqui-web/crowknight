import { showPanelActionFeedback } from './panel_feedback_view.js';

export async function runPanelButtonAction(button, label, action) {
  if (!button || !action || button.disabled) return;

  button.disabled = true;
  button.classList.add('is-working');
  button.classList.remove('is-success', 'is-error');
  button.setAttribute('aria-label', `${label} 처리중`);
  showPanelActionFeedback(label, 'working');

  let ok;
  let errorMessage;
  try {
    const result = await action();
    ok = typeof result === 'object' && result !== null ? Boolean(result.ok) : Boolean(result);
    errorMessage = typeof result === 'object' && result !== null ? result.feedbackDetail || result.error || '' : '';
  } catch (error) {
    window.console?.warn(`${label} failed.`, error);
    ok = false;
    errorMessage = error?.message || String(error || '');
  }

  button.classList.remove('is-working');
  button.classList.toggle('is-success', Boolean(ok));
  button.classList.toggle('is-error', !ok);
  button.setAttribute('aria-label', `${label} ${ok ? '완료' : '실패'}`);
  showPanelActionFeedback(label, ok ? 'success' : 'error', errorMessage);

  window.setTimeout(() => {
    button.classList.remove('is-success', 'is-error');
    button.setAttribute('aria-label', label);
    button.disabled = false;
  }, 1200);
}
