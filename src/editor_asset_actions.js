import { defaultEffectImageKey } from './animation_frame_data.js';
import { defaultTuningFor } from './actorTuning.js';
import { createActorFromDef } from './actor_factory.js';
import {
  deleteCharacterAssetFolder,
  moveCharacterAssetFolder,
  refreshCharacterPsdAssets,
  refreshEffectAsset,
} from './asset_refresh_helper.js';
import {
  CHARACTER_TRASH_GROUP,
  characterAssetFolder,
  characterGroupLabel,
  isTrashCharacter,
  sanitizeCharacterAssetName,
  visibleCharacterGroups,
} from './character_group_data.js';
import {
  deleteCharacterPsdFileFromFirebase,
  moveCharacterPsdFileInFirebase,
  uploadEffectAssetToFirebase,
} from './firebase_asset_storage.js';
import { showPanelActionFeedback } from './panel_action_feedback.js';
import { clone } from './utils.js';

export function bindTuningPanelAssetActions({
  elements,
  actors,
  characterDefs,
  world,
  playerActor,
  effectAssets,
  effectAssetSources,
  getSelectedActor,
  setActiveActor,
  getEffectTimeline,
  pushUndoSnapshot,
  saveState,
  syncPanel,
  uploadSettings,
  downloadSettings,
}) {
  bindFirebaseButtons({ elements, uploadSettings, downloadSettings });
  bindCharacterPsdButtons({
    elements,
    actors,
    characterDefs,
    world,
    playerActor,
    getSelectedActor,
    setActiveActor,
    pushUndoSnapshot,
    saveState,
    syncPanel,
  });
  bindEffectAssetButtons({ elements, effectAssets, effectAssetSources, getEffectTimeline, saveState });
}

function bindFirebaseButtons({ elements, uploadSettings, downloadSettings }) {
  const { firebaseUpload, firebaseDownload } = elements;

  firebaseUpload?.addEventListener('click', async () => {
    await runPanelButtonAction(firebaseUpload, '메타데이터 업로드', uploadSettings);
  });
  firebaseDownload?.addEventListener('click', async () => {
    await runPanelButtonAction(firebaseDownload, '메타데이터 다운로드', downloadSettings);
  });
}

function bindCharacterPsdButtons({
  elements,
  actors,
  characterDefs,
  world,
  playerActor,
  getSelectedActor,
  setActiveActor,
  pushUndoSnapshot,
  saveState,
  syncPanel,
}) {
  const {
    characterAdd,
    characterCreatePsdFile,
    characterCreateDialog,
    characterCreateEnglishName,
    characterCreateKoreanName,
    characterCreateGroup,
    characterCreateCancel,
    characterCreateChoosePsd,
    characterDelete,
    characterTrashOpen,
    characterTrashDialog,
    characterTrashList,
    characterTrashClose,
    characterMenu,
    characterMenuToggle,
    characterPsdUpload,
    characterPsdFile,
    characterPsdRefresh,
    characterPartReset,
  } = elements;
  let pendingCharacterDraft = null;
  bindCharacterMenu({ characterMenu, characterMenuToggle });
  populateCharacterCreateGroups(characterCreateGroup);
  bindCharacterCreateDialog({
    characterAdd,
    characterCreateDialog,
    characterCreateEnglishName,
    characterCreateKoreanName,
    characterCreateGroup,
    characterCreateCancel,
    characterCreateChoosePsd,
    characterCreatePsdFile,
    characterMenu,
    characterMenuToggle,
    setPendingDraft: (draft) => {
      pendingCharacterDraft = draft;
    },
  });
  bindCharacterTrashDialog({
    characterTrashOpen,
    characterTrashDialog,
    characterTrashList,
    characterTrashClose,
    characterMenu,
    characterMenuToggle,
    characterDefs,
    saveState,
    syncPanel,
  });

  characterPsdUpload?.addEventListener('click', () => {
    if (characterPsdUpload.disabled || !characterPsdFile) return;
    closeCharacterMenu({ characterMenu, characterMenuToggle });
    characterPsdFile.value = '';
    characterPsdFile.click();
  });
  characterPsdFile?.addEventListener('change', async () => {
    const psdFile = characterPsdFile.files?.[0];
    if (!psdFile) return;
    await runPanelButtonAction(characterPsdUpload, 'PSD 업로드', () =>
      refreshSelectedCharacterPsd({
        actor: getSelectedActor(),
        psdFile,
        pushUndoSnapshot,
        saveState,
        syncPanel,
      })
    );
  });
  characterCreatePsdFile?.addEventListener('change', async () => {
    const psdFile = characterCreatePsdFile.files?.[0];
    const draft = pendingCharacterDraft;
    pendingCharacterDraft = null;
    if (!psdFile || !draft) return;
    await runPanelButtonAction(characterAdd, '새 캐릭터 추가', () =>
      createCharacterFromPsd({
        actors,
        characterDefs,
        world,
        draft,
        psdFile,
        setActiveActor,
        saveState,
        syncPanel,
      })
    );
  });
  characterDelete?.addEventListener('click', () => {
    closeCharacterMenu({ characterMenu, characterMenuToggle });
    runPanelButtonAction(characterDelete, '캐릭터 삭제', () =>
      deleteSelectedCharacter({
        actors,
        characterDefs,
        actor: getSelectedActor(),
        playerActor,
        setActiveActor,
        saveState,
        syncPanel,
      })
    );
  });
  characterPsdRefresh?.addEventListener('click', async () => {
    closeCharacterMenu({ characterMenu, characterMenuToggle });
    await runPanelButtonAction(characterPsdRefresh, 'PSD 새로고침', () =>
      refreshSelectedCharacterPsd({
        actor: getSelectedActor(),
        pushUndoSnapshot,
        saveState,
        syncPanel,
      })
    );
  });
  characterPartReset?.addEventListener('click', () => {
    closeCharacterMenu({ characterMenu, characterMenuToggle });
    if (!window.confirm('선택 캐릭터의 파츠 위치를 초기화할까요?')) return;
    const actor = getSelectedActor();
    pushUndoSnapshot();
    actor.tuning.rig = clone(defaultTuningFor(actor).rig);
    actor.player.applyTuning(actor.tuning);
    saveState();
    syncPanel();
  });
}

