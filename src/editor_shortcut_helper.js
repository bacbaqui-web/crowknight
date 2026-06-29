import { isSettingsPanelOpen } from './settings_panel_state.js';

export function isTextInput(target) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
}

export function handlePanelKeyboardShortcut(event, { undo, copyFrame, pasteFrame, canUseFrameShortcut }) {
  if (!(event.metaKey || event.ctrlKey) || !isSettingsPanelOpen()) {
    return false;
  }

  const frameShortcut = event.code === 'KeyC' || event.code === 'KeyV';
  if (isTextInput(event.target) && (!frameShortcut || !canUseFrameShortcut?.())) return false;

  if (event.code === 'KeyZ') {
    consumeShortcut(event);
    undo?.();
    return true;
  }

  if (event.code === 'KeyC') {
    consumeShortcut(event);
    copyFrame?.();
    return true;
  }

  if (event.code === 'KeyV') {
    consumeShortcut(event);
    pasteFrame?.();
    return true;
  }

  return false;
}

function consumeShortcut(event) {
  event.preventDefault();
  event.stopPropagation();
}
