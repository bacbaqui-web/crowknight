import { renderLayerSelectOptions } from './tuningPanelDom.js';

export function renderTuningLayerOrder(layerOrder, actor, selectedValue = layerOrder.value) {
  renderLayerSelectOptions(layerOrder, actor.tuning.layerOrder, selectedValue);
}

export function moveSelectedTuningLayer({
  layerOrder,
  actor,
  direction,
  pushUndoSnapshot,
  applyActorTuning,
  saveState,
}) {
  const order = actor.tuning.layerOrder;
  const currentIndex = order.indexOf(layerOrder.value);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return;

  pushUndoSnapshot();
  [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];
  applyActorTuning(actor);
  saveState();
  renderTuningLayerOrder(layerOrder, actor, order[nextIndex]);
}
