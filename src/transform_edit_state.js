import { pickDragValues, pickVisualValues } from './canvas_drag_state.js';
import { defaultEffectSize } from './animation_frame_data.js';
import { EDIT_CONTEXT_ACTION, EDIT_CONTEXT_EFFECT } from './edit_target_helper.js';
import { isMasterPart } from './editor_label_helper.js';
import { partEditSources } from './part_source_data.js';

export function masterPartCanvasBase() {
  return { x: 0, y: 0, w: 1, h: 1, rot: 0, opacity: 1, anchorX: 0, anchorY: 0 };
}

export function canvasPartEditState({ part, context, tuning, actionValue }) {
  const base = isMasterPart(part) ? masterPartCanvasBase() : partEditSources(tuning)[part];
  return {
    context,
    part,
    base,
    target: context === EDIT_CONTEXT_ACTION ? actionValue : base,
  };
}

export function canvasEffectEditState({ effectKey, target, writeValue }) {
  const size = defaultEffectSize(effectKey);
  return {
    context: 'effect',
    part: 'effect',
    base: {
      baseW: size.w,
      baseH: size.h,
    },
    target,
    writeValue,
  };
}

export function canvasGroupDragItems(parts, { editStateForPart, editHandles }) {
  return parts
    .map((part) => {
      const editState = editStateForPart(part);
      const handle = editHandles?.[part];
      if (!handle) return null;
      return {
        part,
        target: editState.target,
        base: editState.base,
        handle,
        startAnchor: { ...handle.anchor },
        startValues: pickDragValues(editState),
        startVisual: pickVisualValues(editState),
      };
    })
    .filter(Boolean);
}

export function refreshCanvasDragTargets(drag, { editStateForPart, effectEditState }) {
  if (!drag) return;
  if (drag.group) {
    drag.parts.forEach((item) => {
      const editState = editStateForPart(item.part, drag.context);
      item.target = editState.target;
      item.base = editState.base;
    });
    return;
  }
  if (drag.context === EDIT_CONTEXT_EFFECT) {
    const editState = effectEditState?.();
    drag.target = editState?.target;
    drag.base = editState?.base;
    drag.writeValue = editState?.writeValue;
    return;
  }
  const editState = editStateForPart(drag.part, drag.context);
  drag.target = editState.target;
  drag.base = editState.base;
}
