import { refreshPsdBackground } from './psd_background_helper.js';
import { uploadScenePsdAssetsToFirebase } from './firebase_asset_storage.js';
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
    syncCurrentSceneSession();
    return uploadSavedStateToFirebase({
      actors,
      characterDefs,
      activeSessionId: activeSceneSessionId,
      sessions: sceneSessions,
      effectAssetSources,
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
    const uploaded = await uploadScenePsdAssetsToFirebase(sceneSession.background);
    saveState();
    return uploaded;
  }

  return {
    downloadSettingsFromFirebase,
    refreshStagePsdAsset,
    saveState,
    uploadSettingsToFirebase,
  };
}
