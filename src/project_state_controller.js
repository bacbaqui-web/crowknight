import { refreshPsdBackground } from './psd_background_helper.js';
import { isTrashCharacter } from './character_group_data.js';
import { uploadDeploymentAssetsToFirebase } from './firebase_asset_storage_helper.js';
import {
  downloadSavedStateFromFirebase,
  saveGameState,
  syncSceneWorldBeforeSave,
  uploadSavedStateToFirebase,
} from './project_storage_helper.js';

export function createProjectStateController({
  actors,
  characterDefs,
  world,
  sceneSessions,
  effectAssetSources,
  activeSessionId,
  getSceneSession,
  onSceneBackgroundUpdate,
}) {
  let activeSceneSessionId = activeSessionId;

  function syncCurrentSceneSession() {
    const sceneSession = getSceneSession();
    syncSceneWorldBeforeSave(sceneSession, world);
    sceneSessions[sceneSession.id] = sceneSession;
    activeSceneSessionId = sceneSession.id;
    return sceneSession;
  }

  function saveState() {
    syncCurrentSceneSession();
    saveGameState({
      actors,
      characterDefs,
      activeSessionId: activeSceneSessionId,
      sessions: sceneSessions,
      effectAssetSources,
    });
  }

  async function uploadSettingsToFirebase() {
    const sceneSession = syncCurrentSceneSession();
    saveState();
    const releaseVersion = Date.now();
    const deploymentSourceActors = actors.filter((actor) => !isTrashCharacter(actor));
    const deployedAssets = await uploadDeploymentAssetsToFirebase({
      actors: deploymentSourceActors,
      effectAssetSources,
      background: sceneSession.background,
      version: releaseVersion,
    });
    if (!deployedAssets.ok) return false;

    const deploymentActors = actors.map((actor) => ({
      ...actor,
      assetSources: deployedAssets.characterAssetSourcesByActor?.[actor.id] || actor.assetSources || {},
    }));
    const deploymentSessions = structuredCloneSafe(sceneSessions);
    deploymentSessions[sceneSession.id] = {
      ...structuredCloneSafe(sceneSession),
      background: deployedAssets.background || sceneSession.background,
    };

    return uploadSavedStateToFirebase({
      actors: deploymentActors.filter((actor) => !isTrashCharacter(actor)),
      characterDefs: characterDefs.filter((def) => !isTrashCharacter(def)),
      activeSessionId: activeSceneSessionId,
      sessions: deploymentSessions,
      effectAssetSources: deployedAssets.effectAssetSources,
      releaseVersion,
      saveLocal: false,
    });
  }

  async function downloadSettingsFromFirebase() {
    const downloaded = await downloadSavedStateFromFirebase();
    if (downloaded) window.location.reload();
    return downloaded;
  }

  async function refreshStagePsdAsset({ psdFile = null } = {}) {
    const refreshed = await refreshPsdBackground({
      getSceneSession,
      onUpdate: onSceneBackgroundUpdate,
      force: true,
      psdFile,
    });
    if (!refreshed) return false;

    const sceneSession = getSceneSession();
    onSceneBackgroundUpdate(sceneSession.background);
    saveState();
    return true;
  }

  return {
    downloadSettingsFromFirebase,
    refreshStagePsdAsset,
    saveState,
    uploadSettingsToFirebase,
  };
}

function structuredCloneSafe(value) {
  if (typeof window.structuredClone === 'function') return window.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
