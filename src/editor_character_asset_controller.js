import { defaultTuningFor } from './actor_tuning_helper.js';
import { createActorFromDef } from './actor_factory.js';
import {
  createCharacterPsdAssets,
  copyCharacterAssetFolder,
  deleteCharacterAssetFolder,
  moveCharacterAssetFolder,
  refreshCharacterPsdAssetResult,
} from './asset_refresh_helper.js';
import {
  CHARACTER_TRASH_GROUP,
  characterAssetFolder,
  characterPsdFileNameForGroup,
  isPlayerCharacter,
  sanitizeCharacterAssetName,
} from './character_group_data.js';
import { flushProjectSave } from './project_storage_helper.js';
export async function createCharacterFromPsd({
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

export async function deleteSelectedCharacter({
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
  if (!window.confirm(`"${actor.name}" 캐릭터를 편집 목록에서 제거할까요? 원본 PSD와 에셋 파일은 보존됩니다.`))
    return false;

  const index = actors.findIndex((item) => item.id === actor.id);
  if (index < 0) return false;
  const sharedFolder = isSharedCharacterAssetFolder(actor, actors);
  if (!sharedFolder && !(await deleteCharacterAssetFolder(actor.folder)))
    throw new Error('캐릭터 삭제 요청에 실패했습니다.');

  const defIndex = characterDefs.findIndex((item) => item.id === actor.id);
  if (defIndex >= 0) characterDefs.splice(defIndex, 1);
  actors.splice(index, 1);
  setActiveActor(playerActor || actors[0]);
  const persisted = await persistCharacterMetadata({ saveState, syncRemoteState });
  syncPanel();
  return persisted;
}

export async function moveSelectedCharacter({
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

export function syncCharacterMoveTargets(targets, actor) {
  targets?.forEach((target) => {
    const group = target.dataset.characterMoveGroup;
    const isCurrentCanonicalGroup = actor?.group === group && String(actor?.folder || '').startsWith(`${group}/`);
    target.disabled = Boolean(isCurrentCanonicalGroup);
  });
}

export async function refreshSelectedCharacterPsd({
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
  await flushProjectSave();
  if (!syncRemoteState) return true;
  return Boolean(await syncRemoteState());
}

export function sanitizeCharacterDisplayName(value) {
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
