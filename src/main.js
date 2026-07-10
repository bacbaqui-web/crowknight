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
import { maintainEnemyFlow, resolveCombat, resolveProjectileCombat, updateBattleActorMotion } from './combat_engine.js';
import { advanceCustomActionRuntime, requestRuntimeAction } from './action_trigger_engine.js';
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
import { PuppetPlayer } from './actor_runtime_engine.js';
import { createProjectStateController } from './project_state_controller.js';
import { refreshPsdBackground } from './psd_background_helper.js';
import { getMainDomElements } from './main_dom_helper.js';
import { isPlayerCharacter, isTrashCharacter, normalizeCharacterGroup } from './character_group_data.js';
import { loadCharacterStateFromLocalAssets } from './local_character_asset_storage_helper.js';
import { createRuntimeDebugHud } from './runtime_debug_hud_view.js';
import { beginRuntimeDebugFrame, captureRuntimeDebugActorSnapshot } from './runtime_debug_state.js';
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
const SETUP_SELECTED_ACTOR_STORAGE_KEY = 'crowKnight.setup.selectedActorId';

const savedState = await loadStoredSavedState();
const sceneSessions = savedState.sessions;
let sceneSession = savedState.sceneSession;
const initialPsdBackgroundChanged = await refreshInitialPsdBackground();
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
let playerActor = defaultRunPlayerActor(actors);
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
let selectedActor = readSetupSelectedActor() || playerActor;
let battleActive = false;
let playerDeathPending = false;
let resultOpen = false;
let deathSequenceTime = 0;
let last = performance.now();
let runSurvivalTime = 0;
let runKills = 0;
let lastRecordedScore = 0;
let screenZoom = readSceneScreenZoom();
let runtimeEnemyActors = [];

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
    writeSetupSelectedActor(actor);
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
    updateFormulaColorChanges(gameActors);
    updateFormulaAfterimages(gameActors, dt);
    updateFormulaShakes(gameActors, particleEffects);
    particleEffects.emitDust(dt);
    particleEffects.update(dt);
    return;
  }

  runSurvivalTime += dt;
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
    onPlayerDeath: beginPlayerDeath,
    onPlayerKill: () => {
      runKills += 1;
    },
  });
  resolveProjectileCombat({
    projectiles: activeProjectiles(),
    actors: gameActors,
    playerActor,
    world,
    particleEffects,
    onPlayerDeath: beginPlayerDeath,
    onPlayerKill: () => {
      runKills += 1;
    },
  });

  maintainEnemyFlow({ actors: gameActors, playerActor, world, particleEffects, dt });
  updateRollGhosts(gameActors, dt);
  updateFormulaColorChanges(gameActors);
  updateFormulaAfterimages(gameActors, dt);
  updateFormulaShakes(gameActors, particleEffects);
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
  const gameActors = activeGameActors();
  const player = playerActor.player;
  deathSequenceTime += dt;
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
  resetProjectileRuntime();
  keys.clear();
  pressed.clear();
  if (startBattleButton) startBattleButton.disabled = false;
  if (homeStartButton) homeStartButton.disabled = false;
  if (endBattleButton) endBattleButton.disabled = true;
  if (showResult) showResultScreen();
  else {
    runtimeEnemyActors = [];
    showStartScreen();
  }
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
    screenZoom: formulaScreenZoom(gameActors, screenZoom),
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
  syncRunPlayerFromSetupSelection();
  rebuildRuntimeEnemyActors();
  const gameActors = runOrderedActors([...baseGameActors(), ...runtimeEnemyActors]);
  lineUpActorPositions(gameActors, world);
  battleActive = true;
  playerDeathPending = false;
  resultOpen = false;
  deathSequenceTime = 0;
  lastRecordedScore = 0;
  runSurvivalTime = 0;
  runKills = 0;
  particleEffects.reset();
  resetProjectileRuntime();
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
  const gameActors = baseGameActors();
  const runtimeActors = runActorOrderActive() ? [...gameActors, ...runtimeEnemyActors] : gameActors;
  return runActorOrderActive() ? runOrderedActors(runtimeActors) : runtimeActors;
}

function editorControlActor(gameActors = activeGameActors()) {
  return gameActors.includes(selectedActor) ? selectedActor : playerActor;
}

function syncRunPlayerFromSetupSelection() {
  const gameActors = baseGameActors();
  playerActor = setupSelectedRunActor(gameActors);
  return runOrderedActors(gameActors);
}

function rebuildRuntimeEnemyActors() {
  runtimeEnemyActors = [];
  baseGameActors()
    .filter((actor) => actor !== playerActor && !isPlayerCharacter(actor))
    .forEach((actor) => {
      const maxAlive = resolveRuntimeEnemyMaxAlive(actor);
      for (let index = 1; index < maxAlive; index += 1) {
        runtimeEnemyActors.push(createRuntimeEnemyClone(actor, index));
      }
    });
}

function resolveRuntimeEnemyMaxAlive(actor) {
  const enemyRules = world?.enemyRules || {};
  const actorRule = enemyRules.spawnRulesByActor?.[actor.id] || null;
  const poolRule = Array.isArray(enemyRules.pool) ? enemyRules.pool.find((entry) => entry?.actorId === actor.id) : null;
  return Math.max(0, Math.round(Number(actorRule?.maxAlive ?? poolRule?.maxAlive ?? 1)));
}

function createRuntimeEnemyClone(source, index) {
  const player = new PuppetPlayer(source.player.x, world.floorY, source.player.assets);
  player.applyTuning(source.tuning);
  player.debugInteractionObjects = source.player.debugInteractionObjects;
  return {
    ...source,
    runtimeClone: true,
    runtimeSourceActorId: source.id,
    runtimeInstanceId: `${source.id}#${index + 1}`,
    respawning: false,
    respawnTargetX: source.respawnTargetX,
    invulnTime: 0,
    wasRolling: false,
    hurtCooldown: 0,
    hitStun: 0,
    rollGhosts: [],
    rollGhostTimer: 0,
    lastHitSerials: {},
    aiActionCooldowns: {},
    hpPips: source.maxHpPips,
    player,
  };
}

function setupSelectedRunActor(gameActors = baseGameActors()) {
  if (gameActors.includes(selectedActor)) return selectedActor;
  return defaultRunPlayerActor(gameActors) || playerActor;
}

function runOrderedActors(gameActors = baseGameActors()) {
  if (!gameActors.includes(playerActor)) return gameActors;
  return [playerActor, ...gameActors.filter((actor) => actor !== playerActor).sort(compareEnemyRunOrder)];
}

function compareEnemyRunOrder(a, b) {
  return enemyRunOrderPriority(a) - enemyRunOrderPriority(b);
}

function enemyRunOrderPriority(actor) {
  const group = normalizeCharacterGroup(actor?.group, '');
  if (group === 'mobs') return 0;
  if (group === 'bosses') return 1;
  return 2;
}

function runActorOrderActive() {
  return battleActive || playerDeathPending || resultOpen;
}

function baseGameActors() {
  return actors.filter((actor) => !isTrashCharacter(actor));
}

function defaultRunPlayerActor(gameActors = baseGameActors()) {
  return gameActors.find((actor) => isPlayerCharacter(actor)) || gameActors[0] || null;
}

function readSetupSelectedActor() {
  try {
    const actorId = window.localStorage?.getItem(SETUP_SELECTED_ACTOR_STORAGE_KEY);
    return actorId ? baseGameActors().find((actor) => actor.id === actorId) || null : null;
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