function bindCharacterCreateDialog({
  characterAdd,
  characterCreateDialog,
  characterCreateEnglishName,
  characterCreateKoreanName,
  characterCreateGroup,
  characterCreateCancel,
  characterCreateChoosePsd,
  characterCreatePsdFile,
  characterMenu,
  characterMenuToggle,
  setPendingDraft,
}) {
  characterAdd?.addEventListener('click', () => {
    if (characterAdd.disabled || !characterCreateDialog || !characterCreatePsdFile) return;
    closeCharacterMenu({ characterMenu, characterMenuToggle });
    characterCreateEnglishName.value = '';
    characterCreateKoreanName.value = '';
    characterCreateDialog.hidden = false;
    characterCreateEnglishName.focus();
  });
  characterCreateCancel?.addEventListener('click', () => {
    characterCreateDialog.hidden = true;
  });
  characterCreateChoosePsd?.addEventListener('click', () => {
    const englishName = sanitizeCharacterAssetName(characterCreateEnglishName.value);
    const koreanName = sanitizeCharacterDisplayName(characterCreateKoreanName.value);
    if (!englishName || !koreanName) {
      window.alert('영어명과 한글명을 모두 입력해 주세요.');
      return;
    }
    setPendingDraft({
      englishName,
      koreanName,
      group: characterCreateGroup.value,
    });
    characterCreateDialog.hidden = true;
    characterCreatePsdFile.value = '';
    characterCreatePsdFile.click();
  });
}

function bindCharacterTrashDialog({
  characterTrashOpen,
  characterTrashDialog,
  characterTrashList,
  characterTrashClose,
  characterMenu,
  characterMenuToggle,
  characterDefs,
  saveState,
  syncPanel,
}) {
  characterTrashOpen?.addEventListener('click', () => {
    closeCharacterMenu({ characterMenu, characterMenuToggle });
    openCharacterTrashDialog({ characterTrashDialog, characterTrashList, characterDefs, saveState, syncPanel });
  });
  characterTrashClose?.addEventListener('click', () => closeCharacterTrashDialog(characterTrashDialog));
}

function openCharacterTrashDialog({ characterTrashDialog, characterTrashList, characterDefs, saveState, syncPanel }) {
  if (!characterTrashDialog || !characterTrashList) return;
  renderCharacterTrashList({ characterTrashList, characterDefs, saveState, syncPanel });
  characterTrashDialog.hidden = false;
}

function closeCharacterTrashDialog(characterTrashDialog) {
  if (characterTrashDialog) characterTrashDialog.hidden = true;
}

