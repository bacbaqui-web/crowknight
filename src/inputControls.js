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

export function bindCollapsibleSections() {
  document.querySelectorAll('[data-collapsible]').forEach((section) => {
    const button = section.querySelector('.section-toggle');
    button.addEventListener('click', () => {
      const isOpen = section.classList.toggle('is-open');
      section.dispatchEvent(new CustomEvent('sectiontoggle', { detail: { isOpen } }));
    });
  });
}
