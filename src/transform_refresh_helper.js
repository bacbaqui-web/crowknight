export function createCanvasEditRefresh({
  getSelectedActor,
  applySelected,
  saveState,
  renderEffectFields,
  syncEffectPreview,
  renderPartFields,
  renderPosePartFields,
}) {
  const renderEffect = () => {
    renderEffectFields();
    syncEffectPreview();
  };
  const renderPartAndPose = () => {
    renderPartFields();
    renderPosePartFields();
  };

  function renderContext(context) {
    if (context === 'effect') {
      renderEffect();
      return;
    }
    renderPartAndPose();
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
      renderPosePartFields();
    },
    renderDragMove(drag, shouldApplyImmediately) {
      if (drag.context === 'effect') {
        renderEffect();
        return;
      }
      if (shouldApplyImmediately) renderPartAndPose();
    },
    renderGroupPoseFields() {
      renderPosePartFields();
    },
  };
}
