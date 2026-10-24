import { GAME_KEYS } from './game_config_data.js';
import { isTextInput } from './editor_shortcut_helper.js';

export function bindKeyboardControls({
  keys,
  pressed,
  handleShortcut,
  mapCode = (code) => code,
  gameKeys = GAME_KEYS,
}) {
  const releaseKeys = () => {
    keys.clear();
    pressed.clear();
  };
  addEventListener('blur', releaseKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseKeys();
  });
  addEventListener(
    'keydown',
    (event) => {
      const shortcutHandled = handleShortcut(event);
      if (event.metaKey || event.ctrlKey) {
        releaseKeys();
        return;
      }
      if (shortcutHandled) return;
      const code = mapCode(event.code);
      if (!gameKeys.has(code)) return;
      if (isTextInput(event.target) && !isSettingsPanelTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
      if (event.code === 'ShiftRight') {
        if (!keys.has('ShiftLeft')) pressed.add('ShiftLeft');
        keys.add('ShiftLeft');
      }
    },
    true
  );

  addEventListener(
    'keyup',
    (event) => {
      const code = mapCode(event.code);
      if (!gameKeys.has(code)) return;
      // Release the held state even if focus or modifier keys changed since keydown.
      keys.delete(code);
      if (event.code === 'ShiftRight' || event.code === 'ShiftLeft') {
        if (event.shiftKey) keys.add('ShiftLeft');
        else keys.delete('ShiftLeft');
      }
      if (event.metaKey || event.ctrlKey) return;
      if (isTextInput(event.target) && !isSettingsPanelTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );
}

export function bindTouchControls(keys, pressed) {
  document.querySelectorAll('[data-hold-code]').forEach((button) => {
    const code = button.dataset.holdCode;
    const release = () => {
      keys.delete(code);
      button.classList.remove('is-pressed');
    };

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
      button.classList.add('is-pressed');
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  document.querySelectorAll('[data-tap-code]').forEach((button) => {
    const code = button.dataset.tapCode;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pressed.add(code);
      button.classList.add('is-pressed');
      setTimeout(() => button.classList.remove('is-pressed'), 120);
    });
  });
}

function isSettingsPanelTarget(target) {
  return Boolean(target?.closest?.('#tuningPanel'));
}

export function bindBattleControls({ startBattleButton, homeStartButton, endBattleButton }, actions) {
  startBattleButton?.addEventListener('click', actions.startRun);
  homeStartButton?.addEventListener('click', actions.startRun);

  endBattleButton?.addEventListener('click', () => {
    actions.endRun();
    endBattleButton.blur();
  });
}

export function bindCollapsibleSections() {
  document.querySelectorAll('[data-collapsible]').forEach((section) => {
    if (section.dataset.collapsibleBound === 'true') return;
    const button = section.querySelector('.section-toggle');
    if (!button) return;
    section.dataset.collapsibleBound = 'true';
    button.addEventListener('click', () => {
      const isOpen = section.classList.toggle('is-open');
      section.dispatchEvent(new CustomEvent('sectiontoggle', { detail: { isOpen } }));
    });
  });
}

export function bindChoiceNumberKeys({ modal, cards, target = window }) {
  target.addEventListener(
    'keydown',
    (event) => {
      if (modal.hidden || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const match = /^(?:Digit|Numpad)([1-4])$/.exec(event.code);
      const number = match ? Number(match[1]) : Number(event.key);
      if (!Number.isInteger(number) || number < 1 || number > 4) return;
      const button = cards.querySelectorAll('button')[number - 1];
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) button?.click();
    },
    true
  );
}
