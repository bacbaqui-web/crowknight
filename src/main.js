import { captureActorMotionStart, updatePausedActors } from './actor_frame_state.js';
import { drawActor, drawAttackTrail } from './actor_canvas_renderer.js';
import {
  lineUpActors as lineUpActorPositions,
  placeEnemiesAhead as placeEnemyActorsAhead,
} from './actor_placement_helper.js';
import { loadEffectAssets } from './asset_loader_helper.js';
import {
  bindBattleControls,
  bindCollapsibleSections,
  bindKeyboardControls,
  bindTouchControls,
} from './input_control_controller.js';
import { resolveCombat, resolveProjectileCombat } from './combat_engine.js';
import { maintainEnemyFlow, updateBattleActorMotion } from './enemy_runtime_engine.js';
import { advanceCustomActionRuntime, requestRuntimeAction } from './action_trigger_engine.js';
import { drawRankingHud } from './ranking_view.js';
import { createRankingController } from './ranking_controller.js';
import { createEncouragementBubbleController } from './encouragement_bubble_view.js';
import { createParticleEffects } from './particle_effects_engine.js';
import { drawRollGhosts, updateRollGhosts } from './roll_ghost_engine.js';
import { syncRunHud as syncRunHudView } from './run_hud_view.js';
import { loadSavedState as loadStoredSavedState } from './project_storage_helper.js';
import { applyWorldView, drawWorld } from './world_renderer.js';
import { getViewTransform } from './camera_view.js';
import { isSettingsPanelOpen } from './settings_panel_state.js';
import { createTuningPanel } from './editor_panel_controller.js';
import { actorDefsFromSavedState, createActors } from './actor_factory.js';
import { drawFormulaAfterimages, updateFormulaAfterimages } from './afterimage_runtime_helper.js';
import { updateFormulaColorChanges } from './color_change_formula_runtime_helper.js';
import { updateFormulaShakes } from './shake_formula_runtime_helper.js';
import { formulaScreenZoom } from './zoom_formula_runtime_helper.js';
import { syncCanvasToLayout } from './canvas_layout_helper.js';
import { DEATH_RESULT_DELAY } from './game_config_data.js';
import { drawSceneForeground, preloadSceneBackground } from './background_renderer.js';
import {
  DEFAULT_SCREEN_ZOOM,
  MAX_SCREEN_ZOOM,
  MIN_SCREEN_ZOOM,
  createWorldFromSceneSession,
} from './scene_session_data.js';
import { createProjectStateController } from './project_state_controller.js';
import { refreshPsdBackground } from './psd_background_helper.js';
import { getMainDomElements } from './main_dom_helper.js';
import { createRunActorState } from './run_actor_state.js';
import { createRunLifecycleController } from './run_lifecycle_controller.js';
import { loadCharacterStateFromLocalAssets } from './local_character_asset_storage_helper.js';
import { createRuntimeDebugHud } from './runtime_debug_hud_view.js';
import { beginRuntimeDebugFrame, captureRuntimeDebugActorSnapshot } from './runtime_debug_state.js';
import { layoutMobileActionControls } from './mobile_control_layout_helper.js';
import { createDeploymentVersionController } from './deployment_version_controller.js';
import { createUpdateHistoryController } from './update_history_controller.js';
import {
  activeProjectiles,
  drawProjectiles,
  resetProjectileRuntime,
  updateProjectileRuntime,
} from './projectile_runtime_engine.js';

const {
  canvas,
  ctx,
  isFullStage,
  startBattleButton,
  endBattleButton,
  homeStartButton,
  startScreen,
  resultScreen,
  mobileGameControls,
  controlGuideButton,
  gameControlGuide,
  gameVersionButton,
  updateHistoryModal,
  updateHistoryClose,
  updateHistoryList,
  rankingList,
  settingsRankingList,
  settingsRankingPanel,
  settingsRankingToggle,
  rankingForm,
  rankingName,
  rankingMessage,
  encouragementBubbles,
  resultScore,
  resultSurvival,
  resultKills,
  resultBossKills,
  hudSurvivalTime,
  hudKills,
  hudBossKills,
  screenZoomRange,
  screenZoomValue,
  retryRunButton,
} = getMainDomElements();
const keys = new Set();
const pressed = new Set();
const mobileLayoutQuery = window.matchMedia('(max-width: 820px)');
const MOBILE_SCREEN_ZOOM_OFFSET = 0.2;
const SETUP_SELECTED_ACTOR_STORAGE_KEY = 'crowKnight.setup.selectedActorId';
const isEditorPage = document.body.classList.contains('settings-page');