function renderCharacterTrashList({ characterTrashList, characterDefs, saveState, syncPanel }) {
  const trashDefs = characterDefs.filter(isTrashCharacter);
  characterTrashList.innerHTML = '';
  if (!trashDefs.length) {
    const empty = document.createElement('p');
    empty.className = 'character-trash-empty';
    empty.textContent = '휴지통이 비어 있습니다.';
    characterTrashList.append(empty);
    return;
  }

  trashDefs.forEach((def) => {
    const row = document.createElement('div');
    row.className = 'character-trash-row';
    const label = document.createElement('span');
    label.textContent = `${def.name} (${def.folder})`;
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '완전삭제';
    deleteButton.addEventListener('click', async () => {
      if (!window.confirm(`"${def.name}" 캐릭터를 완전히 삭제할까요?`)) return;
      const deleted = await deleteCharacterAssetFolder(def.folder);
      if (!deleted) {
        window.alert('캐릭터 폴더 삭제에 실패했습니다.');
        return;
      }
      await deleteCharacterPsdFileFromFirebase(def);
      const index = characterDefs.findIndex((item) => item.id === def.id);
      if (index >= 0) characterDefs.splice(index, 1);
      saveState();
      syncPanel();
      renderCharacterTrashList({ characterTrashList, characterDefs, saveState, syncPanel });
    });
    row.append(label, deleteButton);
    characterTrashList.append(row);
  });
}

function populateCharacterCreateGroups(characterCreateGroup) {
  if (!characterCreateGroup) return;
  characterCreateGroup.innerHTML = '';
  visibleCharacterGroups().forEach((group) => {
    const option = document.createElement('option');
    option.value = group.key;
    option.textContent = characterGroupLabel(group.key);
    characterCreateGroup.append(option);
  });
}

function bindCharacterMenu({ characterMenu, characterMenuToggle }) {
  if (!characterMenu || !characterMenuToggle) return;

  characterMenuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const nextOpen = characterMenu.hidden;
    setCharacterMenuOpen({ characterMenu, characterMenuToggle }, nextOpen);
  });
  characterMenu.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => closeCharacterMenu({ characterMenu, characterMenuToggle }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCharacterMenu({ characterMenu, characterMenuToggle });
  });
}

function closeCharacterMenu({ characterMenu, characterMenuToggle }) {
  setCharacterMenuOpen({ characterMenu, characterMenuToggle }, false);
}

function setCharacterMenuOpen({ characterMenu, characterMenuToggle }, open) {
  if (!characterMenu || !characterMenuToggle) return;
  characterMenu.hidden = !open;
  characterMenuToggle.classList.toggle('is-active', open);
  characterMenuToggle.setAttribute('aria-expanded', String(open));
}

async function createCharacterFromPsd({
  actors,
  characterDefs,
  world,
  draft,
  psdFile,
  setActiveActor,
  saveState,
  syncPanel,
}) {
  if (!Array.isArray(actors) || !Array.isArray(characterDefs) || !world || !psdFile || !draft) return false;

  const folder = characterAssetFolder(draft.group, draft.englishName);
  if (characterDefs.some((def) => def.folder === folder)) {
    window.alert(`이미 같은 폴더가 있습니다: ${folder}`);
    return false;
  }

  const id = uniqueCharacterId([...actors, ...characterDefs]);
  const def = {
    id,
    type: 'character',
    label: draft.koreanName,
    name: draft.koreanName,
    x: nextCharacterX(actors),
    folder,
    group: draft.group,
    storageFolder: folder,
    psdFileName: `${draft.englishName}.psd`,
    tint: '#7cc3a2',
    deletable: true,
  };
  const draftActor = {
    ...def,
    assetSources: {},
    tuning: defaultTuningFor(def),
  };

  const exported = await refreshCharacterPsdAssets({ actor: draftActor, psdFile, createFolder: true });
  if (!exported) return false;

  const actor = await createActorFromDef(
    def,
    {
      name: draft.koreanName,
      tuning: draftActor.tuning,
      assets: draftActor.assetSources,
    },
    world
  );
  actors.push(actor);
  characterDefs.push({ ...def });
  setActiveActor(actor);
  saveState();
  syncPanel();
  return true;
}

async function deleteSelectedCharacter({
  actors,
  characterDefs,
  actor,
  playerActor,
  setActiveActor,
  saveState,
  syncPanel,
}) {
  if (!actor || actor.id === 'player') return false;
  if (!window.confirm(`"${actor.name}" 캐릭터를 휴지통으로 보낼까요?`)) return false;

  const index = actors.findIndex((item) => item.id === actor.id);
  if (index < 0) return false;
  const trashFolder = uniqueTrashFolder(characterDefs, actor.folder);
  const moved = await moveCharacterAssetFolder(actor.folder, trashFolder);
  if (!moved) return false;
  const movedPsdUrl = await moveCharacterPsdFileInFirebase(actor, trashFolder);
  if (movedPsdUrl) actor.assetSources = { ...(actor.assetSources || {}), psd: movedPsdUrl };

  const def = characterDefs.find((item) => item.id === actor.id);
  if (def) {
    def.folder = trashFolder;
    def.storageFolder = trashFolder;
    def.group = CHARACTER_TRASH_GROUP;
    def.deleted = true;
  }
  actors.splice(index, 1);
  setActiveActor(playerActor || actors[0]);
  saveState();
  syncPanel();
  return true;
}

