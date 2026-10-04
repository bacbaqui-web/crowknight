import { refreshPsdBackground } from './psd_background_helper.js';
import { flushProjectSave, saveGameState, syncSceneWorldBeforeSave } from './project_storage_helper.js';

export function createProjectStateController({
  actors,
  editable = true,
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
    if (!editable) return;
    syncCurrentSceneSession();
    saveGameState({
      actors,
      characterDefs,
      activeSessionId: activeSceneSessionId,
      sessions: sceneSessions,
      effectAssetSources,
    });
  }

  async function openBeta() {
    saveState();
    await flushProjectSave();
    window.location.assign('./beta.html');
    return true;
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
    refreshStagePsdAsset,
    saveState,
    openBeta,
  };
}
