import { refreshClipBackground } from './clipBackgroundRuntime.js';
import { uploadSceneClipAssetsToFirebase } from './firebaseStorageAssets.js';
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

  async function refreshClipAndUploadSettings({ clipFile = null } = {}) {
    const refreshed = await refreshClipBackground({
      getSceneSession,
      onUpdate: onSceneBackgroundUpdate,
      force: true,
      clipFile,
    });
    if (!refreshed) return false;

    const sceneSession = getSceneSession();
    const uploadedAssets = await uploadSceneClipAssetsToFirebase(sceneSession.background);
    if (!uploadedAssets) return false;

    onSceneBackgroundUpdate(sceneSession.background);
    return uploadSettingsToFirebase();
  }

  return {
    downloadSettingsFromFirebase,
    refreshClipAndUploadSettings,
    saveState,
    uploadSettingsToFirebase,
  };
}
