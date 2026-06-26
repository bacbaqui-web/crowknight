import { defaultTuningFor, syncActorHealthCapacity } from './actorTuning.js';
import { bindNumberDragInput } from './tuningNumberInputs.js';
import {
  getTuningPanelElements,
  renderLayerSelectOptions,
  syncNumericFields,
  syncPanelToggleState,
} from './tuningPanelDom.js';
import {
  activeEditPartKeyForContext,
  activeEditPartKeysForContext,
  createDefaultGroupEditValues,
  resetGroupTransformValues as resetGroupTransformValueState,
} from './panelEditState.js';
import { syncActorAnchorDebugPart } from './previewState.js';
import { renderEditHandles as renderEditHandlesView } from './editHandleRenderer.js';
import {
  findTuningEditHandleAt,
  tuningEditHandleGeometry,
  tuningGroupEditHandleGeometry,
} from './tuningEditHandleGeometry.js';
import { initializeTuningPanelControls } from './tuningPanelControlSetup.js';
import { createTuningPanelUndoState } from './tuningPanelUndoState.js';
import { createEffectTimelineController } from './tuningEffectTimelineController.js';
import { createPoseTimelineController } from './tuningPoseTimelineController.js';
import { createTuningPanelCanvasController } from './tuningPanelCanvasController.js';
import { createTuningPanelPartController } from './tuningPanelPartController.js';
import { createTuningPanelLifecycleController } from './tuningPanelLifecycleController.js';
import { currentSettingsEditContext, isSettingsPanelOpen } from './settingsPanelState.js';
import { drawTuningPanelDebugBoxes } from './tuningPanelDebugView.js';
import { handlePanelKeyboardShortcut } from './tuningPanelShortcuts.js';
import { TUNING_FIELDS } from './gameConfig.js';
import { createBackgroundPanelController } from './backgroundPanelController.js';
import { refreshCharacterPsdAssets } from './characterPsdRuntime.js';
import { refreshEffectAsset } from './effectAssetRuntime.js';
import { clone } from './utils.js';

