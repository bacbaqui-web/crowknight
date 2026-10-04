import { loadSavedState } from './project_storage_helper.js';
import { actorDefsFromSavedState, createActors } from './actor_factory.js';
import { loadEffectAssets } from './asset_loader_helper.js';
import { preloadSceneBackground } from './background_renderer.js';
import { refreshPsdBackground } from './psd_background_helper.js';
import { createWorldFromSceneSession } from './scene_session_data.js';
import { syncCanvasToLayout } from './canvas_layout_helper.js';

export async function loadProjectRuntime({ mode, canvas, isFullStage }) {
  const savedState = await loadSavedState({ source: mode === 'editor' ? 'local' : mode });
  if (!savedState) throw new Error('Game snapshot could not be loaded.');
  const sceneSessions = savedState.sessions;
  const sceneSession = savedState.sceneSession;
  const initialPsdBackgroundChanged = mode === 'editor' ? await refreshInitialBackground(sceneSession) : false;
  sceneSessions[sceneSession.id] = sceneSession;
  await preloadSceneBackground(sceneSession.background);
  const world = createWorldFromSceneSession(sceneSession);
  syncCanvasToLayout({ canvas, world, isFullStage });
  const characterDefs = actorDefsFromSavedState(savedState, { includeTrash: true });
  const actors = await createActors({ ...savedState, characters: characterDefs }, world, { includeTrash: true });
  const effectAssetSources =
    mode === 'editor' ? editableEffectSources(savedState.effectAssets) : savedState.effectAssets || {};
  const effectAssets = await loadEffectAssets('', effectAssetSources);
  return {
    savedState,
    sceneSessions,
    sceneSession,
    world,
    characterDefs,
    actors,
    effectAssetSources,
    effectAssets,
    initialPsdBackgroundChanged,
  };
}

async function refreshInitialBackground(sceneSession) {
  const before = backgroundAssetSignature(sceneSession.background);
  const refreshed = await refreshPsdBackground({ getSceneSession: () => sceneSession, onUpdate: null, force: false });
  return Boolean(refreshed && before !== backgroundAssetSignature(sceneSession.background));
}

function backgroundAssetSignature(background = {}) {
  const preview = background.psdPreview?.url || '';
  const layers = Array.isArray(background.psdLayers)
    ? background.psdLayers.map((layer) => `${layer?.id || ''}:${layer?.imageSrc || ''}`).join('|')
    : '';
  return `${preview}::${layers}`;
}

function editableEffectSources(sources = {}) {
  return Object.fromEntries(
    Object.keys(sources)
      .filter((key) => !key.endsWith('Psd') && key !== '__snapshot')
      .map((key) => [key, ''])
  );
}
