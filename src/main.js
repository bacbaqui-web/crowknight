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
import { maintainEnemyFlow, resolveCombat, updateBattleActorMotion } from './combat_engine.js';
import { drawRankingHud } from './ranking_view.js';
import { createRankingController } from './ranking_controller.js';
import { createParticleEffects } from './particle_effects_engine.js';
import { drawRollGhosts, updateRollGhosts } from './roll_ghost_engine.js';
import { getRunScore as calculateRunScore, syncRunHud as syncRunHudView } from './run_hud_view.js';
import { loadSavedState as loadStoredSavedState } from './project_storage_helper.js';
import { applyWorldView, drawWorld } from './world_renderer.js';
import { getViewTransform } from './camera_view.js';
import { isSettingsPanelOpen } from './settings_panel_state.js';
import { createTuningPanel } from './editor_panel_controller.js';
import { actorDefsFromSavedState, createActors } from './actor_factory.js';
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
import { isTrashCharacter } from './character_group_data.js';
import { loadCharacterStateFromLocalAssets } from './local_character_asset_storage_helper.js';
import { createRuntimeDebugHud } from './runtime_debug_hud_view.js';
import { beginRuntimeDebugFrame, captureRuntimeDebugActorSnapshot } from './runtime_debug_state.js';

const {
  canvas,
  ctx,
  isFullStage,
  startBattleButton,
  endBattleButton,
  homeStartButton,
  startScreen,
  resultScreen,
  rankingList,
  settingsRankingList,
  settingsRankingPanel,
  settingsRankingToggle,
  rankingForm,
  rankingName,
  rankingMessage,
  resultScore,
  resultSurvival,
  resultKills,
  hudSurvivalTime,
  hudKills,
  screenZoomRange,
  screenZoomValue,
  retryRunButton,
} = getMainDomElements();
const keys = new Set();
const pressed = new Set();

const savedState = await loadStoredSavedState();
const sceneSessions = savedState.sessions;
let sceneSession = savedState.sceneSession;
await refreshInitialPsdBackground();
preloadSceneBackground(sceneSession.background);
const world = createWorldFromSceneSession(sceneSession);
syncCanvasToLayout({ canvas, world, isFullStage });
const localCharacterState = await loadCharacterStateFromLocalAssets();
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
const effectAssetSources = savedState.effectAssets || {};
const effectAssets = await loadEffectAssets('', effectAssetSources);
const playerActor = actors[0];
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
let selectedActor = playerActor;
let battleActive = false;
let playerDeathPending = false;
let resultOpen = false;
let deathSequenceTime = 0;
let last = performance.now();
let runSurvivalTime = 0;
let runKills = 0;
let lastRecordedScore = 0;
let screenZoom = readSceneScreenZoom();

async function refreshInitialPsdBackground() {
  const refreshed = await refreshPsdBackground({
    getSceneSession: () => sceneSession,
    onUpdate: null,
    force: false,
  });
  if (!refreshed) return;
  sceneSessions[sceneSession.id] = sceneSession;
}

window.addEventListener('resize', () =>
  syncCanvasToLayout({ canvas, world, actors: activeGameActors(), isFullStage, adjustActors: true })
);
lineUpActorPositions(activeGameActors(), world);
bindBattleControls(
  { startBattleButton, homeStartButton, endBattleButton },
  {
    startRun,
    endRun: () => {
      finishRun({ showResult: Boolean(resultScreen) });
      particleEffects.reset();
      if (!resultScreen) lineUpActorPositions(activeGameActors(), world);
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
    retryRunButton,
  },
  startRun,
  getRunResult,
  getPlayerName: () => playerActor.name || '주인공',
  hideStartScreen,
  showStartScreen,
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
  playerActor,
  getSelectedActor: () => selectedActor,
  setSelectedActor: (actor) => {
    selectedActor = actor;
  },
  getSceneSession: () => sceneSession,
  saveState,
  uploadSettings: uploadSettingsToFirebase,
  downloadSettings: downloadSettingsFromFirebase,
  refreshStagePsdAsset,
});
const runtimeDebugHud = createRuntimeDebugHud({ parent: canvas?.parentElement });
bindKeyboardControls({
  keys,
  pressed,
  handleShortcut: (event) => tuningPanel.handleKeyboardShortcut(event),
});
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
  const gameActors = activeGameActors();
  captureActorMotionStart(gameActors);

  if (playerDeathPending) {
    updatePlayerDeathSequence(dt);
    return;
  }

  if (resultOpen) {
    updateResultScene(dt);
    return;
  }

  if (!battleActive) {
    const controlActor = editorControlActor(gameActors);
    controlActor.player.update(dt, keys, pressed, world);
    updatePausedActors(
      gameActors.filter((actor) => actor !== controlActor),
      dt,
      { clearAttackTime: true }
    );
    updateRollGhosts(gameActors, dt);
    particleEffects.emitDust(dt);
    particleEffects.update(dt);
    return;
  }

  runSurvivalTime += dt;

  updateBattleActorMotion({
    actors: gameActors,
    playerActor,
    keys,
    pressed,
    world,
    dt,
  });

  resolveCombat({
    actors: gameActors,
    playerActor,
    world,
    particleEffects,
    onPlayerDeath: beginPlayerDeath,
    onPlayerKill: () => {
      runKills += 1;
    },
  });

  maintainEnemyFlow({ actors: gameActors, playerActor, world, particleEffects });
  updateRollGhosts(gameActors, dt);
  particleEffects.emitDust(dt);
  particleEffects.update(dt);
}