const savedState = await loadStoredSavedState({ source: isEditorPage ? 'local' : 'firebase' });
if (!savedState) {
  showRuntimeLoadError();
  throw new Error('Firebase project metadata is required for index.html.');
}
const sceneSessions = savedState.sessions;
let sceneSession = savedState.sceneSession;
const initialPsdBackgroundChanged = isEditorPage ? await refreshInitialPsdBackground() : false;
await preloadSceneBackground(sceneSession.background);
const world = createWorldFromSceneSession(sceneSession);
syncCanvasToLayout({ canvas, world, isFullStage });
const localCharacterState = isEditorPage ? await loadCharacterStateFromLocalAssets() : null;
const characterSourceState = localCharacterState
  ? {
      ...savedState,
      characters: localCharacterState.characters,
      actors: localCharacterActors(savedState, localCharacterState.characters),
    }
  : savedState;
const characterDefs = actorDefsFromSavedState(characterSourceState, { includeTrash: true });
const actors = await createActors({ ...characterSourceState, characters: characterDefs }, world, {
  includeTrash: true,
});
const effectAssetSources = isEditorPage
  ? localEffectAssetSourceKeys(savedState.effectAssets)
  : savedState.effectAssets || {};
const effectAssets = await loadEffectAssets('', effectAssetSources);
const runActorState = createRunActorState({ actors, world });
const particleEffects = createParticleEffects({ actors, world, ctx });
const { saveState, uploadSettingsToFirebase, downloadSettingsFromFirebase, refreshStagePsdAsset } =
  createProjectStateController({
    actors,
    characterDefs,
    world,
    sceneSessions,
    effectAssetSources,
    activeSessionId: savedState.activeSessionId,
    getSceneSession: () => sceneSession,
    onSceneBackgroundUpdate: preloadSceneBackground,
  });
if (initialPsdBackgroundChanged) saveState();
let selectedActor = readSetupSelectedActor() || runActorState.getPlayer();
let last = performance.now();
let controlGuideOpen = false;
const runLifecycle = createRunLifecycleController({
  deathSequenceDuration: DEATH_RESULT_DELAY,
  onRunStarted: handleRunStarted,
  onRunStopped: handleRunStopped,
  onPlayerDeathStarted: handlePlayerDeathStarted,
  onResultReady: handleResultReady,
  onResultClosed: handleResultClosed,
});
const deploymentVersionController = isEditorPage
  ? { applyPendingUpdate: () => false }
  : createDeploymentVersionController({
      canReload: () => !runLifecycle.hasActiveRunActors(),
      onVersion: (version) => {
        if (gameVersionButton) gameVersionButton.textContent = version;
      },
    });
createUpdateHistoryController({
  modal: updateHistoryModal,
  openButton: gameVersionButton,
  closeButton: updateHistoryClose,
  list: updateHistoryList,
});
let screenZoom = readSceneScreenZoom();
const encouragementBubbleController = createEncouragementBubbleController({ root: encouragementBubbles });
mobileLayoutQuery.addEventListener('change', syncEncouragementBubbleVisibility);
bindControlGuide();
async function refreshInitialPsdBackground() {
  const previousSignature = backgroundAssetSignature(sceneSession.background);
  const refreshed = await refreshPsdBackground({
    getSceneSession: () => sceneSession,
    onUpdate: null,
    force: false,
  });
  if (!refreshed) return false;
  sceneSessions[sceneSession.id] = sceneSession;
  return previousSignature !== backgroundAssetSignature(sceneSession.background);
}

function backgroundAssetSignature(background = {}) {
  const preview = background.psdPreview?.url || '';
  const layers = Array.isArray(background.psdLayers)
    ? background.psdLayers.map((layer) => `${layer?.id || ''}:${layer?.imageSrc || ''}`).join('|')
    : '';
  return `${preview}::${layers}`;
}

