import { refreshPsdBackground } from './psdBackgroundRuntime.js';
import { uploadScenePsdAssetsToFirebase } from './firebaseStorageAssets.js';
import {
  downloadSavedStateFromFirebase,
  saveGameState,
  syncSceneWorldBeforeSave,
  uploadSavedStateToFirebase,
} from './saveStateStorage.js';

export function createProjectStateController({
  actors,
  world,
  sceneSessions,
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
    saveGameState({ actors, activeSessionId: activeSceneSessionId, sessions: sceneSessions });
  }

  async function uploadSettingsToFirebase() {
    syncCurrentSceneSession();
    return uploadSavedStateToFirebase({ actors, activeSessionId: activeSceneSessionId, sessions: sceneSessions });
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
    const uploadedAssets = await uploadScenePsdAssetsToFirebase(sceneSession.background);
    if (!uploadedAssets) return false;

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
