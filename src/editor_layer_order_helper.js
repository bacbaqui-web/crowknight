import { renderLayerSelectOptions } from './editor_panel_dom_helper.js';

export function renderTuningLayerOrder(layerOrder, actor, selectedValue = layerOrder.value) {
  renderLayerSelectOptions(layerOrder, actor.tuning.layerOrder, selectedValue);
}

export function reorderTuningLayer({
  layerOrder,
  actor,
  sourceLayer,
  targetLayer,
  placement = 'before',
  pushUndoSnapshot,
  applyActorTuning,
  saveState,
}) {
  const order = actor.tuning.layerOrder;
  if (!sourceLayer || !targetLayer || sourceLayer === targetLayer) return;
  if (!order.includes(sourceLayer) || !order.includes(targetLayer)) return;

  const visualOrder = [...order].reverse();
  const currentIndex = visualOrder.indexOf(sourceLayer);
  const targetIndex = visualOrder.indexOf(targetLayer);
  if (currentIndex < 0 || targetIndex < 0) return;

  pushUndoSnapshot();
  visualOrder.splice(currentIndex, 1);
  const adjustedTargetIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertionIndex = placement === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  visualOrder.splice(insertionIndex, 0, sourceLayer);
  actor.tuning.layerOrder.splice(0, order.length, ...visualOrder.reverse());
  applyActorTuning(actor);
  saveState();
  renderTuningLayerOrder(layerOrder, actor, sourceLayer);
}