window.addEventListener('resize', () => {
  syncCanvasToLayout({
    canvas,
    world,
    actors: runActorState.getActiveActors({ runActive: runLifecycle.hasActiveRunActors() }),
    isFullStage,
    adjustActors: true,
  });
  layoutMobileActionControls(mobileGameControls);
});
lineUpActorPositions(runActorState.getActiveActors(), world);
bindBattleControls(
  { startBattleButton, homeStartButton, endBattleButton },
  {
    startRun,
    endRun: () => {
      runLifecycle.stop({ showResult: Boolean(resultScreen) });
      particleEffects.reset();
      if (!resultScreen) lineUpActorPositions(runActorState.getActiveActors(), world);
    },
  }
);
bindTouchControls(keys, pressed);
bindCollapsibleSections();
const rankingController = createRankingController({
  elements: {
    rankingList,
    settingsRankingList,
    settingsRankingPanel,
    settingsRankingToggle,
    rankingForm,
    rankingName,
    rankingMessage,
    resultScreen,
    resultScore,
    resultSurvival,
    resultKills,
    resultBossKills,
    retryRunButton,
  },
  startRun,
  getRunResult: runLifecycle.getRunResult,
  getPlayerName: () => runActorState.getPlayer()?.name || '주인공',
  hideStartScreen,
  showStartScreen,
  onRankingsChange: (rankings) => encouragementBubbleController.refresh(rankings),
});
rankingController.renderSettingsRankingList();
if (!settingsRankingList) {
  rankingController.syncFromFirebase();
}
bindScreenZoomControl();
const tuningPanel = createTuningPanel({
  canvas,
  ctx,
  actors,
  characterDefs,
  world,
  effectAssets,
  effectAssetSources,
  playerActor: runActorState.getPlayer(),
  getSelectedActor: () => selectedActor,
  setSelectedActor: (actor) => {
    selectedActor = actor;
    writeSetupSelectedActor(actor);
  },
  getSceneSession: () => sceneSession,
  saveState,
  uploadSettings: uploadSettingsToFirebase,
  downloadSettings: downloadSettingsFromFirebase,
  refreshStagePsdAsset,
});
const runtimeDebugHud = isEditorPage ? createRuntimeDebugHud({ parent: canvas?.parentElement }) : { render: () => {} };
bindKeyboardControls({
  keys,
  pressed,
  handleShortcut: (event) => tuningPanel.handleKeyboardShortcut(event),
});
markGameReady();
requestAnimationFrame(loop);

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  draw();
  pressed.clear();
  requestAnimationFrame(loop);
}

function update(dt) {
  beginRuntimeDebugFrame();
  const gameActors = runActorState.getActiveActors({ runActive: runLifecycle.hasActiveRunActors() });
  const playerActor = runActorState.getPlayer();
  captureActorMotionStart(gameActors);

  if (controlGuideOpen) return;

  if (runLifecycle.isDeathPending()) {
    updatePlayerDeathSequence(dt);
    return;
  }

  if (runLifecycle.isResultOpen()) {
    updateResultScene(dt);
    return;
  }

  if (!runLifecycle.isRunActive()) {
    const controlActor = runActorState.getEditorControlActor(selectedActor, gameActors);
    controlActor.player.update(dt, keys, pressed, world);
    updatePausedActors(
      gameActors.filter((actor) => actor !== controlActor),
      dt,
      { clearAttackTime: true }
    );
    updateRollGhosts(gameActors, dt);
    updateFormulaColorChanges(gameActors);
    updateFormulaAfterimages(gameActors, dt);
    updateFormulaShakes(gameActors, particleEffects);
    particleEffects.emitDust(dt);
    particleEffects.update(dt);
    return;
  }

  runLifecycle.updateSurvivalTime(dt);
  maintainEnemyFlow({ actors: gameActors, playerActor, world, particleEffects, dt: 0 });

  updateBattleActorMotion({
    actors: gameActors,
    playerActor,
    keys,
    pressed,
    world,
    dt,
  });
  updateProjectileRuntime({ actors: gameActors, playerActor, world, dt });

  resolveCombat({
    actors: gameActors,
    playerActor,
    world,
    particleEffects,
    onPlayerDeath: runLifecycle.startPlayerDeath,
    onPlayerKill: runLifecycle.recordPlayerKill,
    onEnemyDeath: runLifecycle.recordEnemyDeath,
  });
  resolveProjectileCombat({
    projectiles: activeProjectiles(),
    actors: gameActors,
    playerActor,
    world,
    particleEffects,
    onPlayerDeath: runLifecycle.startPlayerDeath,
    onPlayerKill: runLifecycle.recordPlayerKill,
    onEnemyDeath: runLifecycle.recordEnemyDeath,
  });

  maintainEnemyFlow({ actors: gameActors, playerActor, world, particleEffects, dt });
  updateRollGhosts(gameActors, dt);
  updateFormulaColorChanges(gameActors);
  updateFormulaAfterimages(gameActors, dt);
  updateFormulaShakes(gameActors, particleEffects);
  particleEffects.emitDust(dt);
  particleEffects.update(dt);
}