function beginPlayerDeath() {
  if (playerDeathPending || resultOpen) return;

  lastRecordedScore = getRunScore();
  playerDeathPending = true;
  deathSequenceTime = 0;
  battleActive = false;
  keys.clear();
  pressed.clear();
  hideStartScreen();
  if (startBattleButton) startBattleButton.disabled = true;
  if (homeStartButton) homeStartButton.disabled = true;
  if (endBattleButton) endBattleButton.disabled = true;

  const player = playerActor.player;
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
  const gameActors = activeGameActors();
  const player = playerActor.player;
  deathSequenceTime += dt;
  player.animTime += dt;
  player.stateTime += dt;
  player.y = world.floorY;
  player.vx = 0;
  player.vy = 0;
  player.updateState();

  updatePausedActors(gameActors.slice(1), dt, { clearAttackTime: true });

  updateRollGhosts(gameActors, dt);
  particleEffects.update(dt);

  if (deathSequenceTime >= DEATH_RESULT_DELAY) {
    playerDeathPending = false;
    finishRun({ showResult: true });
  }
}

function updateResultScene(dt) {
  const gameActors = activeGameActors();
  const player = playerActor.player;
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

function finishRun({ showResult = false } = {}) {
  if (!battleActive && !showResult) return;

  if (battleActive) {
    lastRecordedScore = getRunScore();
  }
  battleActive = false;
  keys.clear();
  pressed.clear();
  if (startBattleButton) startBattleButton.disabled = false;
  if (homeStartButton) homeStartButton.disabled = false;
  if (endBattleButton) endBattleButton.disabled = true;
  if (showResult) showResultScreen();
  else showStartScreen();
}

function draw() {
  const gameActors = activeGameActors();
  const renderActors = actorRenderOrder(gameActors);
  const view = getViewTransform({
    world,
    playerActor,
    selectedActor,
    particleEffects,
    playerDeathPending,
    resultOpen,
    isEditPanelOpen: isSettingsPanelOpen(),
    screenZoom,
  });
  drawWorld(ctx, world, view, sceneSession);

  ctx.save();
  applyWorldView(ctx, world, view);
  particleEffects.drawDust();
  renderActors.forEach((actor) => drawRollGhosts(ctx, actor));
  renderActors.forEach((actor) =>
    drawActor(ctx, world, actor, {
      selectedActor,
      activeEditPartKey: tuningPanel.activeEditPartKey,
      activeEditPartKeys: tuningPanel.activeEditPartKeys,
    })
  );
  particleEffects.drawHitSparks();
  particleEffects.drawDeathParticles();
  renderActors.forEach((actor) => drawAttackTrail(ctx, actor, effectAssets));

  tuningPanel.drawSettingsDebugBoxes();
  ctx.restore();
  drawSceneForeground(ctx, world, view, sceneSession.background);

  tuningPanel.renderEditHandles();

  syncRunHud();
  captureRuntimeDebugActorSnapshot(playerActor.player);
  runtimeDebugHud.render();
  if (!settingsRankingList && !isFullStage) {
    drawRankingHud(ctx, { rankings: rankingController.getRankings(), battleActive, lastRecordedScore });
  }
}

function actorRenderOrder(gameActors) {
  return [...gameActors.filter((actor) => actor !== playerActor), playerActor].filter((actor) =>
    gameActors.includes(actor)
  );
}

function getRunScore() {
  return calculateRunScore(runSurvivalTime, runKills);
}

function getRunResult() {
  return {
    score: lastRecordedScore,
    survivalTime: runSurvivalTime,
    kills: runKills,
  };
}

function syncRunHud() {
  syncRunHudView({ survivalTime: runSurvivalTime, kills: runKills, hudSurvivalTime, hudKills });
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

function startRun() {
  hideResultScreen();
  const gameActors = activeGameActors();
  lineUpActorPositions(gameActors, world);
  battleActive = true;
  playerDeathPending = false;
  resultOpen = false;
  deathSequenceTime = 0;
  lastRecordedScore = 0;
  runSurvivalTime = 0;
  runKills = 0;
  particleEffects.reset();
  keys.clear();
  pressed.clear();
  placeEnemyActorsAhead(gameActors, playerActor, world);
  hideStartScreen();
  if (startBattleButton) startBattleButton.disabled = true;
  if (homeStartButton) homeStartButton.disabled = true;
  if (endBattleButton) endBattleButton.disabled = false;
  document.activeElement?.blur();
}

function activeGameActors() {
  return actors.filter((actor) => !isTrashCharacter(actor));
}

function editorControlActor(gameActors = activeGameActors()) {
  return gameActors.includes(selectedActor) ? selectedActor : playerActor;
}

function localCharacterActors(savedStateSource, characterDefinitions) {
  return Object.fromEntries(
    characterDefinitions.map((def) => [
      def.id,
      {
        ...(savedStateSource.actors?.[def.id] || {}),
        name: def.name,
      },
    ])
  );
}

function hideStartScreen() {
  startScreen?.classList.add('is-hidden');
}

function showStartScreen() {
  if (!startScreen) return;

  startScreen.classList.remove('is-hidden');
}

function showResultScreen() {
  resultOpen = rankingController.showResultScreen();
}

function hideResultScreen() {
  resultOpen = rankingController.hideResultScreen();
}
