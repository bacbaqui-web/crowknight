import { effectPropertyGroups } from './property_field_data.js';
import { effectFrameValueFromInput, readEffectFrameDisplayValue } from './property_value_helper.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';

export function createEffectPropertyController({
  container,
  effectKey,
  currentFrameValue,
  writeFrameValue,
  ensureOffset,
  beginUndoSnapshot,
  stopPreview,
  syncPreview,
  applySelected,
  scrubCallbacks,
}) {
  function render() {
    container.innerHTML = '';
    renderEditorDataCard(
      container,
      { title: 'Property', className: 'property-editor-card', collapsible: false },
      (body) => {
        renderScrubGroups(body, effectPropertyGroups(), readDisplayValue, updateValue, scrubCallbacks);
      }
    );
  }

  function readDisplayValue(prop) {
    return readEffectFrameDisplayValue(effectKey(), currentFrameValue(), prop);
  }

  function updateValue(prop, value) {
    beginUndoSnapshot();
    stopPreview();
    ensureOffset();
    if (!currentFrameValue()) return readDisplayValue(prop);

    writeFrameValue(prop, effectFrameValueFromInput(effectKey(), prop, value));
    syncPreview();
    applySelected();
    return readDisplayValue(prop);
  }

  return {
    render,
    readDisplayValue,
    updateValue,
  };
}