function handlePlayerDeathStarted() {
  closeControlGuide();
  setControlGuideButtonVisible(false);
  setMobileControlsVisible(false);
  keys.clear();
  pressed.clear();
  hideStartScreen();
  if (startBattleButton) startBattleButton.disabled = true;
  if (homeStartButton) homeStartButton.disabled = true;
  if (endBattleButton) endBattleButton.disabled = true;

  const player = runActorState.getPlayer().player;
  player.fallbackActionKey = 'death';
  requestRuntimeAction(player, 'death', player.facing, 'tap');
  player.dead = true;
  player.state = 'death';
  player.stateTime = 0;
  player.vx = 0;
  player.vy = 0;
  player.attackTime = 0;
  player.jumpAttackTime = 0;
  player.dashTime = 0;
  player.attackCooldown = 0;
  player.guardActive = false;
  player.guardBreakTime = 0;
  player.hurtTime = 0;
  player.onGround = true;
}

function updatePlayerDeathSequence(dt) {
  const gameActors = runActorState.getActiveActors({ runActive: runLifecycle.hasActiveRunActors() });
  const player = runActorState.getPlayer().player;
  player.animTime += dt;
  player.stateTime += dt;
  advanceCustomActionRuntime(player, dt);
  player.y = world.floorY;
  player.vx = 0;
  player.vy = 0;
  player.updateState();

  updatePausedActors(gameActors.slice(1), dt, { clearAttackTime: true });

  updateRollGhosts(gameActors, dt);
  particleEffects.update(dt);

  runLifecycle.updateDeathSequence(dt);
}

function updateResultScene(dt) {
  const gameActors = runActorState.getActiveActors({ runActive: runLifecycle.hasActiveRunActors() });
  const player = runActorState.getPlayer().player;
  player.animTime += dt;
  player.stateTime += dt;
  player.dead = true;
  player.vx = 0;
  player.vy = 0;
  player.y = world.floorY;
  player.updateState();

  updatePausedActors(gameActors.slice(1), dt);

  particleEffects.update(dt);
}

function handleRunStopped({ showResult }) {
  closeControlGuide();
  setControlGuideButtonVisible(false);
  setMobileControlsVisible(false);
  resetProjectileRuntime();
  keys.clear();
  pressed.clear();
  if (startBattleButton) startBattleButton.disabled = false;
  if (homeStartButton) homeStartButton.disabled = false;
  if (endBattleButton) endBattleButton.disabled = true;
  if (!showResult) {
    runActorState.clearEnemies();
    showStartScreen();
  }
}

