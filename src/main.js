import { PuppetPlayer } from './puppetPlayer.js';
import { drawAttackTrail } from './actorEffectsRenderer.js';
import { drawActor } from './actorRenderer.js';
import { defaultTuningFor } from './actorTuning.js';
import { lineUpActors as lineUpActorPositions, placeEnemiesAhead as placeEnemyActorsAhead } from './actorPlacement.js';
import { resetPlayerActionState, updatePostRollInvulnerability } from './actorState.js';
import { loadCharacterAssets, loadEffectAssets } from './assetLoaders.js';
import { attackBoxOverlapsHitbox } from './combatGeometry.js';
import { bindBattleControls, bindCollapsibleSections, bindTouchControls } from './inputControls.js';
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
import { loadSavedState as loadStoredSavedState, saveActorState } from './saveStateStorage.js';
import { mergeTuning } from './tuningNormalize.js';
import { applyWorldView, drawWorld } from './worldRenderer.js';
import { getCameraX, getViewTransform } from './cameraView.js';
import { isSettingsPanelOpen } from './settingsPanelState.js';
import { isTextInput } from './tuningPanelBindings.js';
import { createTuningPanel } from './tuningPanel.js';
import { ACTOR_DEFS, DEATH_RESULT_DELAY, GAME_KEYS } from './gameConfig.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const isFullStage = document.body.classList.contains('full-stage');
const keys = new Set();
const pressed = new Set();

const savedState = loadStoredSavedState();
const world = { gravity: 1800, floorY: 430, minX: 80, maxX: Infinity, viewW: 960, viewH: 540 };
syncCanvasToLayout();
const actors = await createActors(savedState);
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

window.addEventListener('resize', () => syncCanvasToLayout(true));
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
  saveState,
});
requestAnimationFrame(loop);

function syncCanvasToLayout(adjustActors = false) {
  if (!isFullStage) {
    world.viewW = canvas.width;
    world.viewH = canvas.height;
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width || window.innerWidth || world.viewW));
  const height = Math.max(320, Math.round(rect.height || window.innerHeight || world.viewH));
  const previousFloorY = world.floorY;
  const nextFloorY = height - 110;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  world.viewW = width;
  world.viewH = height;
  world.floorY = nextFloorY;

  if (!adjustActors) return;

  const floorDelta = nextFloorY - previousFloorY;
  actors.forEach((actor) => {
    if (actor.player.onGround || actor.player.y >= previousFloorY - 1) actor.player.y = nextFloorY;
    else actor.player.y += floorDelta;
  });
}

