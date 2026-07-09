import { defaultTuningFor } from './actor_tuning_helper.js';
import { createActorFromDef } from './actor_factory.js';
import { effectImageKeyFromFileName, validEffectImageKey } from './animation_frame_data.js';
import {
  createCharacterPsdAssets,
  copyCharacterAssetFolder,
  deleteCharacterAssetFolder,
  moveCharacterAssetFolder,
  refreshCharacterPsdAssetResult,
  refreshEffectAssetResult,
} from './asset_refresh_helper.js';
import {
  CHARACTER_TRASH_GROUP,
  characterAssetFolder,
  characterGroupLabel,
  characterPsdFileNameForGroup,
  creatableCharacterGroups,
  isPlayerCharacter,
  sanitizeCharacterAssetName,
} from './character_group_data.js';
import { showPanelActionFeedback } from './panel_feedback_view.js';
import { clone } from './common_helper.js';
import { ensureEffectOffset, ensureEffectSettings } from './project_data_normalizer_helper.js';

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
    syncRemoteState: null,
  });
  bindEffectAssetButtons({
    elements,
    effectAssets,
    effectAssetSources,
    getSelectedActor,
    getEffectTimeline,
    saveState,
  });
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
  syncRemoteState,
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
    characterMove,
    characterMoveMenu,
    characterMoveTargets,
    characterMenu,
    characterMenuToggle,
    characterPsdUpload,
    characterPsdFile,
    characterPsdRefresh,
    characterPartReset,
  } = elements;
  let pendingCharacterDraft = null;
  bindCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
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
    characterMove,
    characterMoveMenu,
    setPendingDraft: (draft) => {
      pendingCharacterDraft = draft;
    },
  });

  characterPsdUpload?.addEventListener('click', () => {
    if (characterPsdUpload.disabled || !characterPsdFile) return;
    closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
    characterPsdFile.value = '';
    characterPsdFile.click();
  });
  characterPsdFile?.addEventListener('change', async () => {
    const psdFile = characterPsdFile.files?.[0];
    if (!psdFile) return;
    await runPanelButtonAction(characterPsdUpload, 'PSD 업로드', () =>
      refreshSelectedCharacterPsd({
        actor: getSelectedActor(),
        label: 'PSD 업로드',
        psdFile,
        pushUndoSnapshot,
        saveState,
        syncPanel,
        syncRemoteState,
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
        syncRemoteState,
      })
    );
  });
  characterDelete?.addEventListener('click', () => {
    closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
    runPanelButtonAction(characterDelete, '캐릭터 삭제', () =>
      deleteSelectedCharacter({
        actors,
        characterDefs,
        actor: getSelectedActor(),
        playerActor,
        setActiveActor,
        saveState,
        syncPanel,
        syncRemoteState,
      })
    );
  });
  characterMove?.addEventListener('click', () => {
    const nextOpen = characterMoveMenu?.hidden ?? false;
    syncCharacterMoveTargets(characterMoveTargets, getSelectedActor());
    setCharacterMoveMenuOpen({ characterMove, characterMoveMenu }, nextOpen);
  });
  characterMoveTargets?.forEach((target) => {
    target.addEventListener('click', () => {
      const group = target.dataset.characterMoveGroup;
      closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
      runPanelButtonAction(characterMove, `캐릭터 이동: ${target.textContent.trim()}`, () =>
        moveSelectedCharacter({
          characterDefs,
          actor: getSelectedActor(),
          actors,
          group,
          setActiveActor,
          saveState,
          syncPanel,
          syncRemoteState,
        })
      );
    });
  });
  characterPsdRefresh?.addEventListener('click', async () => {
    closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
    await runPanelButtonAction(characterPsdRefresh, 'PSD 새로고침', () =>
      refreshSelectedCharacterPsd({
        actor: getSelectedActor(),
        label: 'PSD 새로고침',
        pushUndoSnapshot,
        saveState,
        syncPanel,
        syncRemoteState,
      })
    );
  });
  characterPartReset?.addEventListener('click', () => {
    closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
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
  characterMove,
  characterMoveMenu,
  setPendingDraft,
}) {
  characterAdd?.addEventListener('click', () => {
    if (characterAdd.disabled || !characterCreateDialog || !characterCreatePsdFile) return;
    closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
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

function populateCharacterCreateGroups(characterCreateGroup) {
  if (!characterCreateGroup) return;
  characterCreateGroup.innerHTML = '';
  creatableCharacterGroups().forEach((group) => {
    const option = document.createElement('option');
    option.value = group.key;
    option.textContent = characterGroupLabel(group.key);
    characterCreateGroup.append(option);
  });
}

function bindCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu }) {
  if (!characterMenu || !characterMenuToggle) return;

  characterMenuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const nextOpen = characterMenu.hidden;
    setCharacterMenuOpen({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu }, nextOpen);
  });
  characterMenu.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () =>
    closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu })
  );
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu });
    }
  });
}

