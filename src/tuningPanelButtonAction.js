export async function runPanelButtonAction(button, label, action) {
  if (!button || !action || button.disabled) return;

  button.disabled = true;
  button.classList.add('is-working');
  button.classList.remove('is-success', 'is-error');
  button.setAttribute('aria-label', `${label} 처리중`);

  let ok;
  try {
    ok = await action();
  } catch {
    ok = false;
  }

  button.classList.remove('is-working');
  button.classList.toggle('is-success', Boolean(ok));
  button.classList.toggle('is-error', !ok);
  button.setAttribute('aria-label', `${label} ${ok ? '완료' : '실패'}`);

  window.setTimeout(() => {
    button.classList.remove('is-success', 'is-error');
    button.setAttribute('aria-label', label);
    button.disabled = false;
  }, 1200);
}
