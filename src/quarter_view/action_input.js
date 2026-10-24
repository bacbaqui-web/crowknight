const BUFFER_SECONDS = 0.15;
const ACTION_KEYS = new Set(['KeyQ', 'KeyW', 'KeyE', 'Space']);
const MODIFIERS = ['ArrowUp', 'ArrowDown'];

export function prepareActionInput(actor, input, direction) {
  input.pressed.fresh = new Set(input.pressed);
  const pending = (actor.quarterPendingInputs ||= new Map());
  const now = actor.player.animTime || 0;
  for (const code of input.pressed) {
    if (!ACTION_KEYS.has(code)) continue;
    pending.set(code, {
      until: now + BUFFER_SECONDS,
      direction: direction && { ...direction },
      modifiers: MODIFIERS.filter((key) => input.keys.has(key)),
    });
  }
  for (const [code, intent] of pending) {
    if (now > intent.until) {
      pending.delete(code);
      continue;
    }
    input.pressed.add(code);
    intent.modifiers.forEach((key) => input.keys.add(key));
  }
  if ([...input.pressed].some((code) => ACTION_KEYS.has(code))) {
    // Keep held arrows for combos, but do not let a walk edge win over an action edge.
    input.pressed.delete('ArrowLeft');
    input.pressed.delete('ArrowRight');
  }
}

export function finishActionInput(actor, previousSerial) {
  if (actor.player.attackSerial === previousSerial) return null;
  const pending = actor.quarterPendingInputs;
  let intent = null;
  for (const code of actor.player.actionTriggerRuntime?.consumedCodes || []) {
    intent ||= pending?.get(code);
    pending?.delete(code);
  }
  return intent;
}
