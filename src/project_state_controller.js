import { refreshPsdBackground } from './psd_background_helper.js';
import { uploadCharacterMetadataSetToFirebase } from './firebase_asset_storage_helper.js';
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
    const metadataUploaded = await uploadSavedStateToFirebase({
      actors,
      characterDefs,
      activeSessionId: activeSceneSessionId,
      sessions: sceneSessions,
      effectAssetSources,
    });
    const characterMetadataUploaded = await uploadCharacterMetadataSetToFirebase(actors);
    return metadataUploaded && characterMetadataUploaded;
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