addEventListener(
  'keydown',
  (e) => {
    if (tuningPanel.handleKeyboardShortcut(e)) return;
    if (e.metaKey || e.ctrlKey) return;
    if (!GAME_KEYS.has(e.code)) return;
    if (isTextInput(e.target) && !isSettingsPanelTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  },
  true
);

addEventListener(
  'keyup',
  (e) => {
    if (e.metaKey || e.ctrlKey) return;
    if (!GAME_KEYS.has(e.code)) return;
    if (isTextInput(e.target) && !isSettingsPanelTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    keys.delete(e.code);
  },
  true
);

function isSettingsPanelTarget(target) {
  return Boolean(target?.closest?.('#tuningPanel'));
}

async function createActors(saved) {
  const created = [];

  for (const def of ACTOR_DEFS) {
    const assets = await loadCharacterAssets(def.folder);
    const tuning = mergeTuning(defaultTuningFor(def), saved?.actors?.[def.id]?.tuning);
    const actor = {
      ...def,
      hp: 100,
      maxHpPips: tuning.maxHpPips,
      hpPips: tuning.maxHpPips,
      respawning: false,
      respawnTargetX: def.x,
      invulnTime: 0,
      wasRolling: false,
      hurtCooldown: 0,
      hitStun: 0,
      rollGhosts: [],
      rollGhostTimer: 0,
      lastHitSerials: {},
      tuning,
      player: new PuppetPlayer(def.x, world.floorY, assets),
    };

    actor.name = saved?.actors?.[def.id]?.name || def.name;
    actor.player.applyTuning(actor.tuning);
    actor.player.debugHitbox = false;
    created.push(actor);
  }

  return created;
}

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

  actors.forEach((actor) => {
    actor.hurtCooldown = Math.max(0, actor.hurtCooldown - dt);
    actor.hitStun = Math.max(0, actor.hitStun - dt);
    actor.invulnTime = Math.max(0, actor.invulnTime - dt);
  });

  if (playerActor.hitStun > 0) updateStunnedActor(playerActor, dt);
  else playerActor.player.update(dt, keys, pressed, world);
  updatePostRollInvulnerability(playerActor);

  actors.slice(1).forEach((actor) => {
    if (actor.respawning) updateRespawningEnemy(actor, dt);
    else if (actor.hitStun > 0) updateStunnedActor(actor, dt);
    else actor.player.updateNpc(dt, playerActor.player, world);
    updatePostRollInvulnerability(actor);
  });

  resolveCombat();
  maintainEnemyFlow();
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

function updateStunnedActor(actor, dt) {
  const player = actor.player;
  player.hurtTime = Math.max(player.hurtTime || 0, actor.hitStun);
  player.animTime += dt;
  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.vx *= 0.88;
  player.x = Math.max(world.minX, Math.min(world.maxX, player.x));

  if (player.y >= world.floorY) {
    player.y = world.floorY;
    player.vy = 0;
    player.onGround = true;
  }

  player.attackTime -= dt;
  player.dashTime -= dt;
  player.dashCooldown -= dt;
  player.attackCooldown -= dt;
  player.jumpHoldTime = 0;
  player.glideActive = false;
  player.updateState();
}

function updateRespawningEnemy(actor, dt) {
  const player = actor.player;
  const direction = Math.sign(actor.respawnTargetX - player.x) || 1;
  player.animTime += dt;
  player.facing = direction;
  player.vx = direction * Math.max(95, player.speed * 0.72);
  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.attackTime = 0;
  player.dashTime = 0;
  player.attackCooldown = 0;
  resetPlayerActionState(player);
  player.dashCooldown = 0;

  if (player.y >= world.floorY) {
    player.y = world.floorY;
    player.vy = 0;
    player.onGround = true;
  }

  if ((direction > 0 && player.x >= actor.respawnTargetX) || (direction < 0 && player.x <= actor.respawnTargetX)) {
    actor.respawning = false;
    player.x = actor.respawnTargetX;
    player.x = Math.max(world.minX, Math.min(world.maxX, player.x));
    player.vx = 0;
    player.facing = actor.respawnTargetX < playerActor.player.x ? 1 : -1;
    player.aiTimer = 0.3;
  }

  player.updateState();
}

function resolveCombat() {
  actors.forEach((attacker) => {
    if (attacker.respawning) return;
    const box = attacker.player.attackBox;
    if (!box) return;

    actors.forEach((target) => {
      if (
        target === attacker ||
        target.respawning ||
        target.hurtCooldown > 0 ||
        target.invulnTime > 0 ||
        target.player.isRolling
      ) {
        return;
      }
      if (target.lastHitSerials[attacker.id] === attacker.player.attackSerial) return;
      if (!attackBoxOverlapsHitbox(box, target.player.hitbox)) return;

      const comboStep = attacker.player.comboStep || 1;
      target.lastHitSerials[attacker.id] = attacker.player.attackSerial;
      if (target.player.isGuarding) {
        const broken = target.player.registerGuardBlock();
        particleEffects.triggerGuardImpact(attacker, target, broken);
        return;
      }
      const removed = applyHitDamage(attacker, target, comboStep);
      if (removed) return;

      const attackKey = attacker.player.poseKey === 'jumpAttack' ? 'jumpAttack' : `attack${comboStep}`;
      const reaction = attacker.tuning.attackBoxes[attackKey] || attacker.tuning.attackBoxes.attack1;
      target.hurtCooldown = Math.max(0.18, reaction.stun);
      target.hitStun = reaction.stun;
      target.invulnTime = Math.max(target.invulnTime, target.tuning.invulnerability.hurt);
      target.player.hurtTime = reaction.stun;
      target.player.vx = attacker.player.facing * reaction.knockbackX;
      target.player.vy = -reaction.knockbackY;
      target.player.onGround = false;
      particleEffects.triggerHitImpact(attacker, target, comboStep);
    });
  });
}

function applyHitDamage(attacker, target, comboStep) {
  target.hpPips = Math.max(0, target.hpPips - 1);
  if (target.hpPips > 0) return false;

  if (target.id === 'player') {
    beginPlayerDeath();
    return true;
  }

  if (attacker.id === 'player') runKills += 1;
  const attackKey = attacker.player.poseKey === 'jumpAttack' ? 'jumpAttack' : `attack${comboStep}`;
  const reaction = attacker.tuning.attackBoxes[attackKey] || attacker.tuning.attackBoxes.attack1;
  particleEffects.triggerHitImpact(attacker, target, comboStep, true);
  queueEnemyRespawn(target, true, {
    x: attacker.player.facing * Number(reaction.knockbackX || 0),
    y: -Number(reaction.knockbackY || 0),
    power: Number(reaction.deathBurst ?? 1),
  });
  return true;
}

function queueEnemyRespawn(actor, withDeathBurst = true, deathBurst = actor.player.facing) {
  const fromLeft = false;
  if (withDeathBurst) particleEffects.spawnEnemyDeathBurst(actor, deathBurst);
  actor.hpPips = actor.maxHpPips;
  actor.hurtCooldown = 0;
  actor.hitStun = 0;
  actor.respawning = true;
  actor.invulnTime = 0;
  actor.wasRolling = false;
  const cameraX = getCameraX(playerActor, world);
  actor.respawnTargetX = fromLeft
    ? Math.max(world.minX + 40, cameraX + 120 + Math.random() * 150)
    : cameraX + world.viewW - 220 + Math.random() * 220;
  actor.lastHitSerials = {};
  actor.rollGhosts = [];
  actor.rollGhostTimer = 0;
  actor.player.x = fromLeft ? cameraX - 90 : cameraX + world.viewW + 140;
  actor.player.y = world.floorY;
  actor.player.vx = 0;
  actor.player.vy = 0;
  actor.player.facing = fromLeft ? 1 : -1;
  actor.player.attackTime = 0;
  actor.player.dashTime = 0;
  actor.player.dashCooldown = 0;
  actor.player.attackCooldown = 0;
  actor.player.attackCarrySpeed = 0;
  actor.player.airFlapCooldownTime = 0;
  actor.player.hurtTime = 0;
  resetPlayerActionState(actor.player);
  actor.player.onGround = true;
  actor.player.updateState();
}

function maintainEnemyFlow() {
  const cameraX = getCameraX(playerActor, world);
  actors.slice(1).forEach((actor) => {
    if (actor.respawning) return;
    if (actor.player.x < cameraX - 360) queueEnemyRespawn(actor, false);
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
  drawWorld(ctx, world, view);

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
  saveActorState(actors);
}

function saveRankings() {
  saveStoredRankings(rankings);
}

function recordRanking(score, survivalTime = 0, kills = 0, name = playerActor.name || '주인공', message = '') {
  rankings = recordRankingEntry(rankings, score, survivalTime, kills, name, message);
}