function closeCharacterMenu({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu }) {
  setCharacterMenuOpen({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu }, false);
}

function setCharacterMenuOpen({ characterMenu, characterMenuToggle, characterMove, characterMoveMenu }, open) {
  if (!characterMenu || !characterMenuToggle) return;
  characterMenu.hidden = !open;
  characterMenuToggle.classList.toggle('is-active', open);
  characterMenuToggle.setAttribute('aria-expanded', String(open));
  if (!open) setCharacterMoveMenuOpen({ characterMove, characterMoveMenu }, false);
}

function setCharacterMoveMenuOpen({ characterMove, characterMoveMenu }, open) {
  if (!characterMoveMenu) return;
  characterMoveMenu.hidden = !open;
  characterMove?.classList.toggle('is-active', open);
  characterMove?.setAttribute('aria-expanded', String(open));
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
  syncRemoteState,
}) {
  if (!Array.isArray(actors) || !Array.isArray(characterDefs) || !world || !psdFile || !draft) return false;

  const created = await createUniqueCharacterDraft({
    actors,
    characterDefs,
    draft,
    psdFile,
  });
  if (!created) return false;

  const { def, draftActor } = created;

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
  const persisted = await persistCharacterMetadata({ saveState, syncRemoteState });
  syncPanel();
  return persisted;
}

async function createUniqueCharacterDraft({ actors, characterDefs, draft, psdFile }) {
  for (const id of characterIdCandidates([...actors, ...characterDefs], draft.englishName)) {
    const folder = characterAssetFolder(draft.group, id);
    if (characterDefs.some((def) => def.folder === folder)) continue;

    const def = {
      id,
      type: draft.group === 'players' ? 'player' : 'enemy',
      label: draft.koreanName,
      name: draft.koreanName,
      x: nextCharacterX(actors),
      folder,
      group: draft.group,
      storageFolder: folder,
      psdFileName: characterPsdFileNameForGroup(draft.group),
      tint: draft.group === 'bosses' ? '#9a8df0' : draft.group === 'players' ? '#7cc3a2' : '#ef767a',
      deletable: true,
    };
    const draftActor = {
      ...def,
      assetSources: {},
      tuning: defaultTuningFor(def),
    };

    const created = await createCharacterPsdAssets({ actor: draftActor, psdFile });
    if (created.ok) return { def, draftActor };
    if (created.status === 409) continue;

    window.console?.warn('Character creation failed.', created);
    window.alert(`새 캐릭터 폴더 생성에 실패했습니다.${created.error ? `\n${created.error}` : ''}`);
    return null;
  }

  window.alert('사용 가능한 새 캐릭터 폴더를 찾지 못했습니다. 영어명을 바꿔 다시 시도해 주세요.');
  return null;
}