function draw() {
  const gameActors = runActorState.getActiveActors({ runActive: runLifecycle.hasActiveRunActors() });
  const playerActor = runActorState.getPlayer();
  const renderActors = runActorState.getRenderActors(gameActors);
  const lifecycle = runLifecycle.getSnapshot();
  const view = getViewTransform({
    world,
    playerActor,
    selectedActor,
    particleEffects,
    playerDeathPending: lifecycle.playerDeathPending,
    resultOpen: lifecycle.resultOpen,
    isEditPanelOpen: isSettingsPanelOpen(),
    screenZoom: runtimeScreenZoom(gameActors),
    playerScreenY: sceneSession.view?.floorScreenY,
  });
  drawWorld(ctx, world, view, sceneSession);

  ctx.save();
  applyWorldView(ctx, world, view);
  particleEffects.drawDust();
  renderActors.forEach((actor) => drawFormulaAfterimages(ctx, actor));
  renderActors.forEach((actor) => drawRollGhosts(ctx, actor));
  renderActors.forEach((actor) =>
    drawActor(ctx, world, actor, {
      selectedActor,
      activeEditPartKey: tuningPanel.activeEditPartKey,
      activeEditPartKeys: tuningPanel.activeEditPartKeys,
    })
  );
  drawProjectiles(ctx, effectAssets);
  particleEffects.drawHitSparks();
  particleEffects.drawDeathParticles();
  renderActors.forEach((actor) => drawAttackTrail(ctx, actor, effectAssets));

  tuningPanel.drawSettingsDebugBoxes(view);
  ctx.restore();
  drawSceneForeground(ctx, world, view, sceneSession.background);

  tuningPanel.renderEditHandles();

  syncRunHud();
  captureRuntimeDebugActorSnapshot(playerActor.player);
  runtimeDebugHud.render();
  if (!settingsRankingList && !isFullStage) {
    drawRankingHud(ctx, {
      rankings: rankingController.getRankings(),
      battleActive: lifecycle.battleActive,
      lastRecordedScore: lifecycle.lastRecordedScore,
    });
  }
}

function syncRunHud() {
  const lifecycle = runLifecycle.getSnapshot();
  syncRunHudView({
    survivalTime: lifecycle.runSurvivalTime,
    kills: lifecycle.runKills,
    bossKills: lifecycle.bossKills,
    hudSurvivalTime,
    hudKills,
    hudBossKills,
  });
}

function bindScreenZoomControl() {
  if (!screenZoomRange) return;
  screenZoomRange.min = String(MIN_SCREEN_ZOOM);
  screenZoomRange.max = String(MAX_SCREEN_ZOOM);
  screenZoomRange.step = '0.1';
  screenZoomRange.value = String(screenZoom);
  syncScreenZoomLabel();
  screenZoomRange.addEventListener('input', () => {
    screenZoom = normalizeScreenZoom(screenZoomRange.value);
    syncSceneScreenZoom();
    syncScreenZoomLabel();
  });
  screenZoomRange.addEventListener('change', () => {
    syncSceneScreenZoom();
    saveState();
  });
}

function syncScreenZoomLabel() {
  if (screenZoomValue) screenZoomValue.textContent = `${screenZoom.toFixed(1)}x`;
}

function readSceneScreenZoom() {
  return normalizeScreenZoom(sceneSession?.view?.screenZoom);
}

function syncSceneScreenZoom() {
  sceneSession.view ||= {};
  sceneSession.view.screenZoom = screenZoom;
  sceneSessions[sceneSession.id] = sceneSession;
}

function normalizeScreenZoom(value) {
  const zoom = Number(value);
  if (!Number.isFinite(zoom)) return DEFAULT_SCREEN_ZOOM;
  return Math.min(MAX_SCREEN_ZOOM, Math.max(MIN_SCREEN_ZOOM, zoom));
}

function runtimeScreenZoom(gameActors) {
  const formulaZoom = formulaScreenZoom(gameActors, screenZoom);
  const mobileOffset = mobileLayoutQuery.matches ? MOBILE_SCREEN_ZOOM_OFFSET : 0;
  return normalizeScreenZoom(formulaZoom - mobileOffset);
}

function startRun() {
  if (deploymentVersionController.applyPendingUpdate()) return;
  runLifecycle.start();
}

function handleRunStarted() {
  const playerActor = runActorState.resolvePlayer(selectedActor);
  runActorState.rebuildEnemies();
  const gameActors = runActorState.getRunActors();
  lineUpActorPositions(gameActors, world);
  setControlGuideButtonVisible(true);
  setMobileControlsVisible(true);
  particleEffects.reset();
  resetProjectileRuntime();
  keys.clear();
  pressed.clear();
  placeEnemyActorsAhead(gameActors, playerActor, world);
  gameActors.forEach((actor) => {
    actor.runtimeBossKillCounted = false;
  });
  hideStartScreen();
  if (startBattleButton) startBattleButton.disabled = true;
  if (homeStartButton) homeStartButton.disabled = true;
  if (endBattleButton) endBattleButton.disabled = false;
  document.activeElement?.blur();
}

