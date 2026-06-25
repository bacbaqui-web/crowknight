import { drawAttackTrail } from './actorEffectsRenderer.js';
import { drawActor } from './actorRenderer.js';
import { lineUpActors as lineUpActorPositions, placeEnemiesAhead as placeEnemyActorsAhead } from './actorPlacement.js';
import { loadEffectAssets } from './assetLoaders.js';
import {
  bindBattleControls,
  bindCollapsibleSections,
  bindKeyboardControls,
  bindTouchControls,
} from './inputControls.js';
import { maintainEnemyFlow, resolveCombat, updateBattleActorMotion } from './combatSystem.js';
import {
  bindResultScreen as bindResultScreenControls,
  bindSettingsRankingToggle,
  hideResultScreen as hideResultScreenView,
  loadRankings as loadStoredRankings,
  recordRankingEntry,
  renderRankingList as renderRankingListView,
  renderSettingsRankingList as renderSettingsRankingListView,
  saveRankings as saveStoredRankings,
  showResultScreen as showResultScreenView,
} from './rankingUi.js';
import { drawRankingHud } from './rankingCanvas.js';
import { createParticleEffects } from './particleEffects.js';
import { drawRollGhosts, updateRollGhosts } from './rollGhosts.js';
import { getRunScore as calculateRunScore, syncRunHud as syncRunHudView } from './runHud.js';
import {
  downloadSavedStateFromFirebase,
  loadSavedState as loadStoredSavedState,
  saveGameState,
  syncSceneWorldBeforeSave,
  uploadSavedStateToFirebase,
} from './saveStateStorage.js';
import { applyWorldView, drawWorld } from './worldRenderer.js';
import { getViewTransform } from './cameraView.js';
import { isSettingsPanelOpen } from './settingsPanelState.js';
import { createTuningPanel } from './tuningPanel.js';
import { createActors } from './actorFactory.js';
import { syncCanvasToLayout } from './canvasLayout.js';
import { DEATH_RESULT_DELAY } from './gameConfig.js';
import { drawSceneForeground, preloadSceneBackground } from './backgroundRenderer.js';
import { createWorldFromSceneSession } from './sceneSession.js';
import { refreshClipBackground } from './clipBackgroundRuntime.js';
import { uploadSceneClipAssetsToFirebase } from './firebaseStorageAssets.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const isFullStage = document.body.classList.contains('full-stage');
const keys = new Set();
const pressed = new Set();

const savedState = await loadStoredSavedState();
const sceneSessions = savedState.sessions;
let activeSceneSessionId = savedState.activeSessionId;
let sceneSession = savedState.sceneSession;
preloadSceneBackground(sceneSession.background);
const world = createWorldFromSceneSession(sceneSession);
syncCanvasToLayout({ canvas, world, isFullStage });
const actors = await createActors(savedState, world);
const effectAssets = await loadEffectAssets();
const playerActor = actors[0];
const particleEffects = createParticleEffects({ actors, world, ctx });
const startBattleButton = document.querySelector('#startBattle');
const endBattleButton = document.querySelector('#endBattle');
const homeStartButton = document.querySelector('#homeStart');
const startScreen = document.querySelector('#startScreen');
const resultScreen = document.querySelector('#resultScreen');
const rankingList = document.querySelector('#rankingList');
const settingsRankingList = document.querySelector('#settingsRankingList');
const settingsRankingPanel = document.querySelector('.settings-ranking-panel');
const settingsRankingToggle = document.querySelector('#rankingToggle');
const rankingForm = document.querySelector('#rankingForm');
const rankingName = document.querySelector('#rankingName');
const rankingMessage = document.querySelector('#rankingMessage');
const resultScore = document.querySelector('#resultScore');
const resultSurvival = document.querySelector('#resultSurvival');
const resultKills = document.querySelector('#resultKills');
const hudSurvivalTime = document.querySelector('#hudSurvivalTime');
const hudKills = document.querySelector('#hudKills');
const retryRunButton = document.querySelector('#retryRun');
let selectedActor = playerActor;
let battleActive = false;
let playerDeathPending = false;
let resultOpen = false;
let deathSequenceTime = 0;
let last = performance.now();
let runSurvivalTime = 0;
let runKills = 0;
let lastRecordedScore = 0;
let rankings = loadStoredRankings();

