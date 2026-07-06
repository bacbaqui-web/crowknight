export function createCanvasEditRefresh({
  getSelectedActor,
  applySelected,
  saveState,
  renderEffectFields,
  syncEffectPreview,
  renderPartFields,
  renderActionPartFields,
}) {
  const renderEffect = () => {
    renderEffectFields();
    syncEffectPreview();
  };
  const renderPartAndAction = () => {
    renderPartFields();
    renderActionPartFields();
  };

  function renderContext(context) {
    if (context === 'effect') {
      renderEffect();
      return;
    }
    renderPartAndAction();
  }

  return {
    applyImmediately() {
      const actor = getSelectedActor();
      actor.player.applyTuning(actor.tuning);
      saveState();
    },
    applyAndRenderContext(context) {
      applySelected();
      renderContext(context);
    },
    applyAndRenderGroup() {
      applySelected();
      renderActionPartFields();
    },
    renderDragMove(drag, shouldApplyImmediately) {
      if (drag.context === 'effect') {
        renderEffect();
        return;
      }
      if (shouldApplyImmediately) renderPartAndAction();
    },
    renderGroupActionFields() {
      renderActionPartFields();
    },
  };
}