function readSetupSelectedActor() {
  try {
    const actorId = window.localStorage?.getItem(SETUP_SELECTED_ACTOR_STORAGE_KEY);
    return actorId ? runActorState.findBaseActor(actorId) : null;
  } catch {
    return null;
  }
}

function writeSetupSelectedActor(actor) {
  try {
    if (actor?.id) window.localStorage?.setItem(SETUP_SELECTED_ACTOR_STORAGE_KEY, actor.id);
  } catch {
    // Ignore private browsing or blocked storage.
  }
}

function localCharacterActors(savedStateSource, characterDefinitions) {
  return Object.fromEntries(
    characterDefinitions.map((def) => {
      const savedActor = { ...(savedStateSource.actors?.[def.id] || {}) };
      delete savedActor.assets;
      return [
        def.id,
        {
          ...savedActor,
          name: def.name,
        },
      ];
    })
  );
}

function localEffectAssetSourceKeys(sources = {}) {
  return Object.fromEntries(
    Object.keys(sources || {})
      .filter((key) => !key.endsWith('Psd'))
      .map((key) => [key, ''])
  );
}

function hideStartScreen() {
  startScreen?.classList.add('is-hidden');
}

function showStartScreen() {
  if (!startScreen) return;

  startScreen.classList.remove('is-hidden');
  deploymentVersionController.applyPendingUpdate();
}

function handleResultReady() {
  setMobileControlsVisible(false);
  const resultShown = rankingController.showResultScreen();
  encouragementBubbleController.setActive(Boolean(resultShown) && !mobileLayoutQuery.matches);
  return resultShown;
}

function handleResultClosed() {
  const resultShown = rankingController.hideResultScreen();
  encouragementBubbleController.setActive(false);
  return resultShown;
}

function setMobileControlsVisible(isVisible) {
  if (!mobileGameControls) return;
  mobileGameControls.hidden = !isVisible;
  if (isVisible) requestAnimationFrame(() => layoutMobileActionControls(mobileGameControls));
}

function bindControlGuide() {
  controlGuideButton?.addEventListener('click', openControlGuide);
  window.addEventListener('keydown', dismissControlGuide, true);
  window.addEventListener('pointerdown', dismissControlGuide, true);
}

function openControlGuide() {
  if (!runLifecycle.isRunActive() || controlGuideOpen || !gameControlGuide) return;
  controlGuideOpen = true;
  gameControlGuide.hidden = false;
  controlGuideButton?.setAttribute('aria-expanded', 'true');
  keys.clear();
  pressed.clear();
}

function dismissControlGuide(event) {
  if (!controlGuideOpen) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeControlGuide();
}

function closeControlGuide() {
  if (!controlGuideOpen && gameControlGuide?.hidden) return;
  controlGuideOpen = false;
  if (gameControlGuide) gameControlGuide.hidden = true;
  controlGuideButton?.setAttribute('aria-expanded', 'false');
  keys.clear();
  pressed.clear();
  last = performance.now();
}

function setControlGuideButtonVisible(isVisible) {
  if (controlGuideButton) controlGuideButton.hidden = !isVisible;
}

function syncEncouragementBubbleVisibility() {
  encouragementBubbleController.setActive(runLifecycle.isResultOpen() && !mobileLayoutQuery.matches);
}

function showRuntimeLoadError() {
  if (homeStartButton) {
    homeStartButton.classList.remove('is-loading');
    homeStartButton.textContent = 'LOAD ERROR';
    homeStartButton.disabled = true;
  }
  const parent = canvas?.parentElement || document.body;
  const message = document.createElement('div');
  message.className = 'runtime-load-error';
  message.textContent = '게임 데이터를 불러오지 못했습니다. Firebase 배포 업로드를 먼저 완료해 주세요.';
  parent.append(message);
}

function markGameReady() {
  if (!homeStartButton) return;
  homeStartButton.classList.remove('is-loading');
  homeStartButton.textContent = 'PLAY';
  homeStartButton.disabled = false;
}