window.addEventListener('resize', () => syncCanvasToLayout({ canvas, world, actors, isFullStage, adjustActors: true }));
lineUpActorPositions(actors, world);
bindBattleControls(
  { startBattleButton, homeStartButton, endBattleButton },
  {
    startRun,
    endRun: () => {
      finishRun({ showResult: Boolean(resultScreen) });
      particleEffects.reset();
      if (!resultScreen) lineUpActorPositions(actors, world);
    },
  }
);
bindTouchControls(keys, pressed);
bindCollapsibleSections();
bindResultScreen();
renderSettingsRankingList();
const tuningPanel = createTuningPanel({
  canvas,
  ctx,
  actors,
  effectAssets,
  playerActor,
  getSelectedActor: () => selectedActor,
  setSelectedActor: (actor) => {
    selectedActor = actor;
  },
  getSceneSession: () => sceneSession,
  saveState,
  uploadSettings: uploadSettingsToFirebase,
  downloadSettings: downloadSettingsFromFirebase,
  refreshClipSettings: refreshClipAndUploadSettings,
});
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
  captureActorMotionStart();

  if (playerDeathPending) {
    updatePlayerDeathSequence(dt);
    return;
  }

  if (resultOpen) {
    updateResultScene(dt);
    return;
  }

  if (!battleActive) {
    playerActor.player.update(dt, keys, pressed, world);
    actors.slice(1).forEach((actor) => {
      actor.player.animTime += dt;
      actor.player.vx = 0;
      actor.player.vy = 0;
      actor.player.attackTime = Math.min(actor.player.attackTime, 0);
      actor.player.updateState();
    });
    updateRollGhosts(actors, dt);
    particleEffects.emitDust(dt);
    particleEffects.update(dt);
    return;
  }

  runSurvivalTime += dt;

  updateBattleActorMotion({
    actors,
    playerActor,
    keys,
    pressed,
    world,
    dt,
  });

  resolveCombat({
    actors,
    playerActor,
    world,
    particleEffects,
    onPlayerDeath: beginPlayerDeath,
    onPlayerKill: () => {
      runKills += 1;
    },
  });

  maintainEnemyFlow({ actors, playerActor, world, particleEffects });
  updateRollGhosts(actors, dt);
  particleEffects.emitDust(dt);
  particleEffects.update(dt);
}

function captureActorMotionStart() {
  actors.forEach((actor) => {
    actor.previousOnGround = actor.player.onGround;
    actor.previousVy = actor.player.vy;
  });
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
  const player = playerActor.player;
  deathSequenceTime += dt;
  player.animTime += dt;
  player.stateTime += dt;
  player.y = world.floorY;
  player.vx = 0;
  player.vy = 0;
  player.updateState();

  actors.slice(1).forEach((actor) => {
    actor.player.animTime += dt;
    actor.player.vx = 0;
    actor.player.vy = 0;
    actor.player.attackTime = Math.min(actor.player.attackTime, 0);
    actor.player.updateState();
  });

  updateRollGhosts(actors, dt);
  particleEffects.update(dt);

  if (deathSequenceTime >= DEATH_RESULT_DELAY) {
    playerDeathPending = false;
    finishRun({ showResult: true });
  }
}

function updateResultScene(dt) {
  const player = playerActor.player;
  player.animTime += dt;
  player.stateTime += dt;
  player.dead = true;
  player.vx = 0;
  player.vy = 0;
  player.y = world.floorY;
  player.updateState();

  actors.slice(1).forEach((actor) => {
    actor.player.animTime += dt;
    actor.player.vx = 0;
    actor.player.vy = 0;
    actor.player.updateState();
  });

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
  const view = getViewTransform({
    world,
    playerActor,
    selectedActor,
    particleEffects,
    playerDeathPending,
    resultOpen,
    isEditPanelOpen: isSettingsPanelOpen(),
    hasActiveEditPart: Boolean(tuningPanel.activeEditPartKey()),
  });
  drawWorld(ctx, world, view, sceneSession);

  ctx.save();
  applyWorldView(ctx, world, view);
  particleEffects.drawDust();
  actors.forEach((actor) => drawRollGhosts(ctx, actor));
  actors.forEach((actor) =>
    drawActor(ctx, world, actor, {
      selectedActor,
      activeEditPartKey: tuningPanel.activeEditPartKey,
      activeEditPartKeys: tuningPanel.activeEditPartKeys,
    })
  );
  particleEffects.drawHitSparks();
  particleEffects.drawDeathParticles();
  actors.forEach((actor) => drawAttackTrail(ctx, actor, effectAssets));

  tuningPanel.drawSettingsDebugBoxes();
  ctx.restore();
  drawSceneForeground(ctx, world, view, sceneSession.background);

  tuningPanel.renderEditHandles();

  syncRunHud();
  if (!settingsRankingList && !isFullStage) drawRankingHud(ctx, { rankings, battleActive, lastRecordedScore });
}