async function deleteSelectedCharacter({
  actors,
  characterDefs,
  actor,
  playerActor,
  setActiveActor,
  saveState,
  syncPanel,
  syncRemoteState,
}) {
  if (!actor || isPlayerCharacter(actor)) return false;
  if (!window.confirm(`"${actor.name}" 캐릭터를 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return false;

  const index = actors.findIndex((item) => item.id === actor.id);
  if (index < 0) return false;
  const sharedFolder = isSharedCharacterAssetFolder(actor, actors);
  if (!sharedFolder) await deleteCharacterAssetFolder(actor.folder);

  const defIndex = characterDefs.findIndex((item) => item.id === actor.id);
  if (defIndex >= 0) characterDefs.splice(defIndex, 1);
  actors.splice(index, 1);
  setActiveActor(playerActor || actors[0]);
  const persisted = await persistCharacterMetadata({ saveState, syncRemoteState });
  syncPanel();
  return persisted;
}

async function moveSelectedCharacter({
  characterDefs,
  actor,
  actors,
  group,
  setActiveActor,
  saveState,
  syncPanel,
  syncRemoteState,
}) {
  if (!actor) return false;
  const nextGroup = group;
  if (!nextGroup) return false;
  if (isPlayerCharacter(actor) && nextGroup === CHARACTER_TRASH_GROUP) {
    window.alert('주인공은 기본 캐릭터라 휴지통으로 이동할 수 없습니다.');
    return false;
  }

  let nextFolder = '';
  let moved = false;
  const sharedFolder = isSharedCharacterAssetFolder(actor, actors);
  for (const candidateFolder of characterMoveFolderCandidates(characterDefs, nextGroup, actor.folder, actor.id)) {
    if (candidateFolder === actor.folder) return true;
    moved = sharedFolder
      ? await copyCharacterAssetFolder(actor.folder, candidateFolder)
      : await moveCharacterAssetFolder(actor.folder, candidateFolder);
    if (moved) {
      nextFolder = candidateFolder;
      break;
    }
  }
  if (!moved) {
    window.alert('캐릭터 이동에 실패했습니다.');
    return false;
  }
  actor.assetSources = localMovedAssetSources(actor.assetSources, actor.folder, nextFolder);

  actor.folder = nextFolder;
  actor.storageFolder = nextFolder;
  actor.group = nextGroup;
  actor.deleted = false;

  const def = characterDefs.find((item) => item.id === actor.id);
  if (def) {
    def.folder = nextFolder;
    def.storageFolder = nextFolder;
    def.group = nextGroup;
    def.deleted = false;
  }

  setActiveActor(actor);
  const persisted = await persistCharacterMetadata({ saveState, syncRemoteState });
  syncPanel();
  return persisted;
}

function isSharedCharacterAssetFolder(actor, actors) {
  if (!actor || !Array.isArray(actors)) return false;
  return actors.some((item) => item.id !== actor.id && item.folder === actor.folder);
}

function syncCharacterMoveTargets(targets, actor) {
  targets?.forEach((target) => {
    const group = target.dataset.characterMoveGroup;
    const isCurrentCanonicalGroup = actor?.group === group && String(actor?.folder || '').startsWith(`${group}/`);
    target.disabled = Boolean(isCurrentCanonicalGroup);
  });
}

async function refreshSelectedCharacterPsd({
  actor,
  label = 'PSD 업로드',
  psdFile = null,
  pushUndoSnapshot,
  saveState,
  syncPanel,
  syncRemoteState,
}) {
  if (!actor) return false;
  pushUndoSnapshot();
  const result = await refreshCharacterPsdAssetResult({ actor, psdFile });
  if (!result.ok) {
    window.console?.warn('Character PSD upload failed.', result);
    window.alert(`${label}에 실패했습니다.\n폴더: ${actor.folder}${result.error ? `\n${result.error}` : ''}`);
    return false;
  }

  actor.player.applyTuning(actor.tuning);
  const persisted = await persistCharacterMetadata({ saveState, syncRemoteState });
  syncPanel();
  return persisted;
}

async function persistCharacterMetadata({ saveState, syncRemoteState }) {
  saveState?.();
  if (!syncRemoteState) return true;
  return Boolean(await syncRemoteState());
}

function sanitizeCharacterDisplayName(value) {
  return String(value || '')
    .trim()
    .slice(0, 18);
}

function characterMoveFolderCandidates(characterDefs, group, currentFolder, currentId) {
  const characterId = sanitizeCharacterAssetName(currentId);
  const baseName =
    characterId ||
    sanitizeCharacterAssetName(
      String(currentFolder || '')
        .split('/')
        .filter(Boolean)
        .at(-1)
    );
  const used = new Set(characterDefs.filter((def) => def.id !== currentId).map((def) => def.folder));
  const folders = [];
  let suffix = 1;
  while (folders.length < 8) {
    const folder = suffix === 1 ? `${group}/${baseName}` : `${group}/${baseName}_${suffix}`;
    if (folder === currentFolder || !used.has(folder)) folders.push(folder);
    suffix += 1;
  }
  return folders;
}

function localMovedAssetSources(sources = {}, previousFolder, nextFolder) {
  const nextSources = { ...sources };
  Object.keys(nextSources).forEach((key) => {
    if (typeof nextSources[key] !== 'string') return;
    nextSources[key] = nextSources[key].replace(
      `assets/characters/${previousFolder}/`,
      `assets/characters/${nextFolder}/`
    );
  });
  return nextSources;
}

function characterIdCandidates(actors, baseId) {
  const used = new Set(actors.map((actor) => actor.id));
  const base = sanitizeCharacterAssetName(baseId);
  const candidates = [];
  let index = 1;
  while (candidates.length < 12) {
    const id = index === 1 ? base : `${base}_${index}`;
    if (!used.has(id)) candidates.push(id);
    index += 1;
  }
  return candidates;
}

function nextCharacterX(actors) {
  const lastX = Math.max(...actors.map((actor) => Number(actor.x || actor.player?.x || 480)), 480);
  return lastX + 140;
}

function bindEffectAssetButtons({
  elements,
  effectAssets,
  effectAssetSources,
  getSelectedActor,
  getEffectTimeline,
  saveState,
}) {
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
        getSelectedActor,
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
        getSelectedActor,
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
  getSelectedActor,
  getEffectTimeline,
  saveState,
}) {
  const actor = getSelectedActor?.();
  if (!actor?.tuning) return { ok: false, error: '선택된 캐릭터가 없습니다.' };
  ensureEffectOffset(actor.tuning, effectKey);
  ensureEffectSettings(actor.tuning);
  const effect = actor.tuning.effectOffsets?.[effectKey];
  const settings = actor.tuning.effectSettings?.[effectKey] || {};
  const effectTimeline = getEffectTimeline();
  const imageKey = effectUploadImageKey(effectKey, settings, effect, Boolean(effectFile));
  const actorId = actor.id || '';
  const diagnostic = {
    actorId,
    effectKey,
    currentImage: effect?.image || 'none',
    effectFileName: settings.fileName || '',
    imageKey,
    fileName: effectFile?.name || '',
    fileSize: Number(effectFile?.size || 0),
  };

  const result = await refreshEffectAssetResult({
    effectAssets,
    effectAssetSources,
    effectKey,
    imageKey,
    actorId,
    file: effectFile,
  });
  Object.assign(diagnostic, result.debug || {});
  if (!result.ok) return effectUploadDiagnosticResult(result, diagnostic);
  ensureEffectOffset(actor.tuning, effectKey);
  actor.tuning.effectOffsets[effectKey].image = imageKey;
  diagnostic.savedImage = actor.tuning.effectOffsets[effectKey].image || 'none';
  diagnostic.effectAsset = effectAssetDiagnosticInfo(effectAssets?.[result.assetKey]);
  diagnostic.effectAssetSource = effectAssetSources?.[result.assetKey] || diagnostic.effectAssetSource || '';

  effectTimeline?.renderFields();
  effectTimeline?.syncPreview();
  saveState?.();
  return effectUploadDiagnosticResult(result, diagnostic);
}

function effectUploadImageKey(effectKey, settings = {}, effect = {}, hasUploadFile = false) {
  if (!hasUploadFile && validEffectImageKey(effect?.image)) return effect.image;
  return effectImageKeyFromFileName(settings.fileName, effectKey);
}

function effectUploadDiagnosticResult(result, diagnostic) {
  const nextResult = {
    ...result,
    debug: diagnostic,
    feedbackDetail: formatEffectUploadDiagnostic(diagnostic),
  };
  window.console?.info?.('[EffectUpload]', diagnostic);
  return nextResult;
}

function formatEffectUploadDiagnostic(diagnostic = {}) {
  return [
    'Effect Upload Debug',
    `actorId: ${diagnostic.actorId || ''}`,
    `effectKey: ${diagnostic.effectKey || ''}`,
    `currentImage: ${diagnostic.currentImage || 'none'}`,
    `effectFileName: ${diagnostic.effectFileName || ''}`,
    `imageKey: ${diagnostic.imageKey || ''}`,
    `assetKey: ${diagnostic.assetKey || ''}`,
    `url: ${diagnostic.uploadUrl || ''}`,
    `file: ${formatEffectUploadFile(diagnostic)}`,
    `status: ${diagnostic.responseStatus ?? ''}`,
    `body: ${formatDiagnosticValue(diagnostic.responseBody)}`,
    `savedImage: ${diagnostic.savedImage || ''}`,
    `effectAssets[assetKey]: ${formatDiagnosticValue(diagnostic.effectAsset)}`,
    `effectAssetSource: ${diagnostic.effectAssetSource || ''}`,
  ].join('\n');
}

function formatEffectUploadFile(diagnostic = {}) {
  const name = diagnostic.fileName || 'none';
  const size = Number(diagnostic.fileSize || 0);
  return `${name} / ${size} bytes`;
}

function formatDiagnosticValue(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function effectAssetDiagnosticInfo(asset) {
  if (!asset) return null;
  return {
    width: Number(asset.naturalWidth || asset.width || 0),
    height: Number(asset.naturalHeight || asset.height || 0),
    complete: Boolean(asset.complete),
    src: asset.currentSrc || asset.src || '',
  };
}

async function runPanelButtonAction(button, label, action) {
  if (!button || !action || button.disabled) return;

  button.disabled = true;
  button.classList.add('is-working');
  button.classList.remove('is-success', 'is-error');
  button.setAttribute('aria-label', `${label} 처리중`);
  showPanelActionFeedback(label, 'working');

  let ok;
  let errorMessage;
  try {
    const result = await action();
    ok = typeof result === 'object' && result !== null ? Boolean(result.ok) : Boolean(result);
    errorMessage = typeof result === 'object' && result !== null ? result.feedbackDetail || result.error || '' : '';
  } catch (error) {
    window.console?.warn(`${label} failed.`, error);
    ok = false;
    errorMessage = error?.message || String(error || '');
  }

  button.classList.remove('is-working');
  button.classList.toggle('is-success', Boolean(ok));
  button.classList.toggle('is-error', !ok);
  button.setAttribute('aria-label', `${label} ${ok ? '완료' : '실패'}`);
  showPanelActionFeedback(label, ok ? 'success' : 'error', errorMessage);

  window.setTimeout(() => {
    button.classList.remove('is-success', 'is-error');
    button.setAttribute('aria-label', label);
    button.disabled = false;
  }, 1200);
}
