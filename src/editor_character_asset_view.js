import { defaultTuningFor } from './actor_tuning_helper.js';
import { characterGroupLabel, creatableCharacterGroups, sanitizeCharacterAssetName } from './character_group_data.js';
import { clone } from './common_helper.js';
import {
  createCharacterFromPsd,
  deleteSelectedCharacter,
  moveSelectedCharacter,
  refreshSelectedCharacterPsd,
  syncCharacterMoveTargets,
  sanitizeCharacterDisplayName,
} from './editor_character_asset_controller.js';
import { runPanelButtonAction } from './panel_button_action_helper.js';
export function bindCharacterPsdButtons({
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