async function refreshSelectedCharacterPsd({ actor, psdFile = null, pushUndoSnapshot, saveState, syncPanel }) {
  if (!actor) return false;
  pushUndoSnapshot();
  const ok = await refreshCharacterPsdAssets({ actor, psdFile });
  if (!ok) return false;

  actor.player.applyTuning(actor.tuning);
  saveState();
  syncPanel();
  return true;
}

function sanitizeCharacterDisplayName(value) {
  return String(value || '')
    .trim()
    .slice(0, 18);
}

function uniqueTrashFolder(characterDefs, currentFolder) {
  const baseName = sanitizeCharacterAssetName(
    String(currentFolder || '')
      .split('/')
      .filter(Boolean)
      .at(-1)
  );
  const used = new Set(characterDefs.map((def) => def.folder));
  let folder = `${CHARACTER_TRASH_GROUP}/${baseName}`;
  let suffix = 2;
  while (used.has(folder)) {
    folder = `${CHARACTER_TRASH_GROUP}/${baseName}_${suffix}`;
    suffix += 1;
  }
  return folder;
}

function uniqueCharacterId(actors) {
  const used = new Set(actors.map((actor) => actor.id));
  let index = actors.length + 1;
  let id = `character_${String(index).padStart(3, '0')}`;
  while (used.has(id)) {
    index += 1;
    id = `character_${String(index).padStart(3, '0')}`;
  }
  return id;
}

function nextCharacterX(actors) {
  const lastX = Math.max(...actors.map((actor) => Number(actor.x || actor.player?.x || 480)), 480);
  return lastX + 140;
}

function bindEffectAssetButtons({ elements, effectAssets, effectAssetSources, getEffectTimeline, saveState }) {
  const { effectAssetUpload, effectAssetFile, effectAssetRefresh, effectAssetReset, effectSelect } = elements;

  effectAssetUpload?.addEventListener('click', () => {
    if (effectAssetUpload.disabled || !effectAssetFile) return;
    effectAssetFile.value = '';
    effectAssetFile.click();
  });
  effectAssetFile?.addEventListener('change', async () => {
    const effectFile = effectAssetFile.files?.[0];
    if (!effectFile) return;
    await runPanelButtonAction(effectAssetUpload, '효과 업로드', async () =>
      refreshCurrentEffectAsset({
        effectAssets,
        effectAssetSources,
        effectKey: effectSelect.value,
        effectFile,
        getEffectTimeline,
        saveState,
      })
    );
  });
  effectAssetRefresh?.addEventListener('click', async () => {
    await runPanelButtonAction(effectAssetRefresh, '효과 새로고침', () =>
      refreshCurrentEffectAsset({
        effectAssets,
        effectAssetSources,
        effectKey: effectSelect.value,
        getEffectTimeline,
        saveState,
      })
    );
  });
  effectAssetReset?.addEventListener('click', () => {
    if (!window.confirm('현재 효과를 초기화할까요?')) return;
    getEffectTimeline()?.resetAnimation();
  });
}

async function refreshCurrentEffectAsset({
  effectAssets,
  effectAssetSources,
  effectKey,
  effectFile = null,
  getEffectTimeline,
  saveState,
}) {
  const ok = await refreshEffectAsset({ effectAssets, effectAssetSources, effectKey, file: effectFile });
  if (!ok) return false;
  const assetKey = defaultEffectImageKey(effectKey);
  const uploaded = assetKey === 'none' ? true : await uploadEffectAssetToFirebase(effectAssetSources, assetKey);

  const effectTimeline = getEffectTimeline();
  effectTimeline?.renderFields();
  effectTimeline?.syncPreview();
  saveState?.();
  return uploaded;
}

async function runPanelButtonAction(button, label, action) {
  if (!button || !action || button.disabled) return;

  button.disabled = true;
  button.classList.add('is-working');
  button.classList.remove('is-success', 'is-error');
  button.setAttribute('aria-label', `${label} 처리중`);
  showPanelActionFeedback(label, 'working');

  let ok;
  try {
    ok = await action();
  } catch (error) {
    window.console?.warn(`${label} failed.`, error);
    ok = false;
  }

  button.classList.remove('is-working');
  button.classList.toggle('is-success', Boolean(ok));
  button.classList.toggle('is-error', !ok);
  button.setAttribute('aria-label', `${label} ${ok ? '완료' : '실패'}`);
  showPanelActionFeedback(label, ok ? 'success' : 'error');

  window.setTimeout(() => {
    button.classList.remove('is-success', 'is-error');
    button.setAttribute('aria-label', label);
    button.disabled = false;
  }, 1200);
}