export function createTuningPanel({
  canvas,
  ctx,
  actors,
  effectAssets,
  playerActor,
  getSelectedActor,
  setSelectedActor,
  getSceneSession,
  saveState,
  uploadSettings,
  downloadSettings,
  refreshClipSettings,
}) {
  let selectedActor = getSelectedActor();

  function setActiveActor(actor) {
    selectedActor = actor;
    setSelectedActor(actor);
  }

  let editFocusPartKey = null;
  let editFocusContext = null;
  let editHandleHover = null;
  let editHandleActiveMode = null;
  let activePartKeyGlobal = null;
  let selectedPosePartKeysGlobal = new Set();
  let groupEditValues = createDefaultGroupEditValues();
  let undoTuningChangeGlobal = null;
  let poseFrameCopyGlobal = null;
  let poseFramePasteGlobal = null;
  let poseFrameSelectionActive = false;
  let frameSelectionCheckGlobal = () => poseFrameSelectionActive;
  let effectEditHandle = null;

  function activeEditPartKey() {
    return activeEditPartKeyForContext(currentOpenEditContext(), editFocusPartKey);
  }

  function activeEditPartKeys() {
    return activeEditPartKeysForContext({
      context: currentOpenEditContext(),
      editFocusContext,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      editFocusPartKey,
    });
  }

  function resetGroupEditValues() {
    groupEditValues = createDefaultGroupEditValues();
  }

  function resetGroupTransformValues() {
    resetGroupTransformValueState(groupEditValues);
  }

  function currentOpenEditContext() {
    return currentSettingsEditContext({ editFocusContext, activePartKey: activePartKeyGlobal });
  }

  function drawSettingsDebugBoxes() {
    const nextDebugState = drawTuningPanelDebugBoxes(ctx, selectedActor, effectAssets);
    if (nextDebugState.hasEffectHandleUpdate) effectEditHandle = nextDebugState.effectHandle;
  }

  function getEditHandleGeometry() {
    return tuningEditHandleGeometry({
      isPanelOpen: isSettingsPanelOpen(),
      openEditContext: currentOpenEditContext(),
      effectEditHandle,
      editFocusPartKey,
      selectedActor,
      poseFrameSelectionActive,
      editFocusContext,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      groupEditValues,
    });
  }

  function getGroupEditHandleGeometry() {
    return tuningGroupEditHandleGeometry({
      editFocusContext,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      poseFrameSelectionActive,
      selectedActor,
      groupEditValues,
    });
  }

  function getEditHandleAt(point) {
    return findTuningEditHandleAt(point, getEditHandleGeometry());
  }

  function buildTuningPanel() {
    const panel = document.querySelector('#tuningPanel');
    if (!panel) return;

    const panelElements = getTuningPanelElements(panel);
    const {
      openButton,
      actorSelect,
      actorName,
      partSection,
      poseSection,
      effectSection,
      poseSelect,
      effectSelect,
      layerOrder,
      firebaseUpload,
      firebaseDownload,
      characterPsdUpload,
      characterPsdFile,
      characterPsdRefresh,
      characterPartReset,
      effectAssetUpload,
      effectAssetFile,
      effectAssetRefresh,
      effectAssetReset,
    } = panelElements;
    let editContext = 'part';
    let activePartKey = null;
    let activePosePartKey = null;
    let poseTimeline = null;
    let partController = null;
    let backgroundController = null;
    let canvasController = null;
    let lifecycleController = null;
    const undoState = createTuningPanelUndoState({
      actors,
      getSelectedActor: () => selectedActor,
      setSelectedActor: (actor) => {
        selectedActor = actor;
      },
      getGroupEditValues: () => groupEditValues,
      setGroupEditValues: (value) => {
        groupEditValues = value;
      },
      createDefaultGroupEditValues,
      applyActorTuning: (actor) => actor.player.applyTuning(actor.tuning),
      saveState,
      syncPanel,
      syncPoseToolbarButtons: () => poseTimeline?.syncToolbarButtons(),
    });
    const { beginUndoSnapshot, commitUndoSnapshot, pushUndoSnapshot, undoTuningChange } = undoState;
    undoTuningChangeGlobal = undoTuningChange;
    poseFrameCopyGlobal = copyCurrentFrame;
    poseFramePasteGlobal = pasteCurrentFrame;

    const syncPanelToggle = () => syncPanelToggleState(panel, openButton);
    bindFirebaseButtons();
    bindCharacterPsdButtons();
    bindEffectAssetButtons();

    const fields = TUNING_FIELDS;
    const scrubCallbacks = {
      beginChange: beginUndoSnapshot,
      commitChange: commitUndoSnapshot,
    };
    const bindNumberDrag = (number, peer, updateValue) =>
      bindNumberDragInput(number, peer, updateValue, {
        beginChange: beginUndoSnapshot,
        commitChange: commitUndoSnapshot,
      });
    poseTimeline = createPoseTimelineController({
      actors,
      elements: panelElements,
      undoState,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      getSelectedActor: () => selectedActor,
      getActivePosePartKey: () => activePosePartKey,
      setFrameSelectionActive: (value) => {
        poseFrameSelectionActive = value;
      },
      setEditContext: (value) => {
        editContext = value;
      },
      resetGroupEditValues,
      renderPosePartFields: () => partController?.renderPosePartFields(),
      beginUndoSnapshot,
      commitUndoSnapshot,
      applySelected,
    });
    const effectTimeline = createEffectTimelineController({
      actors,
      effectAssets,
      elements: panelElements,
      undoState,
      scrubCallbacks,
      getSelectedActor: () => selectedActor,
      setEditContext: (value) => {
        editContext = value;
      },
      beginUndoSnapshot,
      commitUndoSnapshot,
      applySelected,
    });
    backgroundController = createBackgroundPanelController({
      elements: panelElements,
      getSceneSession,
      saveState,
      refreshClipSettings,
    });
    partController = createTuningPanelPartController({
      elements: panelElements,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      scrubCallbacks,
      getSelectedActor: () => selectedActor,
      getActivePartKey: () => activePartKey,
      setActivePartKey: (value) => {
        activePartKey = value;
      },
      setActivePartKeyGlobal: (value) => {
        activePartKeyGlobal = value;
      },
      getActivePosePartKey: () => activePosePartKey,
      setActivePosePartKey: (value) => {
        activePosePartKey = value;
      },
      getEditFocusPartKey: () => editFocusPartKey,
      setEditContext: (value) => {
        editContext = value;
      },
      getEditFocusContext: () => editFocusContext,
      setEditFocusContext: (value) => {
        editFocusContext = value;
      },
      setEditFocusPartKey: (value) => {
        editFocusPartKey = value;
      },
      getGroupEditValues: () => groupEditValues,
      resetGroupEditValues,
      clearEditHandleState,
      syncAnchorDebugPart,
      poseTimeline,
      effectTimeline,
      getCanvasController: () => canvasController,
      beginUndoSnapshot,
      applySelected,
    });
    canvasController = createTuningPanelCanvasController({
      canvas,
      panel,
      sections: {
        part: partSection,
        pose: poseSection,
        effect: effectSection,
      },
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      getSelectedActor: () => selectedActor,
      getEditFocusPartKey: () => editFocusPartKey,
      setEditFocusPartKey: (value) => {
        editFocusPartKey = value;
      },
      getEditFocusContext: () => editFocusContext,
      getEditContext: () => editContext,
      setEditContext: (value) => {
        editContext = value;
      },
      getActivePartKey: () => activePartKeyGlobal,
      getGroupEditValues: () => groupEditValues,
      getEditHandleAt,
      getGroupEditHandleGeometry,
      setEditHandleHover: (value) => {
        editHandleHover = value;
      },
      setEditHandleActiveMode: (value) => {
        editHandleActiveMode = value;
      },
      resetGroupTransformValues,
      poseTimeline,
      effectTimeline,
      getPoseKey: () => poseSelect.value,
      getEffectKey: () => effectSelect.value,
      applySelected,
      saveState,
      renderPartFields: partController.renderPartFields,
      renderPosePartFields: partController.renderPosePartFields,
      pushUndoSnapshot,
      beginUndoSnapshot,
      commitUndoSnapshot,
    });
    lifecycleController = createTuningPanelLifecycleController({
      elements: panelElements,
      actors,
      playerActor,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      getSelectedActor: () => selectedActor,
      setActiveActor,
      setActivePartKey: (value) => {
        activePartKey = value;
      },
      setActivePartKeyGlobal: (value) => {
        activePartKeyGlobal = value;
      },
      setActivePosePartKey: (value) => {
        activePosePartKey = value;
      },
      setEditContext: (value) => {
        editContext = value;
      },
      setEditFocusPartKey: (value) => {
        editFocusPartKey = value;
      },
      setEditFocusContext: (value) => {
        editFocusContext = value;
      },
      resetGroupEditValues,
      clearEditHandleState,
      poseTimeline,
      effectTimeline,
      partController,
      syncPanel,
      syncPanelToggle,
      pushUndoSnapshot,
      saveState,
    });

    initializeTuningPanelControls({
      panel,
      canvas,
      actors,
      rig: selectedActor.tuning.rig,
      fields,
      elements: panelElements,
      bindNumberDrag,
      callbacks: {
        beginUndoSnapshot,
        getTuning: () => selectedActor.tuning,
        applySelected,
        handleActorChange: lifecycleController.handleActorChange,
        handleActorNameInput: lifecycleController.handleActorNameInput,
        handlePartChange: partController.handlePartChange,
        handlePoseChange: partController.handlePoseChange,
        handleEffectChange: lifecycleController.handleEffectChange,
        handlePosePartChange: partController.handlePosePartChange,
        selectPickerPart: partController.selectPickerPart,
        openPartSection: partController.openPartSection,
        closePartSection: () => partController.clearPartSelection('part'),
        openPoseSection: partController.openPoseSection,
        closePoseSection: () => partController.clearPartSelection('pose'),
        openEffectSection: () => {
          partController.closeEditSection('part');
          partController.closeEditSection('pose');
          editContext = 'effect';
          editFocusContext = null;
          editFocusPartKey = null;
          effectTimeline.ensureActiveFrame();
          effectTimeline.renderFields();
          effectTimeline.syncPreview();
        },
        clearEffectSelection: effectTimeline.clearSelection,
        updatePoseSetting: poseTimeline.updateSetting,
        commitUndoSnapshot,
        updatePosePlaybackRate: poseTimeline.updatePlaybackRate,
        stepPoseDuration: poseTimeline.stepDuration,
        togglePosePlayback: poseTimeline.togglePlayback,
        togglePosePlaybackMode: poseTimeline.togglePlaybackMode,
        copyActivePoseFrame: poseTimeline.copyFrame,
        pasteActivePoseFrame: poseTimeline.pasteFrame,
        undoTuningChange,
        addPoseKeyframe: poseTimeline.addKeyframe,
        deletePoseKeyframe: poseTimeline.deleteKeyframe,
        resetCurrentPoseAnimation: poseTimeline.resetAnimation,
        updateEffectSetting: effectTimeline.updateSetting,
        updateEffectPlaybackRate: effectTimeline.updatePlaybackRate,
        stepEffectDuration: effectTimeline.stepDuration,
        toggleEffectPlayback: effectTimeline.togglePlayback,
        toggleEffectPlaybackMode: effectTimeline.togglePlaybackMode,
        copyActiveEffectFrame: effectTimeline.copyFrame,
        pasteActiveEffectFrame: effectTimeline.pasteFrame,
        addEffectKeyframe: effectTimeline.addKeyframe,
        deleteEffectKeyframe: effectTimeline.deleteKeyframe,
        resetCurrentEffectAnimation: effectTimeline.resetAnimation,
        moveSelectedLayer,
        openPanel: lifecycleController.openPanel,
        closePanel: lifecycleController.closePanel,
        copyCurrentFrame,
        pasteCurrentFrame,
        hasFrameSelection: hasCurrentFrameSelection,
        resetSelectedActorTuning: lifecycleController.resetSelectedActorTuning,
        onCanvasPointerDown: canvasController.onPointerDown,
        onCanvasPointerMove: canvasController.onPointerMove,
        endCanvasDrag: canvasController.endDrag,
      },
    });

    function clearEditHandleState() {
      editHandleHover = null;
      editHandleActiveMode = null;
      canvas.style.cursor = '';
    }

    function syncAnchorDebugPart() {
      syncActorAnchorDebugPart(actors, selectedActor, selectedPosePartKeysGlobal.size > 1 ? null : editFocusPartKey);
    }

    function activeTimelineController() {
      return currentOpenEditContext() === 'effect' ? effectTimeline : poseTimeline;
    }

    function copyCurrentFrame() {
      activeTimelineController().copyFrame();
    }

    function pasteCurrentFrame() {
      activeTimelineController().pasteFrame();
    }

    function hasCurrentFrameSelection() {
      return Boolean(activeTimelineController().hasFrameSelection?.());
    }
    frameSelectionCheckGlobal = hasCurrentFrameSelection;

    function renderLayerOrder(selectedValue = layerOrder.value) {
      renderLayerSelectOptions(layerOrder, selectedActor.tuning.layerOrder, selectedValue);
    }

    function moveSelectedLayer(direction) {
      const order = selectedActor.tuning.layerOrder;
      const currentIndex = order.indexOf(layerOrder.value);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return;

      pushUndoSnapshot();
      [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];
      selectedActor.player.applyTuning(selectedActor.tuning);
      saveState();
      renderLayerOrder(order[nextIndex]);
    }

    function applySelected() {
      syncActorHealthCapacity(
        selectedActor,
        Number(selectedActor.maxHpPips) !== Number(selectedActor.tuning.maxHpPips)
      );
      selectedActor.player.applyTuning(selectedActor.tuning);
      saveState();
    }

    function syncPanel() {
      actorSelect.value = selectedActor.id;
      actorName.value = selectedActor.name;
      lifecycleController.syncActorOptions();

      syncNumericFields(fields, selectedActor.tuning);

      partController.renderPartFields();
      partController.renderPosePartFields();
      effectTimeline.renderFields();
      backgroundController.sync();
      partController.syncMotionRows();
      partController.syncPartPickers();
      syncAnchorDebugPart();
      poseTimeline.syncPreview();
      effectTimeline.syncPreview();
      renderLayerOrder();
    }

    function bindFirebaseButtons() {
      firebaseUpload?.addEventListener('click', async () => {
        await runPanelButtonAction(firebaseUpload, '업로드', uploadSettings);
      });
      firebaseDownload?.addEventListener('click', async () => {
        await runPanelButtonAction(firebaseDownload, '다운로드', downloadSettings);
      });
    }

    function bindCharacterPsdButtons() {
      characterPsdUpload?.addEventListener('click', () => {
        if (characterPsdUpload.disabled) return;
        characterPsdFile.value = '';
        characterPsdFile.click();
      });
      characterPsdFile?.addEventListener('change', async () => {
        const psdFile = characterPsdFile.files?.[0];
        if (!psdFile) return;
        await runPanelButtonAction(characterPsdUpload, 'PSD 업로드', async () => {
          const ok = await refreshCharacterPsdAssets({ actor: selectedActor, psdFile });
          if (ok) selectedActor.player.applyTuning(selectedActor.tuning);
          return ok;
        });
      });
      characterPsdRefresh?.addEventListener('click', async () => {
        await runPanelButtonAction(characterPsdRefresh, 'PSD 새로고침', async () => {
          const ok = await refreshCharacterPsdAssets({ actor: selectedActor });
          if (ok) selectedActor.player.applyTuning(selectedActor.tuning);
          return ok;
        });
      });
      characterPartReset?.addEventListener('click', () => {
        if (!window.confirm('선택 캐릭터의 파츠 위치를 초기화할까요?')) return;
        pushUndoSnapshot();
        selectedActor.tuning.rig = clone(defaultTuningFor(selectedActor).rig);
        selectedActor.player.applyTuning(selectedActor.tuning);
        saveState();
        syncPanel();
      });
    }

    function bindEffectAssetButtons() {
      effectAssetUpload?.addEventListener('click', () => {
        if (effectAssetUpload.disabled) return;
        effectAssetFile.value = '';
        effectAssetFile.click();
      });
      effectAssetFile?.addEventListener('change', async () => {
        const effectFile = effectAssetFile.files?.[0];
        if (!effectFile) return;
        await runPanelButtonAction(effectAssetUpload, '효과 업로드', async () => refreshCurrentEffectAsset(effectFile));
      });
      effectAssetRefresh?.addEventListener('click', async () => {
        await runPanelButtonAction(effectAssetRefresh, '효과 새로고침', () => refreshCurrentEffectAsset());
      });
      effectAssetReset?.addEventListener('click', () => {
        if (!window.confirm('현재 효과를 초기화할까요?')) return;
        effectTimeline.resetAnimation();
      });
    }

    async function refreshCurrentEffectAsset(file = null) {
      const ok = await refreshEffectAsset({ effectAssets, effectKey: effectSelect.value, file });
      if (!ok) return false;

      effectTimeline.renderFields();
      effectTimeline.syncPreview();
      return true;
    }

    async function runPanelButtonAction(button, label, action) {
      if (!button || !action || button.disabled) return;
      button.disabled = true;
      button.classList.add('is-working');
      button.classList.remove('is-success', 'is-error');
      button.setAttribute('aria-label', `${label} 처리중`);
      let ok;
      try {
        ok = await action();
      } catch {
        ok = false;
      }
      button.classList.remove('is-working');
      button.classList.toggle('is-success', Boolean(ok));
      button.classList.toggle('is-error', !ok);
      button.setAttribute('aria-label', `${label} ${ok ? '완료' : '실패'}`);
      window.setTimeout(() => {
        button.classList.remove('is-success', 'is-error');
        button.setAttribute('aria-label', label);
        button.disabled = false;
      }, 1200);
    }

    syncPanel();
    syncPanelToggle();
  }

  function handleKeyboardShortcut(event) {
    return handlePanelKeyboardShortcut(event, {
      undo: undoTuningChangeGlobal,
      copyFrame: poseFrameCopyGlobal,
      pasteFrame: poseFramePasteGlobal,
      canUseFrameShortcut: () => frameSelectionCheckGlobal(),
    });
  }

  function renderPanelEditHandles() {
    renderEditHandlesView(ctx, getEditHandleGeometry(), editHandleActiveMode || editHandleHover);
  }

  buildTuningPanel();

  return {
    activeEditPartKey,
    activeEditPartKeys,
    drawSettingsDebugBoxes,
    handleKeyboardShortcut,
    renderEditHandles: renderPanelEditHandles,
  };
}