function getRunScore() {
  return calculateRunScore(runSurvivalTime, runKills);
}

function syncRunHud() {
  syncRunHudView({ survivalTime: runSurvivalTime, kills: runKills, hudSurvivalTime, hudKills });
}

function startRun() {
  hideResultScreen();
  lineUpActorPositions(actors, world);
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
  placeEnemyActorsAhead(actors, playerActor, world);
  hideStartScreen();
  if (startBattleButton) startBattleButton.disabled = true;
  if (homeStartButton) homeStartButton.disabled = true;
  if (endBattleButton) endBattleButton.disabled = false;
  document.activeElement?.blur();
}

function hideStartScreen() {
  startScreen?.classList.add('is-hidden');
}

function showStartScreen() {
  if (!startScreen) return;

  startScreen.classList.remove('is-hidden');
}

function bindResultScreen() {
  bindResultScreenControls(
    { retryRunButton, rankingForm, rankingName, rankingMessage },
    {
      startRun,
      recordRanking: (name, message) => recordRanking(lastRecordedScore, runSurvivalTime, runKills, name, message),
      renderRankingList,
      renderSettingsRankingList,
    }
  );
}

function showResultScreen() {
  resultOpen = showResultScreenView(
    { resultScreen, resultScore, resultSurvival, resultKills, rankingName, rankingMessage, rankingForm, rankingList },
    { score: lastRecordedScore, survivalTime: runSurvivalTime, kills: runKills, rankings },
    { hideStartScreen, showStartScreen }
  );
}

function hideResultScreen() {
  resultOpen = hideResultScreenView(resultScreen);
}

function renderRankingList() {
  renderRankingListView(rankingList, rankings);
}

function renderSettingsRankingList() {
  renderSettingsRankingListView(settingsRankingList, rankings, deleteRankingAt);
}

function deleteRankingAt(index) {
  rankings.splice(index, 1);
  saveRankings();
  renderSettingsRankingList();
  renderRankingList();
}

bindSettingsRankingToggle(settingsRankingPanel, settingsRankingToggle);

function saveState() {
  syncSceneWorldBeforeSave(sceneSession, world);
  sceneSessions[sceneSession.id] = sceneSession;
  activeSceneSessionId = sceneSession.id;
  saveGameState({ actors, activeSessionId: activeSceneSessionId, sessions: sceneSessions });
}

async function uploadSettingsToFirebase() {
  syncSceneWorldBeforeSave(sceneSession, world);
  sceneSessions[sceneSession.id] = sceneSession;
  activeSceneSessionId = sceneSession.id;
  return uploadSavedStateToFirebase({ actors, activeSessionId: activeSceneSessionId, sessions: sceneSessions });
}

async function downloadSettingsFromFirebase() {
  const downloaded = await downloadSavedStateFromFirebase();
  if (downloaded) window.location.reload();
  return downloaded;
}

async function refreshClipAndUploadSettings({ clipFile = null } = {}) {
  const refreshed = await refreshClipBackground({
    getSceneSession: () => sceneSession,
    onUpdate: preloadSceneBackground,
    force: true,
    clipFile,
  });
  if (!refreshed) return false;

  const uploadedAssets = await uploadSceneClipAssetsToFirebase(sceneSession.background);
  if (!uploadedAssets) return false;

  preloadSceneBackground(sceneSession.background);
  return uploadSettingsToFirebase();
}

function saveRankings() {
  saveStoredRankings(rankings);
}

function recordRanking(score, survivalTime = 0, kills = 0, name = playerActor.name || '주인공', message = '') {
  rankings = recordRankingEntry(rankings, score, survivalTime, kills, name, message);
}
