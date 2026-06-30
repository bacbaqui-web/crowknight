import { refreshPsdBackground } from './psd_background_helper.js';
import { uploadGameAssetsToFirebase, uploadScenePsdAssetsToFirebase } from './firebase_asset_storage.js';
import {
  downloadSavedStateFromFirebase,
  saveGameState,
  syncSceneWorldBeforeSave,
  uploadSavedStateToFirebase,
} from './project_storage_helper.js';

export function createProjectStateController({
  actors,
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
    saveGameState({ actors, activeSessionId: activeSceneSessionId, sessions: sceneSessions, effectAssetSources });
  }

  async function uploadSettingsToFirebase() {
    const sceneSession = syncCurrentSceneSession();
    const uploadedSceneAssets = await uploadScenePsdAssetsToFirebase(sceneSession.background);
    if (!uploadedSceneAssets) return false;
    onSceneBackgroundUpdate(sceneSession.background);
    sceneSessions[sceneSession.id] = sceneSession;
    const uploadedAssets = await uploadGameAssetsToFirebase({ actors, effectAssetSources });
    if (!uploadedAssets) return false;
    return uploadSavedStateToFirebase({
      actors,
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

  async function refreshPsdAndUploadSettings({ psdFile = null } = {}) {
    const refreshed = await refreshPsdBackground({
      getSceneSession,
      onUpdate: onSceneBackgroundUpdate,
      force: true,
      psdFile,
    });
    if (!refreshed) return false;

    const sceneSession = getSceneSession();
    onSceneBackgroundUpdate(sceneSession.background);
    return uploadSettingsToFirebase();
  }

  return {
    downloadSettingsFromFirebase,
    refreshPsdAndUploadSettings,
    saveState,
    uploadSettingsToFirebase,
  };
}
