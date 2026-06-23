import { DEFAULT_PLAYER_TUNING, PuppetPlayer } from './puppetPlayer.js';
import {
  defaultEffectImageKey,
  defaultEffectSize,
  effectFrameValue,
  frameValue,
  interpolateEffectFrameValues,
  interpolateFrameValues,
  syncFrameAliases,
} from './animationFrames.js';
import { loadCharacterAssets, loadEffectAssets } from './assetLoaders.js';
import { attackBoxOverlapsHitbox } from './combatGeometry.js';
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
import { createParticleEffects } from './particleEffects.js';
import { loadSavedState as loadStoredSavedState, saveActorState } from './saveStateStorage.js';
import { formatSurvivalTime } from './scoreFormat.js';
import {
  ensureEffectOffset,
  ensureEffectSettings,
  ensurePoseOffset,
  ensurePoseSettings,
  makePoseKeyframeId,
  mergeTuning,
  normalizeEffectKeyframes,
  normalizeEffectOffsets,
  normalizePoseFrameValue,
  poseKeyframesFor,
  replaceObject,
  sortPoseKeyframes,
} from './tuningNormalize.js';
import {
  addScreenVector,
  axisFromCanvasMatrix,
  distanceToSegment,
  normalizeScreenVector,
  transformCanvasPoint,
} from './screenGeometry.js';
import { clamp, clone, setPath } from './utils.js';
import {
  bindNumberDragInput,
  clampPlaybackRateInput,
  enhanceNumberInputs,
  stepTimelineDurationValue,
} from './tuningNumberInputs.js';
import {
  bindCanvasDragControls,
  bindEffectTimelineControls,
  bindLayerOrderControls,
  bindPanelKeyboardShortcuts,
  bindPanelShellControls,
  bindPoseTimelineControls,
  bindSectionToggle,
  bindSelectionControls,
  isTextInput,
} from './tuningPanelBindings.js';
import { previewTimeoutMs, timelineDurationFromFrames, timelineFrameCount } from './tuningPlayback.js';
import {
  effectPropertyGroups,
  groupPosePropertyGroups,
  partPropertyGroups,
  posePropertyGroups,
} from './tuningFieldGroups.js';
import {
  partSizeFromPercent,
  partSizeToPercent,
  poseSizeOffsetFromPercent,
  poseSizeToPercent,
} from './tuningFieldValues.js';
import {
  bindPartPickerButtons,
  emptyPartMessage,
  getTuningPanelElements,
  markPartPicker,
  populateTuningPanelSelects,
  renderEffectImagePreview,
  renderLayerSelectOptions,
  syncNumericFields,
} from './tuningPanelDom.js';
import { isMasterPart, partLabel } from './tuningLabels.js';
import {
  controlGroupPartKeys,
  effectFieldLimits,
  imagePartKeys,
  partFieldLimits,
  partPositionSources,
  poseFieldLimits,
  poseMotionGroups,
} from './tuningParts.js';
import {
  appendTimelineKeyframes,
  bindTimelineKeyframeDrag,
  isEmptyEditableSlot,
  renderTimelineSlots,
  selectedOrFirstEmptySlot,
  syncTimelineToolbar,
  syncTimelinePlaybackControls,
  timelinePointerT as getTimelinePointerT,
  timelineSlotToLeft,
  timelineSlotToT,
  timelineTToSlot,
} from './tuningTimelineDom.js';
import { renderScrubGroups } from './tuningScrubControls.js';
import {
  ACTOR_DEFS,
  DEATH_RESULT_DELAY,
  GAME_KEYS,
  KILL_SCORE,
  KILL_SCORE_WEIGHT,
  MASTER_PART_KEY,
  POSE_MAX_FRAMES,
  POSE_MIN_FRAMES,
  POSE_PART_KEYS,
  SURVIVAL_SCORE_PER_SECOND,
  SURVIVAL_SCORE_WEIGHT,
  TUNING_FIELDS,
} from './gameConfig.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const isFullStage = document.body.classList.contains('full-stage');
const keys = new Set();
const pressed = new Set();

const MOVE_HANDLE_RADIUS = 28;
const ANCHOR_HANDLE_RADIUS = 8;
const HANDLE_LINE_GAP = 6;
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
let editFocusPartKey = null;
let editFocusContext = null;
let editHandleHover = null;
let editHandleActiveMode = null;
let activePartKeyGlobal = null;
let selectedPosePartKeysGlobal = new Set();
let groupEditValues = { x: 0, y: 0, rot: 0, scale: 100, opacity: 1, anchorX: null, anchorY: null };
let undoTuningChangeGlobal = null;
let poseFrameCopyGlobal = null;
let poseFramePasteGlobal = null;
let poseFrameSelectionActive = false;
let effectEditHandle = null;

window.addEventListener('resize', () => syncCanvasToLayout(true));
lineUpActors();
bindBattleControls();
bindTouchControls();
bindCollapsibleSections();
bindResultScreen();
renderSettingsRankingList();
buildTuningPanel();
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
    if ((e.metaKey || e.ctrlKey) && panelOpenForEdit() && !isTextInput(e.target)) {
      if (e.code === 'KeyZ') {
        e.preventDefault();
        e.stopPropagation();
        undoTuningChangeGlobal?.();
        return;
      }
      if (e.code === 'KeyC') {
        e.preventDefault();
        e.stopPropagation();
        poseFrameCopyGlobal?.();
        return;
      }
      if (e.code === 'KeyV') {
        e.preventDefault();
        e.stopPropagation();
        poseFramePasteGlobal?.();
        return;
      }
    }
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
    updateRollGhosts(dt);
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
  updateRollGhosts(dt);
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

function resetPlayerActionState(player) {
  player.attackTime = 0;
  player.jumpAttackTime = 0;
  player.dashTime = 0;
  player.attackCooldown = 0;
  player.attackCarrySpeed = 0;
  player.hurtTime = 0;
  player.guardActive = false;
  player.guardHits = 0;
  player.guardBlockTime = 0;
  player.guardBreakTime = 0;
  player.guardLockedUntilRelease = false;
}

function updatePostRollInvulnerability(actor) {
  const isRolling = actor.player.isRolling;
  if (actor.wasRolling && !isRolling) {
    actor.invulnTime = Math.max(actor.invulnTime, actor.tuning.invulnerability.rollEnd);
  }
  actor.wasRolling = isRolling;
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
  const cameraX = getCameraX();
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
  const cameraX = getCameraX();
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

  updateRollGhosts(dt);
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
  const view = getViewTransform();
  drawWorld(view);

  ctx.save();
  applyWorldView(view);
  particleEffects.drawDust();
  actors.forEach(drawRollGhosts);
  actors.forEach(drawActor);
  particleEffects.drawHitSparks();
  particleEffects.drawDeathParticles();
  actors.forEach(drawAttackTrail);

  drawSettingsDebugBoxes();
  ctx.restore();

  drawEditHandles();

  syncRunHud();
  if (!settingsRankingList && !isFullStage) drawRankingHud();
}

function getRunScore() {
  const survivalScore = runSurvivalTime * SURVIVAL_SCORE_PER_SECOND * SURVIVAL_SCORE_WEIGHT;
  const killScore = runKills * KILL_SCORE * KILL_SCORE_WEIGHT;
  return Math.max(0, Math.round(survivalScore + killScore));
}

function syncRunHud() {
  if (hudSurvivalTime) hudSurvivalTime.textContent = formatSurvivalTime(runSurvivalTime);
  if (hudKills) hudKills.textContent = `${runKills}`;
}

function getCameraX() {
  const target = playerActor.player.x - world.viewW / 2;
  return Math.max(0, target);
}

function getViewTransform() {
  if (playerDeathPending || resultOpen) {
    const shake = particleEffects.getScreenShakeOffset();
    return {
      zoom: 1.72,
      focusX: playerActor.player.x - shake.x,
      focusY: playerActor.player.y - 72 - shake.y,
    };
  }

  const zoom = getEditZoom();
  const shake = particleEffects.getScreenShakeOffset();
  if (zoom > 1) {
    return {
      zoom,
      focusX: selectedActor.player.x - shake.x,
      focusY: selectedActor.player.y - 88 - shake.y,
    };
  }

  return {
    zoom: 1,
    focusX: getCameraX() + world.viewW / 2 - shake.x,
    focusY: getCameraY() - shake.y,
  };
}

function getCameraY() {
  return clamp(playerActor.player.y - 120, world.viewH * 0.35, world.floorY - 120);
}

function getEditZoom() {
  const hasPartSelection = Boolean(activeEditPartKey());
  return panelOpenForEdit() && hasPartSelection ? 1.85 : 1;
}

function panelOpenForEdit() {
  const panel = document.querySelector('#tuningPanel');
  return panel?.classList.contains('is-open');
}

function activeEditPartKey() {
  if (currentOpenEditContext() === 'effect') return 'effect';
  if (!currentOpenEditContext()) return null;
  return editFocusPartKey;
}

function activeEditPartKeys() {
  if (!currentOpenEditContext()) return [];
  if (editFocusContext === 'pose' && selectedPosePartKeysGlobal.size > 1) {
    return [...selectedPosePartKeysGlobal];
  }
  return editFocusPartKey ? [editFocusPartKey] : [];
}

function resetGroupEditValues() {
  groupEditValues = { x: 0, y: 0, rot: 0, scale: 100, opacity: 1, anchorX: null, anchorY: null };
}

function resetGroupTransformValues() {
  groupEditValues.x = 0;
  groupEditValues.y = 0;
  groupEditValues.rot = 0;
  groupEditValues.scale = 100;
}

function currentOpenEditContext() {
  const panel = document.querySelector('#tuningPanel');
  if (!panel?.classList.contains('is-open')) return null;
  const partSection = panel.querySelector('[data-section="part"]');
  const poseSection = panel.querySelector('[data-section="pose"]');
  const effectSection = panel.querySelector('[data-section="effect"]');
  if (effectSection?.classList.contains('is-open')) return 'effect';
  if (editFocusContext === 'part' && partSection?.classList.contains('is-open') && activePartKeyGlobal) return 'part';
  if (editFocusContext === 'pose' && poseSection?.classList.contains('is-open')) return 'pose';
  return null;
}

function applyWorldView(view) {
  ctx.translate(world.viewW / 2, world.viewH / 2);
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-view.focusX, -view.focusY);
}

function updateRollGhosts(dt) {
  actors.forEach((actor) => {
    actor.rollGhosts = actor.rollGhosts
      .map((ghost) => ({ ...ghost, life: ghost.life - dt }))
      .filter((ghost) => ghost.life > 0);

    if (!actor.player.isRolling) {
      actor.rollGhostTimer = 0;
      return;
    }

    actor.rollGhostTimer -= dt;
    if (actor.rollGhostTimer > 0) return;

    actor.rollGhostTimer = 0.035;
    actor.rollGhosts.unshift({
      x: actor.player.x,
      y: actor.player.y,
      facing: actor.player.facing,
      dashTime: actor.player.dashTime,
      life: 0.18,
      maxLife: 0.18,
    });

    actor.rollGhosts.length = Math.min(actor.rollGhosts.length, 5);
  });
}

function drawRollGhosts(actor) {
  if (!actor.rollGhosts.length) return;

  const player = actor.player;
  const snapshot = {
    x: player.x,
    y: player.y,
    facing: player.facing,
    dashTime: player.dashTime,
    state: player.state,
    anchorDebugPart: player.anchorDebugPart,
  };

  player.anchorDebugPart = null;
  actor.rollGhosts
    .slice()
    .reverse()
    .forEach((ghost, index) => {
      const alpha = Math.max(0, ghost.life / ghost.maxLife) * (0.16 + index * 0.025);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.filter = 'brightness(1.55) saturate(0.35)';
      player.x = ghost.x;
      player.y = ghost.y;
      player.facing = ghost.facing;
      player.dashTime = ghost.dashTime;
      player.state = 'roll';
      player.draw(ctx);
      ctx.restore();
    });

  player.x = snapshot.x;
  player.y = snapshot.y;
  player.facing = snapshot.facing;
  player.dashTime = snapshot.dashTime;
  player.state = snapshot.state;
  player.anchorDebugPart = snapshot.anchorDebugPart;
}

function drawWorld(view) {
  ctx.clearRect(0, 0, world.viewW, world.viewH);
  ctx.fillStyle = '#171720';
  ctx.fillRect(0, 0, world.viewW, world.viewH);

  const bounds = visibleWorldBounds(view);
  const startX = Math.floor(bounds.x / 80) * 80 - 80;
  const endX = bounds.x + bounds.w + 160;

  ctx.save();
  applyWorldView(view);
  ctx.fillStyle = '#222230';
  ctx.fillRect(bounds.x - 8, world.floorY, bounds.w + 16, 110);
  ctx.strokeStyle = '#55556a';
  ctx.beginPath();
  ctx.moveTo(bounds.x - 8, world.floorY);
  ctx.lineTo(bounds.x + bounds.w + 8, world.floorY);
  ctx.stroke();

  ctx.fillStyle = '#1a1d26';
  for (let x = startX + 40; x < endX; x += 80) {
    ctx.fillRect(x, world.floorY + 36, 44, 4);
  }
  ctx.restore();
}

function visibleWorldBounds(view) {
  const w = world.viewW / view.zoom;
  const h = world.viewH / view.zoom;
  return {
    x: view.focusX - w / 2,
    y: view.focusY - h / 2,
    w,
    h,
  };
}

function drawRankingHud() {
  const x = 724;
  const y = 48;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 11, 16, .64)';
  ctx.fillRect(x - 12, y - 26, 220, 174);
  ctx.fillStyle = '#f4f7fb';
  ctx.font = '14px sans-serif';
  ctx.fillText('생존 랭킹', x, y);

  const list = rankings.slice(0, 5);
  if (!list.length) {
    ctx.fillStyle = '#aeb6c7';
    ctx.fillText('아직 기록 없음', x, y + 24);
  } else {
    list.forEach((entry, index) => {
      const rowY = y + 24 + index * 28;
      ctx.fillStyle = index === 0 ? '#7cc3a2' : '#d9deec';
      const survivalTime = Number(entry.survivalTime ?? entry.distance ?? 0);
      const kills = Number(entry.kills || 0);
      ctx.fillText(`${index + 1}. ${entry.name} ${entry.score}점`, x, rowY);
      if (survivalTime || kills) {
        ctx.fillStyle = '#9fa7b8';
        ctx.fillText(`생존 ${formatSurvivalTime(survivalTime)} / 처치 ${kills}`, x + 18, rowY + 13);
      }
    });
  }

  if (!battleActive && lastRecordedScore > 0) {
    ctx.fillStyle = '#f0b35b';
    ctx.fillText(`방금 기록 ${lastRecordedScore}점`, x, y + 160);
  }
  ctx.restore();
}

function bindBattleControls() {
  startBattleButton?.addEventListener('click', startRun);
  homeStartButton?.addEventListener('click', startRun);

  endBattleButton?.addEventListener('click', () => {
    finishRun({ showResult: Boolean(resultScreen) });
    particleEffects.reset();
    if (!resultScreen) lineUpActors();
    endBattleButton.blur();
  });
}

function startRun() {
  hideResultScreen();
  lineUpActors();
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
  actors.forEach((actor) => {
    syncActorHealthCapacity(actor, true);
    actor.hp = 100;
    actor.hpPips = actor.maxHpPips;
    actor.respawning = false;
    actor.invulnTime = 0;
    actor.wasRolling = false;
    actor.hurtCooldown = 0;
    actor.hitStun = 0;
    actor.rollGhosts = [];
    actor.rollGhostTimer = 0;
    actor.lastHitSerials = {};
    actor.player.attackTime = 0;
    actor.player.dashTime = 0;
    actor.player.dashCooldown = 0;
    actor.player.jumpHoldTime = 0;
    actor.player.airFlapCooldownTime = 0;
    actor.player.glideTime = actor.player.glideTimeMax;
    actor.player.glideActive = false;
    actor.player.attackCooldown = 0;
    actor.player.attackCarrySpeed = 0;
    actor.player.hurtTime = 0;
    actor.player.dead = false;
    resetPlayerActionState(actor.player);
    actor.player.onGround = true;
  });
  placeEnemiesAhead();
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

function placeEnemiesAhead() {
  const startX = playerActor.player.x + 260;
  actors.slice(1).forEach((actor, index) => {
    syncActorHealthCapacity(actor, true);
    actor.respawning = false;
    actor.hpPips = actor.maxHpPips;
    actor.player.x = startX + index * 170;
    actor.respawnTargetX = actor.player.x;
    actor.player.y = world.floorY;
    actor.player.vx = 0;
    actor.player.vy = 0;
    actor.player.facing = -1;
    actor.player.hurtTime = 0;
    resetPlayerActionState(actor.player);
    actor.player.updateState();
  });
}

function bindTouchControls() {
  document.querySelectorAll('[data-hold-code]').forEach((button) => {
    const code = button.dataset.holdCode;
    const release = () => {
      keys.delete(code);
      button.classList.remove('is-pressed');
    };

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
      button.classList.add('is-pressed');
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  document.querySelectorAll('[data-tap-code]').forEach((button) => {
    const code = button.dataset.tapCode;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pressed.add(code);
      button.classList.add('is-pressed');
      setTimeout(() => button.classList.remove('is-pressed'), 120);
    });
  });
}

function bindCollapsibleSections() {
  document.querySelectorAll('[data-collapsible]').forEach((section) => {
    const button = section.querySelector('.section-toggle');
    button.addEventListener('click', () => {
      const isOpen = section.classList.toggle('is-open');
      section.dispatchEvent(new CustomEvent('sectiontoggle', { detail: { isOpen } }));
    });
  });
}

function lineUpActors() {
  const slots = [480, 610, 740, 870, 1000];
  actors.forEach((actor, index) => {
    syncActorHealthCapacity(actor, true);
    actor.hp = 100;
    actor.hpPips = actor.maxHpPips;
    actor.respawning = false;
    actor.invulnTime = 0;
    actor.wasRolling = false;
    actor.hurtCooldown = 0;
    actor.hitStun = 0;
    actor.rollGhosts = [];
    actor.rollGhostTimer = 0;
    actor.lastHitSerials = {};
    actor.player.x = slots[index];
    actor.respawnTargetX = actor.player.x;
    actor.player.y = world.floorY;
    actor.player.vx = 0;
    actor.player.vy = 0;
    actor.player.facing = index === 0 ? 1 : -1;
    actor.player.attackTime = 0;
    actor.player.dashTime = 0;
    actor.player.dashCooldown = 0;
    actor.player.jumpHoldTime = 0;
    actor.player.airFlapCooldownTime = 0;
    actor.player.glideTime = actor.player.glideTimeMax;
    actor.player.glideActive = false;
    actor.player.attackCooldown = 0;
    actor.player.attackCarrySpeed = 0;
    actor.player.hurtTime = 0;
    actor.player.dead = false;
    resetPlayerActionState(actor.player);
    actor.player.onGround = true;
    actor.player.updateState();
  });
}

function drawActor(actor) {
  drawShadow(actor);
  const flicker = actor.invulnTime > 0 && Math.floor(actor.invulnTime * 24) % 2 === 0;
  if (flicker) {
    ctx.save();
    ctx.globalAlpha = 0.46;
  }
  if (actor.hurtCooldown > 0) {
    ctx.save();
    ctx.filter = 'brightness(1.18) saturate(0.55)';
  }
  const previousGlowPart = actor.player.glowPart;
  const previousGlowParts = actor.player.glowParts;
  actor.player.glowPart = actor === selectedActor ? activeEditPartKey() : null;
  actor.player.glowParts = actor === selectedActor ? activeEditPartKeys() : [];
  actor.player.draw(ctx);
  actor.player.glowPart = previousGlowPart;
  actor.player.glowParts = previousGlowParts;
  drawSelectedPartGlow(actor);
  if (actor.hurtCooldown > 0) drawHitFlash(actor);
  if (actor.hurtCooldown > 0) ctx.restore();
  if (flicker) ctx.restore();

  const x = actor.player.x;
  const y = actor.player.hitbox.y - 24;
  const width = Math.max(72, actor.maxHpPips * 9);

  drawHealthMeter(actor, x, y - 16, width);
  ctx.fillStyle = actor.hurtCooldown > 0 ? '#fff' : actor.tint;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(actor.name, x, y - 22);
  ctx.textAlign = 'left';
}

function drawHealthMeter(actor, x, y, width) {
  if (actor.maxHpPips > 0) {
    const gap = actor.maxHpPips > 10 ? 2 : 4;
    const pipWidth = (width - gap * (actor.maxHpPips - 1)) / actor.maxHpPips;
    for (let index = 0; index < actor.maxHpPips; index += 1) {
      const px = x - width / 2 + index * (pipWidth + gap);
      ctx.fillStyle = 'rgba(0,0,0,.44)';
      ctx.fillRect(px, y, pipWidth, 7);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.strokeRect(px, y, pipWidth, 7);
      if (index < actor.hpPips) {
        ctx.fillStyle = actor.tint;
        ctx.fillRect(px + 1, y + 1, pipWidth - 2, 5);
      }
    }
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,.44)';
  ctx.fillRect(x - width / 2, y, width, 6);
  ctx.fillStyle = actor.tint;
  ctx.fillRect(x - width / 2, y, width * (actor.hp / 100), 6);
}

function drawSelectedPartGlow(actor) {
  if (actor !== selectedActor) return;
  const partKeys = activeEditPartKeys().filter(
    (partKey) =>
      partKey &&
      !isMasterPart(partKey) &&
      !imagePartKeys().includes(partKey) &&
      !controlGroupPartKeys().includes(partKey)
  );
  if (!partKeys.length) return;

  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(124, 195, 162, 0.98)';
  ctx.shadowColor = 'rgba(124, 195, 162, 0.95)';
  ctx.shadowBlur = 12;

  partKeys.forEach((partKey) => {
    const region = actor.player.hitRegions?.find((item) => item.key === partKey);
    if (!region) return;

    if (region.points?.length) {
      ctx.beginPath();
      region.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
    } else if (region.bounds) {
      const b = region.bounds;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  });

  ctx.restore();
}

function drawHitFlash(actor) {
  const pulse = 0.42 + Math.sin(actor.hurtCooldown * 80) * 0.12;

  ctx.save();
  ctx.globalAlpha *= pulse;
  ctx.filter =
    'brightness(0) saturate(1) invert(18%) sepia(97%) saturate(7480%) hue-rotate(357deg) brightness(118%) contrast(118%)';
  actor.player.draw(ctx);
  ctx.restore();
}

function drawAttackTrail(actor) {
  const player = actor.player;
  const active = activePlayerEffectAction(player);
  if (!active) return;

  const { key: effectKey, progress } = active;
  const config = effectFrameAt(actor.tuning, effectKey, progress);
  if (!config || config.image === 'none' || Number(config.opacity ?? 1) <= 0) return;
  const asset = effectAssets[config.image];
  if (!asset) return;

  const cx = player.x;
  const cy = player.y - 70;
  const width = Math.max(1, Number(config.w || defaultEffectSize(effectKey).w));
  const height = Math.max(1, Number(config.h || defaultEffectSize(effectKey).h));
  const flip = player.facing === 1 ? 1 : -1;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  ctx.translate(Number(config.x || 0), Number(config.y || 0));
  ctx.rotate((Number(config.rot || 0) * Math.PI) / 180);
  ctx.globalAlpha = clamp(Number(config.opacity ?? 1), 0, 1);
  ctx.drawImage(
    asset,
    -width / 2 - Number(config.anchorX || 0),
    -height / 2 - Number(config.anchorY || 0),
    width,
    height
  );
  ctx.restore();
}

function activePlayerEffectAction(player) {
  if (player.jumpAttackTime > 0) {
    return {
      key: 'jumpAttack',
      progress: clamp(player.jumpAttackProgress, 0, 1),
    };
  }

  if (player.attackTime > 0) {
    return {
      key: `attack${player.comboStep || 1}`,
      progress: clamp(player.attackProgress, 0, 1),
    };
  }

  return null;
}

function effectFrameAt(tuning, key, t = 0) {
  ensureEffectOffset(tuning, key);
  const effect = tuning.effectOffsets[key];
  const frame = interpolateEffectFrameValues(effectKeyframesFor(effect, key), clamp(Number(t), 0, 1), key);
  return {
    ...frame,
    image: defaultEffectImageKey(key),
  };
}

function effectKeyframesFor(effect, key) {
  effect.keyframes = normalizeEffectKeyframes(effect.keyframes, effect.start, effect.end, key);
  syncFrameAliases(effect);
  return effect.keyframes;
}

function drawShadow(actor) {
  const scale = actor.player.transform?.scale || 1;
  const master = actor.player.getPartOffset?.('master') || {};
  const anchorLift = Math.max(0, Number(master.y || 0) - Number(master.anchorY || 0));
  const airHeight = Math.max(0, world.floorY - actor.player.y + anchorLift);
  const heightScale = clamp(1 - airHeight / 280, 0.22, 1);
  const width = 54 * scale * heightScale;
  const height = 11 * scale * (0.62 + heightScale * 0.38);
  const alpha = 0.16 + heightScale * 0.18;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(actor.player.x, world.floorY + 3, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSettingsDebugBoxes() {
  if (!panelOpenForEdit()) return;

  if (isCollisionSectionOpen()) {
    drawBodyHitbox(selectedActor);
  }

  const attackKey = activeAttackSettingsKey();
  if (attackKey) {
    drawAttackHitboxPreview(selectedActor, attackKey);
  }

  const effectKey = activeEffectSettingsKey();
  if (effectKey) {
    drawEffectSettingsPreview(selectedActor, effectKey);
  }
}

function isCollisionSectionOpen() {
  return document.querySelector('[data-section="collision"]')?.classList.contains('is-open');
}

function activeAttackSettingsKey() {
  const poseSection = document.querySelector('[data-section="pose"]');
  const poseSelect = document.querySelector('#poseSelect');
  if (!poseSection?.classList.contains('is-open')) return null;
  const key = poseSelect?.value || '';
  return /^attack[123]$/.test(key) || key === 'jumpAttack' ? key : null;
}

function activeEffectSettingsKey() {
  const effectSection = document.querySelector('[data-section="effect"]');
  const effectSelect = document.querySelector('#effectSelect');
  if (!effectSection?.classList.contains('is-open')) return null;
  return effectSelect?.value || null;
}

function drawEffectSettingsPreview(actor, key) {
  effectEditHandle = null;
  const preview = actor.player.effectPreview;
  let t = Number.isFinite(preview?.t) ? preview.t : 0;
  if (preview?.key === key && preview.playing) {
    const settings = actor.tuning.effectSettings?.[key] || {};
    const duration = Math.max(
      0.05,
      Number(settings.duration || 0.3) / Math.max(0.1, Number(settings.playbackRate || 1))
    );
    const elapsed = (performance.now() - Number(preview.startedAt || performance.now())) / 1000;
    if (settings.playback === 'loop') {
      const cycle = (elapsed % (duration * 2)) / duration;
      t = cycle <= 1 ? cycle : 2 - cycle;
    } else {
      t = clamp(elapsed / duration, 0, 1);
    }
  }

  const frame = effectFrameAt(actor.tuning, key, t);
  if (!frame || frame.image === 'none' || Number(frame.opacity ?? 1) <= 0) return;

  const asset = effectAssets[frame.image];
  const width = Math.max(1, Number(frame.w || defaultEffectSize(key).w));
  const height = Math.max(1, Number(frame.h || defaultEffectSize(key).h));
  const cx = actor.player.x + Number(frame.x || 0);
  const cy = actor.player.y - 70 + Number(frame.y || 0);
  const anchorOffsetX = Number(frame.anchorX || 0);
  const anchorOffsetY = Number(frame.anchorY || 0);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((Number(frame.rot || 0) * Math.PI) / 180);
  recordEffectEditHandle(ctx, frame, key);
  ctx.globalAlpha = clamp(Number(frame.opacity ?? 1), 0, 1) * 0.88;
  if (asset) {
    ctx.drawImage(asset, -width / 2 - anchorOffsetX, -height / 2 - anchorOffsetY, width, height);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(124, 195, 162, .92)';
  ctx.fillStyle = 'rgba(124, 195, 162, .92)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - width / 2 - anchorOffsetX, cy - height / 2 - anchorOffsetY, width, height);
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function recordEffectEditHandle(ctx, frame, key) {
  const matrix = ctx.getTransform();
  const anchor = transformCanvasPoint(matrix, 0, 0);
  const xInfo = axisFromCanvasMatrix(matrix, anchor, 1, 0);
  const yInfo = axisFromCanvasMatrix(matrix, anchor, 0, 1);
  effectEditHandle = {
    key,
    frame,
    anchor,
    xAxis: xInfo.axis,
    yAxis: yInfo.axis,
    xUnit: xInfo.unit,
    yUnit: yInfo.unit,
    moveXAxis: xInfo.axis,
    moveYAxis: yInfo.axis,
    moveXUnit: xInfo.unit,
    moveYUnit: yInfo.unit,
  };
}

function drawBodyHitbox(actor) {
  const h = actor.player.hitbox;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 64, 64, 0.16)';
  ctx.strokeStyle = 'rgba(255, 92, 92, 0.95)';
  ctx.lineWidth = 2;
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.strokeRect(h.x, h.y, h.w, h.h);
  ctx.restore();
}

function drawAttackHitboxPreview(actor, key) {
  const box = actor.player.weaponAttackBox(actor.tuning.attackBoxes?.[key]);
  if (!box) return;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 224, 72, 0.18)';
  ctx.strokeStyle = 'rgba(255, 224, 72, 0.95)';
  ctx.lineWidth = 2;
  drawPolygon(box.points, true);
  drawPolygon(box.points, false);
  ctx.fillStyle = 'rgba(255, 244, 168, 0.95)';
  ctx.font = '12px sans-serif';
  ctx.fillText(key === 'jumpAttack' ? '점공' : key.replace('attack', '') + '타', box.x + 4, box.y - 6);
  ctx.restore();
}

function drawPolygon(points, fill = false) {
  if (!points?.length) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

function drawEditHandles() {
  const geometry = getEditHandleGeometry();
  if (!geometry) return;

  const { anchor, handles } = geometry;
  const activeMode = editHandleActiveMode || editHandleHover;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (handles.width)
    drawHandleArrow(
      handleLineStart(anchor, handles.width.point),
      handles.width.point,
      handleColor('width', activeMode)
    );
  if (handles.height)
    drawHandleArrow(
      handleLineStart(anchor, handles.height.point),
      handles.height.point,
      handleColor('height', activeMode)
    );
  if (handles.size)
    drawHandleArrow(handleLineStart(anchor, handles.size.point), handles.size.point, handleColor('size', activeMode));
  if (handles.rotate)
    drawHandleLine(
      handleLineStart(anchor, handles.rotate.point),
      handles.rotate.point,
      handleColor('rotate', activeMode)
    );
  if (handles.opacity)
    drawHandleLine(
      handleLineStart(anchor, handles.opacity.point),
      handles.opacity.point,
      handleColor('opacity', activeMode)
    );

  if (handles.rotate) drawHandleCircle(handles.rotate.point, 9, handleColor('rotate', activeMode), true);
  if (handles.opacity) drawHandleCircle(handles.opacity.point, 8, handleColor('opacity', activeMode), true);

  if (handles.move) drawHandleCircle(anchor, MOVE_HANDLE_RADIUS, handleColor('move', activeMode), false);
  if (handles.anchor) drawAnchorHandleDot(anchor, handleColor('anchor', activeMode));
  ctx.restore();
}

function handleLineStart(anchor, target) {
  const dx = target.x - anchor.x;
  const dy = target.y - anchor.y;
  const length = Math.hypot(dx, dy) || 1;
  const distance = MOVE_HANDLE_RADIUS + HANDLE_LINE_GAP;
  return {
    x: anchor.x + (dx / length) * distance,
    y: anchor.y + (dy / length) * distance,
  };
}

function handleColor(mode, activeMode) {
  const active = mode === activeMode;
  const colors = {
    move: active ? '#80e8ff' : '#31b7da',
    anchor: active ? '#d7fbff' : '#259fca',
    width: active ? '#ffe58c' : '#f2bc4d',
    height: active ? '#9cffc8' : '#55d88e',
    size: active ? '#ffb0e8' : '#df72c5',
    rotate: active ? '#bca6ff' : '#8f7bff',
    opacity: active ? '#ffb28a' : '#f47c58',
  };
  return {
    stroke: colors[mode] || '#f8fbff',
    shadow: active,
    width: active ? 3 : 2,
  };
}

function drawAnchorHandleDot(point, style) {
  ctx.save();
  ctx.fillStyle = style.stroke;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHandleLine(from, to, style) {
  ctx.save();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawHandleArrow(from, to, style) {
  drawHandleLine(from, to, style);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 10;
  ctx.save();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle - 0.62) * size, to.y - Math.sin(angle - 0.62) * size);
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle + 0.62) * size, to.y - Math.sin(angle + 0.62) * size);
  ctx.stroke();
  ctx.restore();
}

function drawHandleCircle(point, radius, style, fill) {
  ctx.save();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = 'rgba(12, 14, 20, 0.68)';
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

function getEditHandleGeometry() {
  if (!panelOpenForEdit()) return null;

  const effectGeometry = getEffectEditHandleGeometry();
  if (effectGeometry) return effectGeometry;

  if (!editFocusPartKey) return null;

  const groupGeometry = getGroupEditHandleGeometry();
  if (groupGeometry) return groupGeometry;

  const info = selectedActor.player.editHandles?.[editFocusPartKey];
  if (!info) return null;

  const isImagePart = imagePartKeys().includes(editFocusPartKey);
  const isMaster = isMasterPart(editFocusPartKey);
  const isScalablePart = isMaster || isImagePart || controlGroupPartKeys().includes(editFocusPartKey);
  const anchor = info.anchor;
  const xAxis = info.xAxis;
  const yAxis = info.yAxis;
  const moveXAxis = info.moveXAxis || xAxis;
  const moveYAxis = info.moveYAxis || yAxis;
  const up = { x: -yAxis.x, y: -yAxis.y };
  const left = { x: -xAxis.x, y: -xAxis.y };
  const sizeDir = normalizeScreenVector(xAxis.x + yAxis.x, xAxis.y + yAxis.y);
  const rotateDir = normalizeScreenVector(xAxis.x - yAxis.x, xAxis.y - yAxis.y);
  const opacityDir = normalizeScreenVector(-xAxis.x + yAxis.x, -xAxis.y + yAxis.y);

  const handles = {};
  if (!isMaster || poseFrameSelectionActive) {
    handles.move = { mode: 'move', point: anchor, radius: MOVE_HANDLE_RADIUS };
    handles.rotate = { mode: 'rotate', point: addScreenVector(anchor, rotateDir, 78), radius: 17 };
  }

  if (isScalablePart && (!isMaster || poseFrameSelectionActive)) {
    handles.width = { mode: 'width', point: addScreenVector(anchor, left, 70), radius: 18 };
    handles.height = { mode: 'height', point: addScreenVector(anchor, up, 70), radius: 18 };
    handles.size = { mode: 'size', point: addScreenVector(anchor, sizeDir, 78), radius: 18 };
    handles.opacity = { mode: 'opacity', point: addScreenVector(anchor, opacityDir, 78), radius: 17 };
  }

  if (
    (isMaster && !poseFrameSelectionActive) ||
    (!isMaster && (isImagePart || controlGroupPartKeys().includes(editFocusPartKey)))
  ) {
    handles.anchor = { mode: 'anchor', point: anchor, radius: ANCHOR_HANDLE_RADIUS };
  }

  return {
    anchor,
    xAxis,
    yAxis,
    xUnit: info.xUnit || 1,
    yUnit: info.yUnit || 1,
    moveXAxis,
    moveYAxis,
    moveXUnit: info.moveXUnit || info.xUnit || 1,
    moveYUnit: info.moveYUnit || info.yUnit || 1,
    isImagePart,
    isMaster,
    isScalablePart,
    handles,
  };
}

function getEffectEditHandleGeometry() {
  if (currentOpenEditContext() !== 'effect' || !effectEditHandle) return null;
  const info = effectEditHandle;
  const anchor = info.anchor;
  const xAxis = info.xAxis;
  const yAxis = info.yAxis;
  const up = { x: -yAxis.x, y: -yAxis.y };
  const left = { x: -xAxis.x, y: -xAxis.y };
  const sizeDir = normalizeScreenVector(xAxis.x + yAxis.x, xAxis.y + yAxis.y);
  const rotateDir = normalizeScreenVector(xAxis.x - yAxis.x, xAxis.y - yAxis.y);
  const opacityDir = normalizeScreenVector(-xAxis.x + yAxis.x, -xAxis.y + yAxis.y);
  return {
    isEffect: true,
    key: info.key,
    anchor,
    xAxis,
    yAxis,
    xUnit: info.xUnit || 1,
    yUnit: info.yUnit || 1,
    moveXAxis: info.moveXAxis,
    moveYAxis: info.moveYAxis,
    moveXUnit: info.moveXUnit || 1,
    moveYUnit: info.moveYUnit || 1,
    isImagePart: true,
    isMaster: false,
    isScalablePart: true,
    handles: {
      anchor: { mode: 'anchor', point: anchor, radius: ANCHOR_HANDLE_RADIUS },
      move: { mode: 'move', point: anchor, radius: MOVE_HANDLE_RADIUS },
      width: { mode: 'width', point: addScreenVector(anchor, left, 70), radius: 18 },
      height: { mode: 'height', point: addScreenVector(anchor, up, 70), radius: 18 },
      rotate: { mode: 'rotate', point: addScreenVector(anchor, rotateDir, 78), radius: 17 },
      size: { mode: 'size', point: addScreenVector(anchor, sizeDir, 78), radius: 18 },
      opacity: { mode: 'opacity', point: addScreenVector(anchor, opacityDir, 78), radius: 17 },
    },
  };
}

function getGroupEditHandleGeometry() {
  if (editFocusContext !== 'pose' || selectedPosePartKeysGlobal.size < 2 || !poseFrameSelectionActive) return null;
  const infos = [...selectedPosePartKeysGlobal].map((part) => selectedActor.player.editHandles?.[part]).filter(Boolean);
  if (infos.length < 2) return null;

  const defaultAnchor = groupBoundsCenter([...selectedPosePartKeysGlobal], infos);
  const anchor = {
    x: Number.isFinite(groupEditValues.anchorX) ? groupEditValues.anchorX : defaultAnchor.x,
    y: Number.isFinite(groupEditValues.anchorY) ? groupEditValues.anchorY : defaultAnchor.y,
  };
  const xAxis = { x: 1, y: 0 };
  const yAxis = { x: 0, y: 1 };
  const widthDir = normalizeScreenVector(-1, 0);
  const heightDir = normalizeScreenVector(0, -1);
  const sizeDir = normalizeScreenVector(1, 1);
  const rotateDir = normalizeScreenVector(1, -1);
  const opacityDir = normalizeScreenVector(-1, 1);
  return {
    isGroup: true,
    parts: infos.map((info) => info.key),
    anchor,
    xAxis,
    yAxis,
    xUnit: 1,
    yUnit: 1,
    moveXAxis: xAxis,
    moveYAxis: yAxis,
    moveXUnit: 1,
    moveYUnit: 1,
    isImagePart: false,
    isMaster: false,
    isScalablePart: false,
    handles: {
      anchor: { mode: 'anchor', point: anchor, radius: ANCHOR_HANDLE_RADIUS },
      move: { mode: 'move', point: anchor, radius: MOVE_HANDLE_RADIUS },
      width: { mode: 'width', point: addScreenVector(anchor, widthDir, 74), radius: 18 },
      height: { mode: 'height', point: addScreenVector(anchor, heightDir, 74), radius: 18 },
      rotate: { mode: 'rotate', point: addScreenVector(anchor, rotateDir, 82), radius: 17 },
      size: { mode: 'size', point: addScreenVector(anchor, sizeDir, 82), radius: 18 },
      opacity: { mode: 'opacity', point: addScreenVector(anchor, opacityDir, 82), radius: 17 },
    },
  };
}

function groupBoundsCenter(parts, fallbackInfos) {
  const bounds = parts
    .map((part) => selectedActor.player.hitRegions?.find((region) => region.key === part)?.bounds)
    .filter(Boolean);
  if (!bounds.length) {
    return {
      x: fallbackInfos.reduce((sum, info) => sum + info.anchor.x, 0) / fallbackInfos.length,
      y: fallbackInfos.reduce((sum, info) => sum + info.anchor.y, 0) / fallbackInfos.length,
    };
  }

  const left = Math.min(...bounds.map((bound) => bound.x));
  const top = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.w));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.h));
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
  };
}

function getEditHandleAt(point) {
  const geometry = getEditHandleGeometry();
  if (!geometry) return null;

  const anchorHandle = geometry.handles.anchor;
  if (
    anchorHandle &&
    Math.hypot(point.x - anchorHandle.point.x, point.y - anchorHandle.point.y) <= anchorHandle.radius
  ) {
    return { mode: anchorHandle.mode, geometry };
  }

  const moveHandle = geometry.handles.move;
  if (moveHandle && Math.hypot(point.x - moveHandle.point.x, point.y - moveHandle.point.y) <= moveHandle.radius) {
    return { mode: moveHandle.mode, geometry };
  }

  const priority = ['rotate', 'opacity', 'size', 'width', 'height'];
  for (const key of priority) {
    const handle = geometry.handles[key];
    if (!handle) continue;
    const distance = Math.hypot(point.x - handle.point.x, point.y - handle.point.y);
    if (distance <= handle.radius) return { mode: handle.mode, geometry };
    if (distanceToSegment(point, handleLineStart(geometry.anchor, handle.point), handle.point) <= 10) {
      return { mode: handle.mode, geometry };
    }
  }

  return null;
}

function buildTuningPanel() {
  const panel = document.querySelector('#tuningPanel');
  if (!panel) return;

  const {
    backdrop,
    openButton,
    closeButton,
    resetButton,
    actorSelect,
    actorName,
    partSection,
    poseSection,
    effectSection,
    partPicker,
    posePartPicker,
    partSelect,
    partFields,
    poseSelect,
    posePartSelect,
    posePartFields,
    poseDuration,
    posePlaybackRateRange,
    posePlaybackRate,
    poseFrameUp,
    poseFrameDown,
    posePlayback,
    posePlaybackMode,
    poseCopyFrame,
    posePasteFrame,
    poseUndoFrame,
    poseTimelineTrack,
    poseAddKeyframe,
    poseDeleteKeyframe,
    poseResetAnimation,
    effectSelect,
    effectImagePreview,
    effectFields,
    effectDuration,
    effectPlaybackRateRange,
    effectPlaybackRate,
    effectFrameUp,
    effectFrameDown,
    effectPlayback,
    effectPlaybackMode,
    effectCopyFrame,
    effectPasteFrame,
    effectUndoFrame,
    effectTimelineTrack,
    effectAddKeyframe,
    effectDeleteKeyframe,
    effectResetAnimation,
    layerOrder,
    layerUp,
    layerDown,
    motionRows,
  } = getTuningPanelElements(panel);
  let poseFrame = null;
  let selectedPoseSlot = null;
  let activePoseKeyframeId = null;
  let posePreviewPlaying = false;
  let posePreviewTimer = null;
  let copiedPoseFrame = null;
  let effectFrame = null;
  let selectedEffectSlot = null;
  let activeEffectKeyframeId = null;
  let effectPreviewPlaying = false;
  let effectPreviewTimer = null;
  let copiedEffectFrame = null;
  let editContext = 'part';
  let canvasDrag = null;
  let activePartKey = null;
  let activePosePartKey = null;
  const undoStack = [];
  let editSnapshotOpen = false;
  undoTuningChangeGlobal = undoTuningChange;
  poseFrameCopyGlobal = copyCurrentFrame;
  poseFramePasteGlobal = pasteCurrentFrame;

  function syncPanelToggle() {
    const isOpen = panel.classList.contains('is-open');
    openButton.classList.toggle('is-panel-open', isOpen);
    openButton.classList.toggle('is-flipped', isOpen);
    openButton.setAttribute('aria-expanded', String(isOpen));
    openButton.setAttribute('aria-label', isOpen ? '설정 접기' : '설정 열기');
  }

  const fields = TUNING_FIELDS;
  const scrubCallbacks = {
    beginChange: beginUndoSnapshot,
    commitChange: commitUndoSnapshot,
  };
  const bindNumberDrag = (number, peer, updateValue) =>
    bindNumberDragInput(number, peer, updateValue, {
      beginChange: beginUndoSnapshot,
      commitChange: commitUndoSnapshot,
    });

  populateTuningPanelSelects(
    { actorSelect, partSelect, poseSelect, posePartSelect, effectSelect },
    actors,
    selectedActor.tuning.rig
  );

  fields.forEach(([id, path]) => bindNumericControl(id, path));

  bindSelectionControls(
    { actorSelect, actorName, partSelect, poseSelect, effectSelect, posePartSelect },
    {
      onActorChange: handleActorChange,
      onActorNameInput: handleActorNameInput,
      onPartChange: handlePartChange,
      onPoseChange: handlePoseChange,
      onEffectChange: handleEffectChange,
      onPosePartChange: handlePosePartChange,
    }
  );

  bindPartPicker(partPicker, 'part');
  bindPartPicker(posePartPicker, 'pose');
  bindSectionToggle(
    partSection,
    () => {
      closeEditSection('pose');
      closeEditSection('effect');
    },
    () => clearPartSelection('part')
  );
  bindSectionToggle(
    poseSection,
    () => {
      closeEditSection('part');
      closeEditSection('effect');
      editContext = 'pose';
      editFocusContext = 'pose';
      editFocusPartKey = activePosePartKey || MASTER_PART_KEY;
      renderPosePartFields();
      syncAnchorDebugPart();
    },
    () => clearPartSelection('pose')
  );
  bindSectionToggle(
    effectSection,
    () => {
      closeEditSection('part');
      closeEditSection('pose');
      editContext = 'effect';
      editFocusContext = null;
      editFocusPartKey = null;
      ensureActiveEffectFrame();
      renderEffectFields();
      syncEffectPreview();
    },
    clearEffectSelection
  );
  bindPoseTimelineControls(
    {
      poseDuration,
      posePlaybackRateRange,
      posePlaybackRate,
      poseFrameUp,
      poseFrameDown,
      posePlayback,
      posePlaybackMode,
      poseCopyFrame,
      posePasteFrame,
      poseUndoFrame,
      poseAddKeyframe,
      poseDeleteKeyframe,
      poseResetAnimation,
    },
    {
      updatePoseSetting,
      bindNumberDrag,
      commitUndoSnapshot,
      updatePosePlaybackRate,
      stepPoseDuration,
      togglePosePlayback,
      togglePosePlaybackMode,
      copyActivePoseFrame,
      pasteActivePoseFrame,
      undoTuningChange,
      addPoseKeyframe,
      deletePoseKeyframe,
      resetCurrentPoseAnimation,
    }
  );
  bindEffectTimelineControls(
    {
      effectDuration,
      effectPlaybackRateRange,
      effectPlaybackRate,
      effectFrameUp,
      effectFrameDown,
      effectPlayback,
      effectPlaybackMode,
      effectCopyFrame,
      effectPasteFrame,
      effectUndoFrame,
      effectAddKeyframe,
      effectDeleteKeyframe,
      effectResetAnimation,
    },
    {
      updateEffectSetting,
      bindNumberDrag,
      commitUndoSnapshot,
      updateEffectPlaybackRate,
      stepEffectDuration,
      toggleEffectPlayback,
      toggleEffectPlaybackMode,
      copyActiveEffectFrame,
      pasteActiveEffectFrame,
      undoTuningChange,
      addEffectKeyframe,
      deleteEffectKeyframe,
      resetCurrentEffectAnimation,
    }
  );
  bindLayerOrderControls(layerUp, layerDown, moveSelectedLayer);
  bindPanelShellControls({ panel, openButton, closeButton, backdrop }, { openPanel, closePanel });
  bindPanelKeyboardShortcuts(panel, { undoTuningChange, copyCurrentFrame, pasteCurrentFrame, hasPoseFrameSelection });
  resetButton.addEventListener('click', resetSelectedActorTuning);
  bindCanvasDragControls(canvas, {
    onPointerDown: onCanvasPointerDown,
    onPointerMove: onCanvasPointerMove,
    onPointerUp: endCanvasDrag,
  });
  enhanceNumberInputs(panel);

  function bindNumericControl(id, path) {
    const group = document.querySelector(`[data-field="${id}"]`);
    if (!group) return;
    const range = group.querySelector('input[type="range"]');
    const number = group.querySelector('input[type="number"]');

    range.addEventListener('input', () => update(range.value, number));
    number.addEventListener('input', () => update(number.value, range));
    bindNumberDrag(number, range, update);
    range.addEventListener('change', commitUndoSnapshot);
    number.addEventListener('change', commitUndoSnapshot);
    number.addEventListener('blur', commitUndoSnapshot);

    function update(value, peer) {
      beginUndoSnapshot();
      setPath(selectedActor.tuning, path, Number(value));
      peer.value = value;
      applySelected();
    }
  }

  function bindPartPicker(picker, context) {
    bindPartPickerButtons(picker, (partKey, append) => selectPickerPart(context, partKey, append));
  }

  function selectPickerPart(context, partKey, append = false) {
    if (context === 'pose' && append) {
      togglePosePartMultiSelection(partKey);
      return;
    }

    if ((context === 'pose' ? activePosePartKey : activePartKey) === partKey) {
      clearPartSelection(context);
      return;
    }

    editFocusPartKey = partKey;
    editFocusContext = context;
    if (context === 'pose') {
      selectSinglePosePart(partKey);
      renderPosePartFields();
      syncPosePreview();
    } else {
      editContext = 'part';
      activePartKey = partKey;
      activePartKeyGlobal = activePartKey;
      partSelect.value = partKey;
      renderPartFields();
    }

    syncPartPickers();
    syncAnchorDebugPart();
  }

  function togglePosePartMultiSelection(partKey) {
    editContext = 'pose';
    editFocusContext = 'pose';
    if (selectedPosePartKeysGlobal.has(partKey)) {
      selectedPosePartKeysGlobal.delete(partKey);
    } else {
      selectedPosePartKeysGlobal.add(partKey);
    }
    resetGroupEditValues();

    syncActivePosePartAfterMultiSelect(partKey);
    if (activePosePartKey) posePartSelect.value = activePosePartKey;
    renderPosePartFields();
    syncPosePreview();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function selectSinglePosePart(partKey) {
    editContext = 'pose';
    activePosePartKey = partKey;
    selectedPosePartKeysGlobal.clear();
    selectedPosePartKeysGlobal.add(partKey);
    resetGroupEditValues();
    posePartSelect.value = partKey;
  }

  function syncActivePosePartAfterMultiSelect(partKey) {
    activePosePartKey = selectedPosePartKeysGlobal.size ? partKey : null;
    if (activePosePartKey && !selectedPosePartKeysGlobal.has(activePosePartKey)) {
      activePosePartKey = [...selectedPosePartKeysGlobal].at(-1) || null;
    }
    editFocusPartKey = selectedPosePartKeysGlobal.size > 1 ? activePosePartKey : activePosePartKey || MASTER_PART_KEY;
  }

  function closeEditSection(context) {
    const section = context === 'pose' ? poseSection : context === 'effect' ? effectSection : partSection;
    section.classList.remove('is-open');
    if (context === 'effect') clearEffectSelection();
    else clearPartSelection(context);
  }

  function clearPartSelection(context) {
    if (context === 'pose') clearPosePartSelection();
    else clearRigPartSelection();

    if (context === editFocusContext && context !== 'pose') {
      editFocusPartKey = activePosePartKey;
      editFocusContext = editFocusPartKey ? 'pose' : null;
    }

    clearInactiveEditHandleState();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function clearPosePartSelection() {
    activePosePartKey = null;
    selectedPosePartKeysGlobal.clear();
    resetGroupEditValues();
    editContext = 'pose';
    editFocusContext = 'pose';
    editFocusPartKey = MASTER_PART_KEY;
    renderPosePartFields();
    syncPosePreview();
  }

  function clearRigPartSelection() {
    activePartKey = null;
    activePartKeyGlobal = null;
    partFields.innerHTML = emptyPartMessage('위치를 조절할 부위를 선택하세요.');
  }

  function clearInactiveEditHandleState() {
    if (editFocusPartKey) return;

    editHandleHover = null;
    editHandleActiveMode = null;
    canvas.style.cursor = '';
  }

  function syncPartPickers() {
    markPartPicker(partPicker, activePartKey);
    markPartPicker(posePartPicker, activePosePartKey, selectedPosePartKeysGlobal);
  }

  function renderPartFields() {
    if (!activePartKey) {
      partFields.innerHTML = emptyPartMessage('위치를 조절할 부위를 선택하세요.');
      return;
    }

    partSelect.value = activePartKey;
    const part = partPositionSources(selectedActor.tuning.rig)[activePartKey];
    partFields.innerHTML = '';
    renderScrubGroups(
      partFields,
      partPropertyGroups(activePartKey),
      (prop) => readPartDisplayValue(activePartKey, part, prop),
      (prop, value) => updatePartValue(prop, value),
      scrubCallbacks
    );
  }

  function renderPosePartFields() {
    renderPoseTimeline();
    if (selectedPosePartKeysGlobal.size > 1) {
      posePartFields.innerHTML = '';
      renderPosePartHeader('group');
      if (!hasPoseFrameSelection()) {
        posePartFields.insertAdjacentHTML('beforeend', emptyPartMessage('그룹을 편집할 프레임을 선택하세요.'));
        return;
      }
      renderScrubGroups(
        posePartFields,
        groupPosePropertyGroups(),
        readGroupPoseValue,
        (prop, value) => updateGroupPoseValue(prop, value),
        scrubCallbacks
      );
      return;
    }
    const partKey = activePosePartKey || MASTER_PART_KEY;
    if (!hasPoseFrameSelection() && !isMasterPart(partKey)) {
      posePartFields.innerHTML = emptyPartMessage('편집할 프레임을 선택하세요.');
      return;
    }

    posePartSelect.value = partKey;
    ensurePoseOffset(selectedActor.tuning, poseSelect.value, partKey);
    const offset = currentPoseFrameValue(partKey);
    posePartFields.innerHTML = '';
    renderPosePartHeader(partKey);

    renderScrubGroups(
      posePartFields,
      posePropertyGroups(partKey, hasPoseFrameSelection()),
      (prop) => readPoseDisplayValue(partKey, offset, prop),
      (prop, value) => updatePoseOffset(prop, value),
      scrubCallbacks
    );
  }

  function renderPosePartHeader(partKey) {
    const header = document.createElement('div');
    header.className = 'pose-part-header';
    header.textContent = partKey === 'group' ? `선택 그룹 ${selectedPosePartKeysGlobal.size}` : partLabel(partKey);
    posePartFields.append(header);
  }

  function renderEffectFields() {
    ensureActiveEffectFrame();
    renderEffectTimeline();
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    renderEffectImagePreview(effectImagePreview, effectSelect.value, effectAssets);
    effectFields.innerHTML = '';
    renderScrubGroups(
      effectFields,
      effectPropertyGroups(),
      readEffectDisplayValue,
      (prop, value) => updateEffectOffset(prop, value),
      scrubCallbacks
    );
  }

  function readEffectDisplayValue(prop) {
    const frame = currentEffectFrameValue();
    if (prop === 'w' || prop === 'h') {
      const base = defaultEffectSize(effectSelect.value);
      const baseValue = prop === 'w' ? base.w : base.h;
      return Math.round((Number(frame[prop] || baseValue) / baseValue) * 1000) / 10;
    }
    return frame[prop];
  }

  function updateEffectOffset(prop, value) {
    beginUndoSnapshot();
    stopEffectPreview();
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    const frame = currentEffectFrameValue();
    if (!frame) return readEffectDisplayValue(prop);

    if (prop === 'w' || prop === 'h') {
      const base = defaultEffectSize(effectSelect.value);
      const baseValue = prop === 'w' ? base.w : base.h;
      const scale = clamp(Number(value), 5, 300) / 100;
      writeEffectFrameValue(prop, baseValue * scale);
    } else {
      const limits = effectFieldLimits(prop);
      writeEffectFrameValue(prop, clamp(Number(value), limits.min, limits.max));
    }

    syncEffectPreview();
    applySelected();
    return readEffectDisplayValue(prop);
  }

  function currentEffectFrameValue() {
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    if (activeEffectKeyframeId) return ensureEffectKeyframe(activeEffectKeyframeId);
    if (!effectFrame && selectedEffectSlot !== null) {
      return interpolateEffectFrameValues(
        effectKeyframesFor(effect, effectSelect.value),
        getActiveEffectT(),
        effectSelect.value
      );
    }
    if (!effectFrame) setEffectFrameSilently('start');
    return effect[effectFrame === 'end' ? 'end' : 'start'];
  }

  function writeEffectFrameValue(prop, value) {
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    if (!activeEffectKeyframeId && !effectFrame && selectedEffectSlot !== null) {
      activeEffectKeyframeId = createEffectKeyframeAtSelectedSlot();
    }
    if (!activeEffectKeyframeId && !effectFrame) return;
    if (activeEffectKeyframeId) {
      const keyframe = ensureEffectKeyframe(activeEffectKeyframeId);
      keyframe[prop] = value;
      syncFrameAliases(effect);
      return;
    }

    effect[effectFrame][prop] = value;
    effectKeyframesFor(effect, effectSelect.value).find((keyframe) => keyframe.id === effectFrame)[prop] = value;
    syncFrameAliases(effect);
  }

  function createEffectKeyframeAtSelectedSlot() {
    const keyframes = effectTimelineKeyframes();
    const slot = isEmptyEditableSlot(selectedEffectSlot, keyframes, getEffectLastSlot(), effectTToSlot)
      ? selectedEffectSlot
      : null;
    if (slot === null) return null;
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    const t = effectSlotToT(slot);
    const id = makePoseKeyframeId();
    effect.keyframes.push({
      id,
      t,
      ...interpolateEffectFrameValues(effectKeyframesFor(effect, effectSelect.value), t, effectSelect.value),
    });
    sortPoseKeyframes(effect.keyframes);
    syncFrameAliases(effect);
    effectFrame = null;
    selectedEffectSlot = slot;
    return id;
  }

  function readGroupPoseValue(prop) {
    return groupEditValues[prop];
  }

  function updateGroupPoseValue(prop, value) {
    stopPosePreview();
    const nextValue = prop === 'scale' ? clamp(Number(value), 10, 400) : Number(value);
    if (!Number.isFinite(nextValue)) return readGroupPoseValue(prop);

    if (prop === 'x' || prop === 'y') {
      const dx = prop === 'x' ? nextValue - groupEditValues.x : 0;
      const dy = prop === 'y' ? nextValue - groupEditValues.y : 0;
      applyCanvasGroupDrag(createCurrentGroupDrag('move'), dx, dy);
      groupEditValues[prop] = nextValue;
    } else if (prop === 'rot') {
      const delta = nextValue - groupEditValues.rot;
      applyCurrentGroupRotation(delta);
      groupEditValues.rot = nextValue;
    } else if (prop === 'scale') {
      const previousScale = Math.max(0.1, groupEditValues.scale / 100);
      const nextScale = Math.max(0.1, nextValue / 100);
      applyCurrentGroupScale(nextScale / previousScale);
      groupEditValues.scale = nextValue;
    } else if (prop === 'opacity') {
      const nextOpacity = nextValue > 0 ? 1 : 0;
      applyCurrentGroupOpacity(nextOpacity);
      groupEditValues.opacity = nextOpacity;
    }

    syncPosePreview();
    applySelected();
    return readGroupPoseValue(prop);
  }

  function readPartDisplayValue(partKey, part, prop) {
    if (prop === 'w' || prop === 'h') return partSizeToPercent(partKey, part, prop);
    return part[prop];
  }

  function readPoseDisplayValue(partKey, offset, prop) {
    if (prop === 'w' || prop === 'h') {
      return poseSizeToPercent(partKey, offset, prop, partPositionSources(selectedActor.tuning.rig)[partKey] || {});
    }
    return offset[prop];
  }

  function syncMotionRows() {
    const groups = poseMotionGroups(poseSelect.value);
    motionRows.forEach((row) => {
      row.hidden = !groups.includes(row.dataset.motionGroup);
    });
    renderPoseSettings();
  }

  function renderPoseSettings() {
    ensurePoseSettings(selectedActor.tuning);
    const settings = selectedActor.tuning.poseSettings[poseSelect.value];
    const isLoop = settings.playback !== 'once';
    syncTimelinePlaybackControls(
      {
        duration: poseDuration,
        playbackRateRange: posePlaybackRateRange,
        playbackRate: posePlaybackRate,
        playback: posePlayback,
        playbackMode: posePlaybackMode,
      },
      { frameCount: getPoseFrameCount(), settings, playing: posePreviewPlaying, isLoop }
    );
    posePlayback.title = settings.playback === 'loop' ? '반복 재생' : '한 번 재생';
    syncPoseToolbarButtons();
  }

  function syncPoseToolbarButtons() {
    poseFrameSelectionActive = hasPoseFrameSelection();
    poseCopyFrame.disabled = !hasPoseFrameSelection();
    posePasteFrame.disabled = !copiedPoseFrame;
    poseUndoFrame.disabled = undoStack.length <= 0;
    poseFrameDown.disabled = getPoseFrameCount() <= POSE_MIN_FRAMES;
    poseFrameUp.disabled = getPoseFrameCount() >= POSE_MAX_FRAMES;
  }

  function hasPoseFrameSelection() {
    return Boolean(activePoseKeyframeId || poseFrame);
  }

  function updatePoseSetting(prop, value) {
    beginUndoSnapshot();
    ensurePoseSettings(selectedActor.tuning);
    const settings = selectedActor.tuning.poseSettings[poseSelect.value];
    if (prop === 'duration') settings.duration = timelineDurationFromFrames(value);
    if (prop === 'playback') settings.playback = value === 'once' ? 'once' : 'loop';
    if (prop === 'playbackRate') settings.playbackRate = clamp(Number(value), 0.1, 4);
    applySelected();
    syncPosePreview();
  }

  function updatePosePlaybackRate(value, peer) {
    const next = clampPlaybackRateInput(value, peer);
    if (next === null) return;
    updatePoseSetting('playbackRate', next);
  }

  function stepPoseDuration(delta, snapToTen = false) {
    beginUndoSnapshot();
    const next = stepTimelineDurationValue(getPoseFrameCount(), delta, snapToTen, POSE_MIN_FRAMES, POSE_MAX_FRAMES);
    poseDuration.value = next;
    updatePoseSetting('duration', next);
    commitUndoSnapshot();
  }

  function syncAnchorDebugPart() {
    actors.forEach((actor) => {
      actor.player.anchorDebugPart = null;
    });
    selectedActor.player.anchorDebugPart = selectedPosePartKeysGlobal.size > 1 ? null : editFocusPartKey;
  }

  function updatePoseOffset(prop, value) {
    beginUndoSnapshot();
    stopPosePreview();
    const partKey = activePosePartKey || MASTER_PART_KEY;
    const offset = currentPoseFrameValue(partKey);
    const limits = poseFieldLimits(prop, partKey);
    const nextValue = clamp(Number(value), limits.min, limits.max);
    const writeValue =
      prop === 'w' || prop === 'h'
        ? poseSizeOffsetFromPercent(
            partKey,
            prop,
            nextValue,
            partPositionSources(selectedActor.tuning.rig)[partKey] || {}
          )
        : nextValue;
    writePoseFrameValue(partKey, prop, writeValue);
    syncPosePreview();
    applySelected();
    return readPoseDisplayValue(partKey, offset, prop);
  }

  function currentPoseFrameValue(part) {
    ensurePoseOffset(selectedActor.tuning, poseSelect.value, part);
    const frames = selectedActor.tuning.poseOffsets[poseSelect.value][part];
    if (activePoseKeyframeId) return ensurePoseKeyframeForPart(frames, activePoseKeyframeId);
    if (!poseFrame) return isMasterPart(part) ? frames : frameValue();
    return frames[poseFrame === 'end' ? 'end' : 'start'];
  }

  function writePoseFrameValue(part, prop, value) {
    const frames = selectedActor.tuning.poseOffsets[poseSelect.value][part];
    if (isMasterPart(part) && !activePoseKeyframeId && !poseFrame && (prop === 'anchorX' || prop === 'anchorY')) {
      frames[prop] = value;
      return;
    }
    if (!activePoseKeyframeId && !poseFrame) return;
    if (activePoseKeyframeId) {
      const keyframe = ensurePoseKeyframeForPart(frames, activePoseKeyframeId);
      keyframe[prop] = value;
      syncFrameAliases(frames);
      return;
    }

    frames[poseFrame][prop] = value;
    poseKeyframesFor(frames).find((keyframe) => keyframe.id === poseFrame)[prop] = value;
    syncFrameAliases(frames);
  }

  function setPoseFrame(frame) {
    stopPosePreview();
    poseFrame = frame;
    selectedPoseSlot = frame === 'end' ? getPoseLastSlot() : 0;
    activePoseKeyframeId = null;
    resetGroupEditValues();
    renderPosePartFields();
    syncPosePreview();
  }

  function togglePosePlayback() {
    if (posePreviewPlaying) {
      stopPosePreview();
      syncPosePreview();
      return;
    }

    playPosePreview();
  }

  function togglePosePlaybackMode() {
    beginUndoSnapshot();
    const settings = selectedActor.tuning.poseSettings[poseSelect.value];
    updatePoseSetting('playback', settings.playback === 'loop' ? 'once' : 'loop');
    commitUndoSnapshot();
  }

  function playPosePreview() {
    ensurePoseSettings(selectedActor.tuning);
    clearTimeout(posePreviewTimer);
    posePreviewPlaying = true;
    activePoseKeyframeId = null;
    selectedActor.player.stateTime = 0;
    selectedActor.player.animTime = 0;
    syncPosePreview();

    const settings = selectedActor.tuning.poseSettings[poseSelect.value];
    if (settings.playback !== 'once') return;

    posePreviewTimer = setTimeout(() => {
      posePreviewPlaying = false;
      posePreviewTimer = null;
      syncPosePreview();
    }, previewTimeoutMs(settings));
  }

  function stopPosePreview() {
    clearTimeout(posePreviewTimer);
    posePreviewTimer = null;
    posePreviewPlaying = false;
  }

  function addPoseKeyframe() {
    const slot = selectedOrFirstEmptySlot(selectedPoseSlot, poseTimelineKeyframes(), getPoseLastSlot(), tToSlot);
    if (!slot) return;
    beginUndoSnapshot();
    const t = slotToT(slot);
    const id = makePoseKeyframeId();
    POSE_PART_KEYS.forEach((part) => {
      ensurePoseOffset(selectedActor.tuning, poseSelect.value, part);
      const frames = selectedActor.tuning.poseOffsets[poseSelect.value][part];
      const next = {
        id,
        t,
        ...interpolateFrameValues(poseKeyframesFor(frames), t),
      };
      frames.keyframes.push(next);
      sortPoseKeyframes(frames.keyframes);
      syncFrameAliases(frames);
    });
    activePoseKeyframeId = id;
    selectedPoseSlot = slot;
    stopPosePreview();
    resetGroupEditValues();
    renderPosePartFields();
    syncPosePreview();
    applySelected();
    commitUndoSnapshot();
  }

  function deletePoseKeyframe() {
    if (!activePoseKeyframeId) return;
    beginUndoSnapshot();
    POSE_PART_KEYS.forEach((part) => {
      const frames = selectedActor.tuning.poseOffsets[poseSelect.value]?.[part];
      if (!frames?.keyframes) return;
      frames.keyframes = frames.keyframes.filter((frame) => frame.id !== activePoseKeyframeId);
      syncFrameAliases(frames);
    });
    activePoseKeyframeId = null;
    poseFrame = null;
    selectedPoseSlot = null;
    stopPosePreview();
    resetGroupEditValues();
    renderPosePartFields();
    syncPosePreview();
    applySelected();
    commitUndoSnapshot();
  }

  function resetCurrentPoseAnimation() {
    beginUndoSnapshot();
    const pose = poseSelect.value;
    selectedActor.tuning.poseOffsets ||= {};
    selectedActor.tuning.poseOffsets[pose] = {};
    POSE_PART_KEYS.forEach((part) => {
      selectedActor.tuning.poseOffsets[pose][part] = normalizePoseFrameValue();
    });
    poseFrame = null;
    activePoseKeyframeId = null;
    selectedPoseSlot = null;
    copiedPoseFrame = null;
    stopPosePreview();
    renderPosePartFields();
    syncPosePreview();
    applySelected();
    commitUndoSnapshot();
    syncPoseToolbarButtons();
  }

  function copyCurrentFrame() {
    if (effectSection.classList.contains('is-open')) copyActiveEffectFrame();
    else copyActivePoseFrame();
  }

  function pasteCurrentFrame() {
    if (effectSection.classList.contains('is-open')) pasteActiveEffectFrame();
    else pasteActivePoseFrame();
  }

  function copyActivePoseFrame() {
    if (!poseSection.classList.contains('is-open')) return;
    const id = activePoseKeyframeId || poseFrame;
    if (!id) return;
    const reference = poseTimelineKeyframes().find((frame) => frame.id === id);
    if (!reference) return;
    const selectedParts = selectedPoseFrameCopyParts();

    copiedPoseFrame = {
      mode: selectedPoseFrameCopyMode(),
      pose: poseSelect.value,
      sourceId: id,
      sourcePart: activePosePartKey || null,
      sourceParts: selectedParts,
      parts: {},
    };

    selectedParts.forEach((part) => {
      ensurePoseOffset(selectedActor.tuning, poseSelect.value, part);
      const frames = selectedActor.tuning.poseOffsets[poseSelect.value][part];
      const source = poseKeyframesFor(frames).find((frame) => frame.id === id);
      copiedPoseFrame.parts[part] = frameValue(source || reference);
    });
    syncPoseToolbarButtons();
  }

  function selectedPoseFrameCopyParts() {
    if (selectedPosePartKeysGlobal.size > 1) return [...selectedPosePartKeysGlobal];
    if (activePosePartKey) return [activePosePartKey];
    return POSE_PART_KEYS;
  }

  function selectedPoseFrameCopyMode() {
    if (selectedPosePartKeysGlobal.size > 1) return 'parts';
    if (activePosePartKey) return 'part';
    return 'frame';
  }

  function pasteActivePoseFrame() {
    if (!copiedPoseFrame || !poseSection.classList.contains('is-open')) return;
    const id = activePoseKeyframeId || poseFrame;
    if (!isPoseTimelineFrameId(id)) return;

    beginUndoSnapshot();
    const pasteParts = pastePoseFrameParts();

    pasteParts.forEach(({ from, to }) => {
      pastePoseFramePart(id, from, to);
    });

    resetGroupEditValues();
    renderPosePartFields();
    syncPosePreview();
    applySelected();
    commitUndoSnapshot();
    syncPoseToolbarButtons();
  }

  function pastePoseFramePart(id, from, to) {
    if (!from || !to || !copiedPoseFrame.parts[from]) return;

    ensurePoseOffset(selectedActor.tuning, poseSelect.value, to);
    const frames = selectedActor.tuning.poseOffsets[poseSelect.value][to];
    const target = ensurePoseKeyframeForPart(frames, id);
    const keep = { id: target.id, t: target.t };
    Object.assign(target, frameValue(copiedPoseFrame.parts[from]), keep);
    if (id === 'start') frames.start = frameValue(target);
    if (id === 'end') frames.end = frameValue(target);
    syncFrameAliases(frames);
  }

  function isPoseTimelineFrameId(id) {
    return Boolean(id && poseTimelineKeyframes().some((frame) => frame.id === id));
  }

  function pastePoseFrameParts() {
    if (copiedPoseFrame.mode === 'part') {
      return [{ from: copiedPoseFrame.sourcePart, to: activePosePartKey || copiedPoseFrame.sourcePart }];
    }

    if (copiedPoseFrame.mode === 'parts') {
      const sourceParts = copiedPoseFrame.sourceParts || Object.keys(copiedPoseFrame.parts || {});
      const targetParts = selectedPosePartKeysGlobal.size > 1 ? [...selectedPosePartKeysGlobal] : sourceParts;
      return sourceParts.map((from, index) => ({ from, to: targetParts[index] || from }));
    }

    return POSE_PART_KEYS.map((part) => ({ from: part, to: part }));
  }

  function renderPoseTimeline() {
    renderPoseSettings();
    const frameCount = getPoseFrameCount();
    const keyframes = poseTimelineKeyframes();
    renderTimelineSlots(poseTimelineTrack, frameCount, selectedPoseSlot, selectPoseSlot);
    syncTimelineToolbar({
      addButton: poseAddKeyframe,
      deleteButton: poseDeleteKeyframe,
      keyframes,
      selectedSlot: selectedPoseSlot,
      activeKeyframeId: activePoseKeyframeId,
      frameCount,
      lastSlot: getPoseLastSlot(),
      toSlot: tToSlot,
    });
    appendTimelineKeyframes(poseTimelineTrack, keyframes, {
      frameCount,
      toSlot: tToSlot,
      slotToLeft,
      isActive: (frame, slot) =>
        activePoseKeyframeId === frame.id ||
        (!activePoseKeyframeId && poseFrame === frame.id) ||
        selectedPoseSlot === slot,
      bindDrag: bindPoseKeyframeDrag,
    });
  }

  function selectPoseKeyframe(id) {
    editContext = 'pose';
    const isSelected = activePoseKeyframeId === id || (!activePoseKeyframeId && poseFrame === id);
    if (isSelected) {
      clearPoseKeyframeSelection();
      return;
    }
    if (id === 'start' || id === 'end') {
      setPoseFrame(id);
      return;
    }
    activePoseKeyframeId = id;
    selectedPoseSlot = tToSlot(getActivePoseT());
    refreshPoseFrameSelection();
  }

  function selectPoseSlot(slot) {
    editContext = 'pose';
    const frame = poseTimelineKeyframes().find((item) => tToSlot(item.t) === slot);
    if (frame) {
      selectPoseKeyframe(frame.id);
      return;
    }
    const isSelected = selectedPoseSlot === slot && !activePoseKeyframeId && !poseFrame;
    if (isSelected) {
      clearPoseKeyframeSelection();
      return;
    }
    selectedPoseSlot = slot;
    activePoseKeyframeId = null;
    poseFrame = null;
    resetGroupEditValues();
    refreshPoseFrameSelection();
  }

  function clearPoseKeyframeSelection() {
    activePoseKeyframeId = null;
    poseFrame = null;
    selectedPoseSlot = null;
    refreshPoseFrameSelection();
  }

  function refreshPoseFrameSelection() {
    stopPosePreview();
    renderPosePartFields();
    syncPosePreview();
  }

  function bindPoseKeyframeDrag(button, id) {
    bindTimelineKeyframeDrag(button, id, {
      onSelectFixed: selectPoseKeyframe,
      onStartDrag: (keyframeId) => {
        selectPoseKeyframeForDrag(keyframeId);
        beginUndoSnapshot();
      },
      onMoveDrag: (keyframeId, event) => movePoseKeyframe(keyframeId, timelinePointerT(event)),
      onFinishDrag: () => {
        commitUndoSnapshot();
        if (activePosePartKey) renderPosePartFields();
      },
    });
  }

  function timelinePointerT(event) {
    return getTimelinePointerT(event, poseTimelineTrack, getPoseFrameCount(), getPoseLastSlot());
  }

  function movePoseKeyframe(id, t) {
    const nextSlot = tToSlot(t);
    const occupied = poseTimelineKeyframes().some((frame) => frame.id !== id && tToSlot(frame.t) === nextSlot);
    if (occupied) return;
    t = slotToT(nextSlot);
    POSE_PART_KEYS.forEach((part) => {
      const frames = selectedActor.tuning.poseOffsets[poseSelect.value]?.[part];
      const keyframe = frames?.keyframes?.find((frame) => frame.id === id);
      if (!keyframe) return;
      keyframe.t = t;
      sortPoseKeyframes(frames.keyframes);
      syncFrameAliases(frames);
    });
    applySelected();
    selectedActor.player.posePreview = {
      pose: poseSelect.value,
      frame: null,
      playing: false,
      t,
      startedAt: performance.now(),
    };
    poseTimelineTrack.querySelectorAll(`[data-keyframe-id="${id}"]`).forEach((button) => {
      button.style.left = `${slotToLeft(nextSlot)}%`;
      button.title = `${nextSlot + 1}칸`;
    });
  }

  function selectPoseKeyframeForDrag(id) {
    activePoseKeyframeId = id;
    stopPosePreview();
    const t = getActivePoseT();
    selectedActor.player.posePreview = {
      pose: poseSelect.value,
      frame: null,
      playing: false,
      t,
      startedAt: performance.now(),
    };
    poseDeleteKeyframe.disabled = false;
    poseTimelineTrack.querySelectorAll('.pose-keyframe').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.keyframeId === id);
    });
  }

  function getActivePoseT() {
    if (activePoseKeyframeId) {
      const frames = selectedActor.tuning.poseOffsets[poseSelect.value]?.[activePosePartKey || POSE_PART_KEYS[0]];
      const keyframe = frames?.keyframes?.find((frame) => frame.id === activePoseKeyframeId);
      if (!keyframe) return poseTimelineKeyframes().find((frame) => frame.id === activePoseKeyframeId)?.t || 0;
      return Number.isFinite(keyframe?.t) ? keyframe.t : 0;
    }
    if (selectedPoseSlot !== null) return slotToT(selectedPoseSlot);
    if (!poseFrame) return 0;
    return poseFrame === 'end' ? 1 : 0;
  }

  function ensurePoseKeyframeForPart(frames, id) {
    const keyframes = poseKeyframesFor(frames);
    const found = keyframes.find((frame) => frame.id === id);
    if (found) return found;

    const reference = poseTimelineKeyframes().find((frame) => frame.id === id);
    const t = Number(reference?.t ?? 0.5);
    const created = { id, t, ...interpolateFrameValues(keyframes, t) };
    keyframes.push(created);
    sortPoseKeyframes(keyframes);
    syncFrameAliases(frames);
    return created;
  }

  function poseTimelineKeyframes() {
    ensurePoseOffset(selectedActor.tuning, poseSelect.value, POSE_PART_KEYS[0]);
    const frames = selectedActor.tuning.poseOffsets[poseSelect.value][POSE_PART_KEYS[0]];
    return poseKeyframesFor(frames);
  }

  function tToSlot(t) {
    return timelineTToSlot(t, getPoseLastSlot());
  }

  function slotToT(slot) {
    return timelineSlotToT(slot, getPoseLastSlot());
  }

  function slotToLeft(slot) {
    return timelineSlotToLeft(slot, getPoseFrameCount(), getPoseLastSlot());
  }

  function getPoseFrameCount() {
    ensurePoseSettings(selectedActor.tuning);
    const settings = selectedActor.tuning.poseSettings[poseSelect.value] || {};
    return timelineFrameCount(settings);
  }

  function getPoseLastSlot() {
    return getPoseFrameCount() - 1;
  }

  function syncPosePreview() {
    actors.forEach((actor) => {
      actor.player.posePreview = null;
    });
    if (!poseSection.classList.contains('is-open')) {
      posePlayback.classList.toggle('is-active', false);
      renderPoseTimeline();
      return;
    }
    const shouldPreviewPose = posePreviewPlaying || activePoseKeyframeId || poseFrame || selectedPoseSlot !== null;
    if (!shouldPreviewPose) {
      posePlayback.classList.toggle('is-active', false);
      renderPoseTimeline();
      return;
    }
    const settings = selectedActor.tuning.poseSettings[poseSelect.value] || {};
    selectedActor.player.posePreview = {
      pose: poseSelect.value,
      frame: activePoseKeyframeId ? null : poseFrame,
      playing: posePreviewPlaying,
      loop: settings.playback !== 'once',
      t: activePoseKeyframeId || selectedPoseSlot !== null ? getActivePoseT() : null,
      startedAt: performance.now(),
    };
    renderPoseTimeline();
  }

  function renderEffectSettings() {
    ensureEffectSettings(selectedActor.tuning);
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    const settings = selectedActor.tuning.effectSettings[effectSelect.value];
    const isLoop = settings.playback === 'loop';
    syncTimelinePlaybackControls(
      {
        duration: effectDuration,
        playbackRateRange: effectPlaybackRateRange,
        playbackRate: effectPlaybackRate,
        playback: effectPlayback,
        playbackMode: effectPlaybackMode,
      },
      { frameCount: getEffectFrameCount(), settings, playing: effectPreviewPlaying, isLoop }
    );
    syncEffectToolbarButtons();
  }

  function syncEffectToolbarButtons() {
    if (!effectSection) return;
    effectCopyFrame.disabled = !hasEffectFrameSelection();
    effectPasteFrame.disabled = !copiedEffectFrame;
    effectUndoFrame.disabled = undoStack.length <= 0;
    effectFrameDown.disabled = getEffectFrameCount() <= POSE_MIN_FRAMES;
    effectFrameUp.disabled = getEffectFrameCount() >= POSE_MAX_FRAMES;
  }

  function hasEffectFrameSelection() {
    return Boolean(activeEffectKeyframeId || effectFrame || selectedEffectSlot !== null);
  }

  function updateEffectSetting(prop, value) {
    beginUndoSnapshot();
    ensureEffectSettings(selectedActor.tuning);
    const settings = selectedActor.tuning.effectSettings[effectSelect.value];
    if (prop === 'duration') settings.duration = timelineDurationFromFrames(value);
    if (prop === 'playback') settings.playback = value === 'loop' ? 'loop' : 'once';
    if (prop === 'playbackRate') settings.playbackRate = clamp(Number(value), 0.1, 4);
    applySelected();
    syncEffectPreview();
  }

  function updateEffectPlaybackRate(value, peer) {
    const next = clampPlaybackRateInput(value, peer);
    if (next === null) return;
    updateEffectSetting('playbackRate', next);
  }

  function stepEffectDuration(delta, snapToTen = false) {
    beginUndoSnapshot();
    const next = stepTimelineDurationValue(getEffectFrameCount(), delta, snapToTen, POSE_MIN_FRAMES, POSE_MAX_FRAMES);
    effectDuration.value = next;
    updateEffectSetting('duration', next);
    commitUndoSnapshot();
  }

  function toggleEffectPlayback() {
    if (effectPreviewPlaying) {
      stopEffectPreview();
      syncEffectPreview();
      return;
    }
    playEffectPreview();
  }

  function toggleEffectPlaybackMode() {
    beginUndoSnapshot();
    const settings = selectedActor.tuning.effectSettings[effectSelect.value];
    updateEffectSetting('playback', settings.playback === 'loop' ? 'once' : 'loop');
    commitUndoSnapshot();
  }

  function playEffectPreview() {
    ensureEffectSettings(selectedActor.tuning);
    clearTimeout(effectPreviewTimer);
    effectPreviewPlaying = true;
    activeEffectKeyframeId = null;
    syncEffectPreview();

    const settings = selectedActor.tuning.effectSettings[effectSelect.value];
    if (settings.playback === 'loop') return;

    effectPreviewTimer = setTimeout(() => {
      effectPreviewPlaying = false;
      effectPreviewTimer = null;
      syncEffectPreview();
    }, previewTimeoutMs(settings));
  }

  function stopEffectPreview() {
    clearTimeout(effectPreviewTimer);
    effectPreviewTimer = null;
    effectPreviewPlaying = false;
  }

  function addEffectKeyframe() {
    const slot = selectedOrFirstEmptySlot(
      selectedEffectSlot,
      effectTimelineKeyframes(),
      getEffectLastSlot(),
      effectTToSlot
    );
    if (!slot) return;
    beginUndoSnapshot();
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    const t = effectSlotToT(slot);
    const id = makePoseKeyframeId();
    effect.keyframes.push({
      id,
      t,
      ...interpolateEffectFrameValues(effectKeyframesFor(effect, effectSelect.value), t, effectSelect.value),
    });
    sortPoseKeyframes(effect.keyframes);
    syncFrameAliases(effect);
    activeEffectKeyframeId = id;
    selectedEffectSlot = slot;
    stopEffectPreview();
    renderEffectFields();
    syncEffectPreview();
    applySelected();
    commitUndoSnapshot();
  }

  function deleteEffectKeyframe() {
    if (!activeEffectKeyframeId) return;
    beginUndoSnapshot();
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    effect.keyframes = effect.keyframes.filter((frame) => frame.id !== activeEffectKeyframeId);
    syncFrameAliases(effect);
    activeEffectKeyframeId = null;
    effectFrame = null;
    selectedEffectSlot = null;
    stopEffectPreview();
    renderEffectFields();
    syncEffectPreview();
    applySelected();
    commitUndoSnapshot();
  }

  function resetCurrentEffectAnimation() {
    beginUndoSnapshot();
    const key = effectSelect.value;
    selectedActor.tuning.effectOffsets[key] = normalizeEffectOffsets({ [key]: { image: defaultEffectImageKey(key) } })[
      key
    ];
    activeEffectKeyframeId = null;
    effectFrame = null;
    selectedEffectSlot = null;
    copiedEffectFrame = null;
    stopEffectPreview();
    renderEffectFields();
    syncEffectPreview();
    applySelected();
    commitUndoSnapshot();
    syncEffectToolbarButtons();
  }

  function copyActiveEffectFrame() {
    if (!effectSection.classList.contains('is-open')) return;
    const id = activeEffectKeyframeId || effectFrame;
    const source = id ? effectTimelineKeyframes().find((frame) => frame.id === id) : currentEffectFrameValue();
    if (!source) return;
    copiedEffectFrame = {
      effect: effectSelect.value,
      frame: effectFrameValue(source, effectSelect.value),
    };
    syncEffectToolbarButtons();
  }

  function pasteActiveEffectFrame() {
    if (!copiedEffectFrame || !effectSection.classList.contains('is-open')) return;
    let id = activeEffectKeyframeId || effectFrame;
    if (!id && selectedEffectSlot !== null) id = createEffectKeyframeAtSelectedSlot();
    if (!isEffectTimelineFrameId(id)) return;

    beginUndoSnapshot();
    pasteEffectFrameValue(id);
    renderEffectFields();
    syncEffectPreview();
    applySelected();
    commitUndoSnapshot();
    syncEffectToolbarButtons();
  }

  function pasteEffectFrameValue(id) {
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    const target = ensureEffectKeyframe(id);
    const keep = { id: target.id, t: target.t };
    Object.assign(target, effectFrameValue(copiedEffectFrame.frame, effectSelect.value), keep);
    if (id === 'start') effect.start = effectFrameValue(target, effectSelect.value);
    if (id === 'end') effect.end = effectFrameValue(target, effectSelect.value);
    syncFrameAliases(effect);
  }

  function isEffectTimelineFrameId(id) {
    return Boolean(id && effectTimelineKeyframes().some((frame) => frame.id === id));
  }

  function renderEffectTimeline() {
    renderEffectSettings();
    const frameCount = getEffectFrameCount();
    const keyframes = effectTimelineKeyframes();
    renderTimelineSlots(effectTimelineTrack, frameCount, selectedEffectSlot, selectEffectSlot);
    syncTimelineToolbar({
      addButton: effectAddKeyframe,
      deleteButton: effectDeleteKeyframe,
      keyframes,
      selectedSlot: selectedEffectSlot,
      activeKeyframeId: activeEffectKeyframeId,
      frameCount,
      lastSlot: getEffectLastSlot(),
      toSlot: effectTToSlot,
    });
    appendTimelineKeyframes(effectTimelineTrack, keyframes, {
      frameCount,
      toSlot: effectTToSlot,
      slotToLeft: effectSlotToLeft,
      isActive: (frame, slot) =>
        activeEffectKeyframeId === frame.id ||
        (!activeEffectKeyframeId && effectFrame === frame.id) ||
        selectedEffectSlot === slot,
      bindDrag: bindEffectKeyframeDrag,
    });
  }

  function selectEffectKeyframe(id) {
    editContext = 'effect';
    const isSelected = activeEffectKeyframeId === id || (!activeEffectKeyframeId && effectFrame === id);
    if (isSelected) {
      clearEffectKeyframeSelection();
      return;
    }
    if (id === 'start' || id === 'end') {
      setEffectFrame(id);
      return;
    }
    activeEffectKeyframeId = id;
    selectedEffectSlot = effectTToSlot(getActiveEffectT());
    refreshEffectFrameSelection();
  }

  function selectEffectSlot(slot) {
    editContext = 'effect';
    const frame = effectTimelineKeyframes().find((item) => effectTToSlot(item.t) === slot);
    if (frame) {
      selectEffectKeyframe(frame.id);
      return;
    }
    const isSelected = selectedEffectSlot === slot && !activeEffectKeyframeId && !effectFrame;
    if (isSelected) {
      clearEffectKeyframeSelection();
      return;
    }
    selectedEffectSlot = slot;
    activeEffectKeyframeId = null;
    effectFrame = null;
    refreshEffectFrameSelection();
  }

  function setEffectFrame(frame) {
    stopEffectPreview();
    setEffectFrameSilently(frame);
    renderEffectFields();
    syncEffectPreview();
  }

  function setEffectFrameSilently(frame) {
    effectFrame = frame;
    selectedEffectSlot = frame === 'end' ? getEffectLastSlot() : 0;
    activeEffectKeyframeId = null;
  }

  function ensureActiveEffectFrame() {
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    const hasSelection = activeEffectKeyframeId || effectFrame || selectedEffectSlot !== null;
    if (!hasSelection) setEffectFrameSilently('start');
  }

  function clearEffectKeyframeSelection() {
    resetEffectSelectionState();
    refreshEffectFrameSelection();
  }

  function clearEffectSelection() {
    stopEffectPreview();
    resetEffectSelectionState();
    actors.forEach((actor) => {
      actor.player.effectPreview = null;
    });
    renderEffectFields();
  }

  function resetEffectSelectionState() {
    activeEffectKeyframeId = null;
    effectFrame = null;
    selectedEffectSlot = null;
  }

  function refreshEffectFrameSelection() {
    stopEffectPreview();
    renderEffectFields();
    syncEffectPreview();
  }

  function bindEffectKeyframeDrag(button, id) {
    bindTimelineKeyframeDrag(button, id, {
      onSelectFixed: selectEffectKeyframe,
      onStartDrag: (keyframeId) => {
        selectEffectKeyframeForDrag(keyframeId);
        beginUndoSnapshot();
      },
      onMoveDrag: (keyframeId, event) => moveEffectKeyframe(keyframeId, effectTimelinePointerT(event)),
      onFinishDrag: () => {
        commitUndoSnapshot();
        renderEffectFields();
      },
    });
  }

  function effectTimelinePointerT(event) {
    return getTimelinePointerT(event, effectTimelineTrack, getEffectFrameCount(), getEffectLastSlot());
  }

  function moveEffectKeyframe(id, t) {
    const nextSlot = effectTToSlot(t);
    const occupied = effectTimelineKeyframes().some((frame) => frame.id !== id && effectTToSlot(frame.t) === nextSlot);
    if (occupied) return;
    t = effectSlotToT(nextSlot);
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    const keyframe = effect.keyframes?.find((frame) => frame.id === id);
    if (!keyframe) return;
    keyframe.t = t;
    sortPoseKeyframes(effect.keyframes);
    syncFrameAliases(effect);
    applySelected();
    selectedActor.player.effectPreview = {
      key: effectSelect.value,
      playing: false,
      t,
      startedAt: performance.now(),
    };
    effectTimelineTrack.querySelectorAll(`[data-keyframe-id="${id}"]`).forEach((button) => {
      button.style.left = `${effectSlotToLeft(nextSlot)}%`;
      button.title = `${nextSlot + 1}칸`;
    });
  }

  function selectEffectKeyframeForDrag(id) {
    activeEffectKeyframeId = id;
    stopEffectPreview();
    const t = getActiveEffectT();
    selectedActor.player.effectPreview = {
      key: effectSelect.value,
      playing: false,
      t,
      startedAt: performance.now(),
    };
    effectDeleteKeyframe.disabled = false;
    effectTimelineTrack.querySelectorAll('.pose-keyframe').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.keyframeId === id);
    });
  }

  function ensureEffectKeyframe(id) {
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    const effect = selectedActor.tuning.effectOffsets[effectSelect.value];
    const keyframes = effectKeyframesFor(effect, effectSelect.value);
    const found = keyframes.find((frame) => frame.id === id);
    if (found) return found;

    const reference = effectTimelineKeyframes().find((frame) => frame.id === id);
    const t = Number(reference?.t ?? 0.5);
    const created = { id, t, ...interpolateEffectFrameValues(keyframes, t, effectSelect.value) };
    keyframes.push(created);
    sortPoseKeyframes(keyframes);
    syncFrameAliases(effect);
    return created;
  }

  function effectTimelineKeyframes() {
    ensureEffectOffset(selectedActor.tuning, effectSelect.value);
    return effectKeyframesFor(selectedActor.tuning.effectOffsets[effectSelect.value], effectSelect.value);
  }

  function getActiveEffectT() {
    if (activeEffectKeyframeId) {
      const keyframe = selectedActor.tuning.effectOffsets[effectSelect.value]?.keyframes?.find(
        (frame) => frame.id === activeEffectKeyframeId
      );
      if (!keyframe) return effectTimelineKeyframes().find((frame) => frame.id === activeEffectKeyframeId)?.t || 0;
      return Number.isFinite(keyframe?.t) ? keyframe.t : 0;
    }
    if (selectedEffectSlot !== null) return effectSlotToT(selectedEffectSlot);
    if (!effectFrame) return 0;
    return effectFrame === 'end' ? 1 : 0;
  }

  function effectTToSlot(t) {
    return timelineTToSlot(t, getEffectLastSlot());
  }

  function effectSlotToT(slot) {
    return timelineSlotToT(slot, getEffectLastSlot());
  }

  function effectSlotToLeft(slot) {
    return timelineSlotToLeft(slot, getEffectFrameCount(), getEffectLastSlot());
  }

  function getEffectFrameCount() {
    ensureEffectSettings(selectedActor.tuning);
    const settings = selectedActor.tuning.effectSettings[effectSelect.value] || {};
    return timelineFrameCount(settings);
  }

  function getEffectLastSlot() {
    return getEffectFrameCount() - 1;
  }

  function syncEffectPreview() {
    actors.forEach((actor) => {
      actor.player.effectPreview = null;
    });
    if (!effectSection.classList.contains('is-open')) {
      effectPlayback.classList.toggle('is-active', false);
      renderEffectTimeline();
      return;
    }
    const shouldPreviewEffect =
      effectPreviewPlaying || activeEffectKeyframeId || effectFrame || selectedEffectSlot !== null;
    if (!shouldPreviewEffect) {
      effectPlayback.classList.toggle('is-active', false);
      renderEffectTimeline();
      return;
    }
    selectedActor.player.effectPreview = {
      key: effectSelect.value,
      playing: effectPreviewPlaying,
      t: effectPreviewPlaying ? null : getActiveEffectT(),
      startedAt: performance.now(),
    };
    renderEffectTimeline();
  }

  function renderLayerOrder(selectedValue = layerOrder.value) {
    renderLayerSelectOptions(layerOrder, selectedActor.tuning.layerOrder, selectedValue);
  }

  function moveSelectedLayer(direction) {
    const order = selectedActor.tuning.layerOrder;
    const currentIndex = order.indexOf(layerOrder.value);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return;

    pushUndoSnapshot();
    [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];
    selectedActor.player.applyTuning(selectedActor.tuning);
    saveState();
    renderLayerOrder(order[nextIndex]);
  }

  function updatePartValue(prop, value) {
    beginUndoSnapshot();
    const part = partPositionSources(selectedActor.tuning.rig)[activePartKey];
    const limits = partFieldLimits(prop, activePartKey);
    const nextValue = clamp(Number(value), limits.min, limits.max);
    if (prop === 'ax') {
      setPartAnchorValue(part, 'ax', nextValue, activePartKey);
    } else if (prop === 'ay') {
      setPartAnchorValue(part, 'ay', nextValue, activePartKey);
    } else if (prop === 'w' || prop === 'h') {
      part[prop] = partSizeFromPercent(activePartKey, part, prop, nextValue);
    } else {
      part[prop] = nextValue;
    }
    applySelected();
    return readPartDisplayValue(activePartKey, part, prop);
  }

  function applySelected() {
    syncActorHealthCapacity(selectedActor, Number(selectedActor.maxHpPips) !== Number(selectedActor.tuning.maxHpPips));
    selectedActor.player.applyTuning(selectedActor.tuning);
    saveState();
  }

  function beginUndoSnapshot() {
    if (editSnapshotOpen) return;
    pushUndoSnapshot();
    editSnapshotOpen = true;
  }

  function commitUndoSnapshot() {
    editSnapshotOpen = false;
  }

  function pushUndoSnapshot() {
    undoStack.push({
      actorId: selectedActor.id,
      tuning: clone(selectedActor.tuning),
      groupEditValues: clone(groupEditValues),
    });
    if (undoStack.length > 80) undoStack.shift();
  }

  function undoTuningChange() {
    const snapshot = undoStack.pop();
    if (!snapshot) return;

    const actor = actors.find((item) => item.id === snapshot.actorId) || selectedActor;
    selectedActor = actor;
    replaceObject(actor.tuning, snapshot.tuning);
    groupEditValues = snapshot.groupEditValues
      ? clone(snapshot.groupEditValues)
      : { x: 0, y: 0, rot: 0, scale: 100, opacity: 1, anchorX: null, anchorY: null };
    actor.player.applyTuning(actor.tuning);
    saveState();
    editSnapshotOpen = false;
    syncPanel();
    syncPoseToolbarButtons();
  }

  function onCanvasPointerDown(event) {
    if (!panel.classList.contains('is-open')) return;

    const canvasContext = currentCanvasEditContext();
    if (!canvasContext) return;
    if (canvasContext === 'effect') {
      onEffectCanvasPointerDown(event);
      return;
    }
    const activePart = editFocusPartKey;
    if (!activePart) return;

    const point = canvasPoint(event);
    const handleHit = getEditHandleAt(point);
    if (!handleHit) return;

    event.preventDefault();
    if (handleHit.geometry.isGroup) {
      if (handleHit.mode === 'opacity') {
        pushUndoSnapshot();
        const nextOpacity = groupEditValues.opacity > 0 ? 0 : 1;
        applyCurrentGroupOpacity(nextOpacity);
        groupEditValues.opacity = nextOpacity;
        applySelected();
        renderPosePartFields();
        return;
      }

      beginUndoSnapshot();
      resetGroupTransformValues();
      canvas.style.cursor = 'grabbing';
      editHandleActiveMode = handleHit.mode;
      canvasDrag = {
        pointerId: event.pointerId,
        group: true,
        parts: createGroupCanvasDragItems(handleHit.geometry.parts),
        handle: handleHit.geometry,
        startX: point.x,
        startY: point.y,
        startAngle: Math.atan2(point.y - handleHit.geometry.anchor.y, point.x - handleHit.geometry.anchor.x),
        startDistance: Math.max(
          1,
          Math.hypot(point.x - handleHit.geometry.anchor.x, point.y - handleHit.geometry.anchor.y)
        ),
        mode: handleHit.mode,
        context: 'pose',
      };
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    editContext = canvasContext;
    editFocusPartKey = activePart;
    const editState = canvasEditState(activePart, canvasContext);
    const target = editState.target;

    const handleMode =
      handleHit.mode === 'anchor' && canvasContext !== 'part' && !isMasterPart(activePart) ? 'move' : handleHit.mode;

    if (handleMode === 'opacity') {
      pushUndoSnapshot();
      target.opacity = (target.opacity ?? 1) > 0 ? 0 : 1;
      applySelected();
      renderPartFields();
      renderPosePartFields();
      return;
    }

    beginUndoSnapshot();
    canvas.style.cursor = 'grabbing';
    editHandleActiveMode = handleMode;
    canvasDrag = {
      pointerId: event.pointerId,
      part: activePart,
      target,
      base: editState.base,
      handle: handleHit.geometry,
      startX: point.x,
      startY: point.y,
      startValues: pickDragValues(editState),
      startVisual: pickVisualValues(editState),
      startAngle: Math.atan2(point.y - handleHit.geometry.anchor.y, point.x - handleHit.geometry.anchor.x),
      mode: handleMode,
      context: canvasContext,
    };
    canvas.setPointerCapture(event.pointerId);
  }

  function currentCanvasEditContext() {
    const partOpen = partSection.classList.contains('is-open');
    const poseOpen = poseSection.classList.contains('is-open');
    const effectOpen = effectSection.classList.contains('is-open');
    if (effectOpen) return 'effect';
    if (editFocusContext === 'pose' && poseOpen) return 'pose';
    if (editFocusContext === 'part' && partOpen && activePartKeyGlobal) return 'part';
    if (editContext === 'pose' && poseOpen) return 'pose';
    if (editContext === 'part' && partOpen && activePartKeyGlobal) return 'part';
    if (partOpen) return 'part';
    if (poseOpen) return 'pose';
    return null;
  }

  function onEffectCanvasPointerDown(event) {
    ensureActiveEffectFrame();
    const point = canvasPoint(event);
    const handleHit = getEditHandleAt(point);
    if (!handleHit?.geometry?.isEffect) return;

    event.preventDefault();
    editContext = 'effect';
    const target = currentEffectFrameValue();

    if (handleHit.mode === 'opacity') {
      pushUndoSnapshot();
      writeEffectFrameValue('opacity', (target.opacity ?? 1) > 0 ? 0 : 1);
      applySelected();
      renderEffectFields();
      syncEffectPreview();
      return;
    }

    beginUndoSnapshot();
    canvas.style.cursor = 'grabbing';
    editHandleActiveMode = handleHit.mode;
    canvasDrag = {
      pointerId: event.pointerId,
      target,
      handle: handleHit.geometry,
      startX: point.x,
      startY: point.y,
      startValues: {
        x: Number(target.x || 0),
        y: Number(target.y || 0),
        w: Number(target.w || defaultEffectSize(effectSelect.value).w),
        h: Number(target.h || defaultEffectSize(effectSelect.value).h),
        rot: Number(target.rot || 0),
        opacity: Number(target.opacity ?? 1),
        anchorX: Number(target.anchorX || 0),
        anchorY: Number(target.anchorY || 0),
      },
      startAngle: Math.atan2(point.y - handleHit.geometry.anchor.y, point.x - handleHit.geometry.anchor.x),
      mode: handleHit.mode,
      context: 'effect',
    };
    canvas.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event) {
    if (!canvasDrag) {
      updateCanvasHandleHover(event);
      return;
    }
    if (canvasDrag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const point = canvasPoint(event);
    const dx = point.x - canvasDrag.startX;
    const dy = point.y - canvasDrag.startY;
    applyCanvasDrag(canvasDrag, dx, dy);
    if (!(canvasDrag.group && canvasDrag.mode === 'anchor')) {
      selectedActor.player.applyTuning(selectedActor.tuning);
      saveState();
    }
    if (canvasDrag.context === 'effect') {
      renderEffectFields();
      syncEffectPreview();
    } else if (!(canvasDrag.group && canvasDrag.mode === 'anchor')) {
      renderPartFields();
      renderPosePartFields();
    }
    refreshCanvasDragTarget();
  }

  function endCanvasDrag(event) {
    if (!canvasDrag || canvasDrag.pointerId !== event.pointerId) return;
    const wasGroupDrag = canvasDrag.group;
    const wasTemporaryAnchorDrag = canvasDrag.group && canvasDrag.mode === 'anchor';
    canvasDrag = null;
    editHandleActiveMode = null;
    if (wasGroupDrag && !wasTemporaryAnchorDrag) {
      resetGroupTransformValues();
      renderPosePartFields();
    }
    updateCanvasHandleHover(event);
    commitUndoSnapshot();
  }

  function updateCanvasHandleHover(event) {
    const hit = getEditHandleAt(canvasPoint(event));
    editHandleHover =
      hit?.mode === 'anchor' &&
      !hit.geometry?.isGroup &&
      !hit.geometry?.isEffect &&
      currentCanvasEditContext() !== 'part' &&
      !isMasterPart(editFocusPartKey)
        ? 'move'
        : hit?.mode || null;
    canvas.style.cursor = handleCursor(editHandleHover);
  }

  function handleCursor(mode) {
    return (
      {
        anchor: 'crosshair',
        move: 'grab',
        width: 'ew-resize',
        height: 'ns-resize',
        size: 'nwse-resize',
        rotate: 'grab',
        opacity: 'pointer',
      }[mode] || ''
    );
  }

  function canvasEditState(part, context) {
    const base = isMasterPart(part) ? masterPartBase() : partPositionSources(selectedActor.tuning.rig)[part];
    if (context === 'pose') {
      ensurePoseOffset(selectedActor.tuning, poseSelect.value, part);
      return {
        context,
        part,
        base,
        target: currentPoseFrameValue(part),
      };
    }

    return { context, part, base, target: base };
  }

  function createGroupCanvasDragItems(parts) {
    return parts
      .map((part) => {
        const editState = canvasEditState(part, 'pose');
        const handle = selectedActor.player.editHandles?.[part];
        if (!handle) return null;
        return {
          part,
          target: editState.target,
          base: editState.base,
          handle,
          startAnchor: { ...handle.anchor },
          startValues: pickDragValues(editState),
          startVisual: pickVisualValues(editState),
        };
      })
      .filter(Boolean);
  }

  function createCurrentGroupDrag(mode) {
    const geometry = getGroupEditHandleGeometry();
    if (!geometry) return { group: true, parts: [], handle: null, mode };
    return {
      group: true,
      parts: createGroupCanvasDragItems(geometry.parts),
      handle: geometry,
      startX: geometry.anchor.x,
      startY: geometry.anchor.y,
      startAngle: 0,
      startDistance: 100,
      mode,
      context: 'pose',
    };
  }

  function applyCurrentGroupRotation(degrees) {
    const drag = createCurrentGroupDrag('rotate');
    if (!drag.handle || !drag.parts.length) return;
    const radians = (degrees * Math.PI) / 180;
    applyCanvasGroupTransform(drag, (point) => rotatePointAround(point, drag.handle.anchor, radians), degrees, 1);
  }

  function applyCurrentGroupScale(scale) {
    const drag = createCurrentGroupDrag('size');
    if (!drag.handle || !drag.parts.length) return;
    applyCanvasGroupTransform(drag, (point) => scalePointAround(point, drag.handle.anchor, scale), 0, scale);
  }

  function applyCurrentGroupOpacity(opacity) {
    selectedPosePartKeysGlobal.forEach((part) => {
      ensurePoseOffset(selectedActor.tuning, poseSelect.value, part);
      writePoseFrameValue(part, 'opacity', opacity);
    });
  }

  function masterPartBase() {
    return { x: 0, y: 0, w: 1, h: 1, rot: 0, opacity: 1, anchorX: 0, anchorY: 0 };
  }

  function refreshCanvasDragTarget() {
    if (!canvasDrag) return;
    if (canvasDrag.group) {
      canvasDrag.parts.forEach((item) => {
        const editState = canvasEditState(item.part, 'pose');
        item.target = editState.target;
        item.base = editState.base;
      });
      return;
    }
    if (canvasDrag.context === 'effect') {
      canvasDrag.target = currentEffectFrameValue();
      return;
    }
    const editState = canvasEditState(canvasDrag.part, canvasDrag.context);
    canvasDrag.target = editState.target;
    canvasDrag.base = editState.base;
  }

  function pickDragValues(editState) {
    const target = editState.target;
    return {
      x: Number(target.x || 0),
      y: Number(target.y || 0),
      ax: Number(target.ax || 0),
      ay: Number(target.ay || 0),
      w: Number(target.w || 0),
      h: Number(target.h || 0),
      rot: Number(target.rot || 0),
      opacity: Number(target.opacity ?? 1),
      anchorX: Number(target.anchorX || 0),
      anchorY: Number(target.anchorY || 0),
    };
  }

  function pickVisualValues(editState) {
    const base = editState.base || {};
    const target = editState.target || {};
    if (editState.context === 'pose') {
      return {
        x: Number(base.x || 0) + Number(target.x || 0),
        y: Number(base.y || 0) + Number(target.y || 0),
        w: Number(base.w || 0) + Number(target.w || 0),
        h: Number(base.h || 0) + Number(target.h || 0),
        rot: Number(base.rot || 0) + Number(target.rot || 0),
        opacity: Number(target.opacity ?? 1),
      };
    }

    return pickDragValues(editState);
  }

  function applyCanvasDrag(drag, dx, dy) {
    if (drag.context === 'effect') {
      applyEffectCanvasDrag(drag, dx, dy);
      return;
    }
    if (drag.group) {
      applyCanvasGroupDrag(drag, dx, dy);
      return;
    }

    const moveLocalX = screenDeltaToLocal(dx, dy, drag.handle.moveXAxis, drag.handle.moveXUnit);
    const moveLocalY = screenDeltaToLocal(dx, dy, drag.handle.moveYAxis, drag.handle.moveYUnit);
    const handleLocalX = screenDeltaToLocal(dx, dy, drag.handle.xAxis, drag.handle.xUnit);
    const handleLocalY = screenDeltaToLocal(dx, dy, drag.handle.yAxis, drag.handle.yUnit);

    if (drag.mode === 'anchor') {
      if (isMasterPart(drag.part)) {
        drag.target.anchorX = drag.startValues.anchorX + moveLocalX;
        drag.target.anchorY = drag.startValues.anchorY + moveLocalY;
        return;
      }
      const scaleX = anchorScaleForPart(drag.target, 'ax', drag.part);
      const scaleY = anchorScaleForPart(drag.target, 'ay', drag.part);
      setPartAnchorValue(drag.target, 'ax', drag.startValues.ax + moveLocalX / scaleX, drag.part);
      setPartAnchorValue(drag.target, 'ay', drag.startValues.ay + moveLocalY / scaleY, drag.part);
      return;
    }

    if (drag.mode === 'rotate') {
      const currentX = drag.startX + dx;
      const currentY = drag.startY + dy;
      const angle = Math.atan2(currentY - drag.handle.anchor.y, currentX - drag.handle.anchor.x);
      setCanvasVisualValue(drag, 'rot', drag.startVisual.rot + ((angle - drag.startAngle) * 180) / Math.PI);
      return;
    }

    if (drag.mode === 'width') {
      setCanvasVisualValue(drag, 'w', drag.startVisual.w + canvasSizeDelta(drag, 'w', -handleLocalX));
      return;
    }

    if (drag.mode === 'height') {
      setCanvasVisualValue(drag, 'h', drag.startVisual.h + canvasSizeDelta(drag, 'h', -handleLocalY));
      return;
    }

    if (drag.mode === 'size') {
      const baseW = canvasSizePercentBase(drag, 'w');
      const baseH = canvasSizePercentBase(drag, 'h');
      const deltaW = canvasSizeDelta(drag, 'w', handleLocalX);
      const deltaH = canvasSizeDelta(drag, 'h', handleLocalY);
      const sharedPercentDelta = (deltaW / baseW + deltaH / baseH) / 2;
      setCanvasVisualValue(drag, 'w', drag.startVisual.w + baseW * sharedPercentDelta);
      setCanvasVisualValue(drag, 'h', drag.startVisual.h + baseH * sharedPercentDelta);
      return;
    }

    setCanvasVisualValue(drag, 'x', drag.startVisual.x + moveLocalX);
    setCanvasVisualValue(drag, 'y', drag.startVisual.y + moveLocalY);
  }

  function applyEffectCanvasDrag(drag, dx, dy) {
    const localX = screenDeltaToLocal(dx, dy, drag.handle.xAxis, drag.handle.xUnit);
    const localY = screenDeltaToLocal(dx, dy, drag.handle.yAxis, drag.handle.yUnit);
    const moveX = screenDeltaToLocal(dx, dy, drag.handle.moveXAxis, drag.handle.moveXUnit);
    const moveY = screenDeltaToLocal(dx, dy, drag.handle.moveYAxis, drag.handle.moveYUnit);

    if (drag.mode === 'anchor') {
      writeEffectFrameValue('anchorX', drag.startValues.anchorX + localX);
      writeEffectFrameValue('anchorY', drag.startValues.anchorY + localY);
      return;
    }

    if (drag.mode === 'rotate') {
      const currentX = drag.startX + dx;
      const currentY = drag.startY + dy;
      const angle = Math.atan2(currentY - drag.handle.anchor.y, currentX - drag.handle.anchor.x);
      writeEffectFrameValue('rot', drag.startValues.rot + ((angle - drag.startAngle) * 180) / Math.PI);
      return;
    }

    if (drag.mode === 'width') {
      writeEffectFrameValue('w', clampEffectSize('w', drag.startValues.w - localX));
      return;
    }

    if (drag.mode === 'height') {
      writeEffectFrameValue('h', clampEffectSize('h', drag.startValues.h - localY));
      return;
    }

    if (drag.mode === 'size') {
      const baseW = defaultEffectSize(effectSelect.value).w;
      const baseH = defaultEffectSize(effectSelect.value).h;
      const deltaW = localX / Math.max(1, baseW);
      const deltaH = localY / Math.max(1, baseH);
      const scaleDelta = (deltaW + deltaH) / 2;
      writeEffectFrameValue('w', clampEffectSize('w', drag.startValues.w + baseW * scaleDelta));
      writeEffectFrameValue('h', clampEffectSize('h', drag.startValues.h + baseH * scaleDelta));
      return;
    }

    writeEffectFrameValue('x', drag.startValues.x + moveX);
    writeEffectFrameValue('y', drag.startValues.y + moveY);
  }

  function clampEffectSize(prop, value) {
    const base = defaultEffectSize(effectSelect.value);
    const baseValue = prop === 'w' ? base.w : base.h;
    return clamp(Number(value), baseValue * 0.05, baseValue * 3);
  }

  function applyCanvasGroupDrag(drag, dx, dy) {
    if (drag.mode === 'anchor') {
      groupEditValues.anchorX = drag.handle.anchor.x + dx;
      groupEditValues.anchorY = drag.handle.anchor.y + dy;
      return;
    }

    if (drag.mode === 'rotate') {
      const angle = Math.atan2(drag.startY + dy - drag.handle.anchor.y, drag.startX + dx - drag.handle.anchor.x);
      const delta = angle - drag.startAngle;
      const degrees = (delta * 180) / Math.PI;
      groupEditValues.rot = degrees;
      applyCanvasGroupTransform(drag, (point) => rotatePointAround(point, drag.handle.anchor, delta), degrees, 1);
      return;
    }

    if (drag.mode === 'size') {
      const distance = Math.max(
        1,
        Math.hypot(drag.startX + dx - drag.handle.anchor.x, drag.startY + dy - drag.handle.anchor.y)
      );
      const scale = clamp(distance / drag.startDistance, 0.1, 4);
      groupEditValues.scale = scale * 100;
      applyCanvasGroupTransform(drag, (point) => scalePointAround(point, drag.handle.anchor, scale), 0, scale);
      return;
    }

    if (drag.mode === 'width') {
      const scaleX = clamp(1 - dx / 90, 0.1, 4);
      applyCanvasGroupAxisScale(drag, scaleX, 1);
      return;
    }

    if (drag.mode === 'height') {
      const scaleY = clamp(1 - dy / 90, 0.1, 4);
      applyCanvasGroupAxisScale(drag, 1, scaleY);
      return;
    }

    groupEditValues.x = dx;
    groupEditValues.y = dy;
    drag.parts.forEach((item) => {
      const moveLocalX = screenDeltaToLocal(dx, dy, item.handle.moveXAxis, item.handle.moveXUnit);
      const moveLocalY = screenDeltaToLocal(dx, dy, item.handle.moveYAxis, item.handle.moveYUnit);
      setCanvasVisualValue(
        {
          context: 'pose',
          part: item.part,
          target: item.target,
          base: item.base,
        },
        'x',
        item.startVisual.x + moveLocalX
      );
      setCanvasVisualValue(
        {
          context: 'pose',
          part: item.part,
          target: item.target,
          base: item.base,
        },
        'y',
        item.startVisual.y + moveLocalY
      );
    });
  }

  function applyCanvasGroupTransform(drag, transformPoint, rotationDelta, scale) {
    drag.parts.forEach((item) => {
      const nextAnchor = transformPoint(item.startAnchor);
      const screenDx = nextAnchor.x - item.startAnchor.x;
      const screenDy = nextAnchor.y - item.startAnchor.y;
      const moveLocalX = screenDeltaToLocal(screenDx, screenDy, item.handle.moveXAxis, item.handle.moveXUnit);
      const moveLocalY = screenDeltaToLocal(screenDx, screenDy, item.handle.moveYAxis, item.handle.moveYUnit);
      const itemDrag = {
        context: 'pose',
        part: item.part,
        target: item.target,
        base: item.base,
      };
      setCanvasVisualValue(itemDrag, 'x', item.startVisual.x + moveLocalX);
      setCanvasVisualValue(itemDrag, 'y', item.startVisual.y + moveLocalY);
      if (rotationDelta) setCanvasVisualValue(itemDrag, 'rot', item.startVisual.rot + rotationDelta);
      if (scale !== 1 && isGroupScalablePart(item.part)) {
        setCanvasVisualValue(itemDrag, 'w', item.startVisual.w * scale);
        setCanvasVisualValue(itemDrag, 'h', item.startVisual.h * scale);
      }
    });
  }

  function applyCanvasGroupAxisScale(drag, scaleX, scaleY) {
    drag.parts.forEach((item) => {
      const nextAnchor = {
        x: drag.handle.anchor.x + (item.startAnchor.x - drag.handle.anchor.x) * scaleX,
        y: drag.handle.anchor.y + (item.startAnchor.y - drag.handle.anchor.y) * scaleY,
      };
      const screenDx = nextAnchor.x - item.startAnchor.x;
      const screenDy = nextAnchor.y - item.startAnchor.y;
      const moveLocalX = screenDeltaToLocal(screenDx, screenDy, item.handle.moveXAxis, item.handle.moveXUnit);
      const moveLocalY = screenDeltaToLocal(screenDx, screenDy, item.handle.moveYAxis, item.handle.moveYUnit);
      const itemDrag = {
        context: 'pose',
        part: item.part,
        target: item.target,
        base: item.base,
      };
      setCanvasVisualValue(itemDrag, 'x', item.startVisual.x + moveLocalX);
      setCanvasVisualValue(itemDrag, 'y', item.startVisual.y + moveLocalY);
      if (isGroupScalablePart(item.part)) {
        if (scaleX !== 1) setCanvasVisualValue(itemDrag, 'w', item.startVisual.w * scaleX);
        if (scaleY !== 1) setCanvasVisualValue(itemDrag, 'h', item.startVisual.h * scaleY);
      }
    });
  }

  function rotatePointAround(point, origin, angle) {
    const x = point.x - origin.x;
    const y = point.y - origin.y;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: origin.x + x * cos - y * sin,
      y: origin.y + x * sin + y * cos,
    };
  }

  function scalePointAround(point, origin, scale) {
    return {
      x: origin.x + (point.x - origin.x) * scale,
      y: origin.y + (point.y - origin.y) * scale,
    };
  }

  function isGroupScalablePart(part) {
    return imagePartKeys().includes(part) || controlGroupPartKeys().includes(part) || isMasterPart(part);
  }

  function screenDeltaToLocal(dx, dy, axis, unit) {
    return (dx * axis.x + dy * axis.y) / Math.max(0.01, unit || 1);
  }

  function setCanvasVisualValue(drag, prop, value) {
    if (prop === 'w' || prop === 'h') {
      value = clampCanvasVisualSize(drag, prop, value);
    }

    if (drag.context === 'pose') {
      const baseValue = Number(drag.base?.[prop] || 0);
      const offset = value - baseValue;
      drag.target[prop] = offset;
      return;
    }

    drag.target[prop] = value;
  }

  function canvasSizeDelta(drag, prop, delta) {
    const base = canvasSizePercentBase(drag, prop);
    if (isMasterPart(drag.part) || controlGroupPartKeys().includes(drag.part)) return (delta / 80) * base;
    return delta;
  }

  function clampCanvasVisualSize(drag, prop, value) {
    const base = canvasSizePercentBase(drag, prop);
    return clamp(Number(value), base * 0.05, base * 3);
  }

  function canvasSizePercentBase(drag, prop) {
    if (drag.context === 'pose') {
      return Math.max(0.001, Number(drag.base?.[prop] ?? 1));
    }
    if (controlGroupPartKeys().includes(drag.part)) return 1;
    const baseProp = prop === 'w' ? 'baseW' : 'baseH';
    return Math.max(1, Number(drag.target?.[baseProp] || drag.base?.[baseProp] || drag.target?.[prop] || 1));
  }

  function setPartAnchorValue(part, prop, value, partKey) {
    const limits = partFieldLimits(prop, partKey);
    const nextValue = clamp(Number(value), limits.min, limits.max);
    const previousValue = Number(part[prop] || 0);
    const delta = nextValue - previousValue;
    const offsetProp = prop === 'ax' ? 'anchorOffsetX' : 'anchorOffsetY';
    const scale = anchorScaleForPart(part, prop, partKey);

    part[prop] = nextValue;
    part[offsetProp] = Number(part[offsetProp] || 0) + delta * (scale - 1);
    return part[prop];
  }

  function anchorScaleForPart(part, prop, partKey = '') {
    const sizeProp = prop === 'ax' ? 'w' : 'h';
    if (controlGroupPartKeys().includes(partKey)) return Math.max(0.001, Number(part[sizeProp] || 1));
    const baseProp = prop === 'ax' ? 'baseW' : 'baseH';
    const base = Math.max(1, Number(part[baseProp] || part[sizeProp] || 1));
    return Math.max(0.001, Number(part[sizeProp] || base) / base);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function syncPanel() {
    actorSelect.value = selectedActor.id;
    actorName.value = selectedActor.name;
    syncActorOptions();

    syncNumericFields(fields, selectedActor.tuning);

    renderPartFields();
    renderPosePartFields();
    renderEffectFields();
    syncMotionRows();
    syncPartPickers();
    syncAnchorDebugPart();
    syncPosePreview();
    syncEffectPreview();
    renderLayerOrder();
  }

  function syncActorOptions() {
    Array.from(actorSelect.options).forEach((option) => {
      const actor = actors.find((item) => item.id === option.value);
      option.textContent = `${actor.label} - ${actor.name}`;
    });
  }

  function openPanel() {
    syncPanel();
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;
    syncPanelToggle();
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    syncPanelToggle();
    activePartKey = null;
    activePartKeyGlobal = null;
    activePosePartKey = null;
    activePoseKeyframeId = null;
    selectedPoseSlot = null;
    activeEffectKeyframeId = null;
    selectedEffectSlot = null;
    effectFrame = null;
    stopEffectPreview();
    selectedPosePartKeysGlobal.clear();
    resetGroupEditValues();
    editFocusPartKey = null;
    editFocusContext = null;
    editHandleHover = null;
    editHandleActiveMode = null;
    canvas.style.cursor = '';
    syncPartPickers();
    actors.forEach((actor) => {
      actor.player.anchorDebugPart = null;
      actor.player.posePreview = null;
      actor.player.effectPreview = null;
    });
    document.activeElement?.blur();
  }

  function resetSelectedActorTuning() {
    pushUndoSnapshot();
    replaceObject(selectedActor.tuning, defaultTuningFor(selectedActor));
    selectedActor.name = selectedActor.label;
    selectedPosePartKeysGlobal.clear();
    activePartKeyGlobal = null;
    activePartKey = null;
    activePosePartKey = null;
    activeEffectKeyframeId = null;
    selectedEffectSlot = null;
    effectFrame = null;
    copiedEffectFrame = null;
    resetGroupEditValues();
    selectedActor.player.applyTuning(selectedActor.tuning);
    selectedActor.hp = 100;
    saveState();
    syncPanel();
  }

  function handleActorChange() {
    selectedActor = actors.find((actor) => actor.id === actorSelect.value) || playerActor;
    selectedPosePartKeysGlobal.clear();
    activePartKeyGlobal = null;
    activePartKey = null;
    activePosePartKey = null;
    activeEffectKeyframeId = null;
    selectedEffectSlot = null;
    effectFrame = null;
    copiedEffectFrame = null;
    resetGroupEditValues();
    syncPanel();
  }

  function handleActorNameInput() {
    selectedActor.name = actorName.value || selectedActor.label;
    saveState();
    syncActorOptions();
  }

  function handlePartChange() {
    editContext = 'part';
    editFocusContext = 'part';
    activePartKey = partSelect.value;
    activePartKeyGlobal = activePartKey;
    editFocusPartKey = activePartKey;
    renderPartFields();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function handlePoseChange() {
    editContext = 'pose';
    stopPosePreview();
    poseFrame = null;
    selectedPoseSlot = null;
    activePoseKeyframeId = null;
    selectedPosePartKeysGlobal.clear();
    resetGroupEditValues();
    activePosePartKey = null;
    editFocusPartKey = MASTER_PART_KEY;
    renderPosePartFields();
    syncMotionRows();
    syncPosePreview();
  }

  function handleEffectChange() {
    editContext = 'effect';
    stopEffectPreview();
    effectFrame = null;
    selectedEffectSlot = null;
    activeEffectKeyframeId = null;
    ensureActiveEffectFrame();
    renderEffectFields();
    syncEffectPreview();
  }

  function handlePosePartChange() {
    editContext = 'pose';
    editFocusContext = 'pose';
    activePosePartKey = posePartSelect.value;
    selectedPosePartKeysGlobal.clear();
    selectedPosePartKeysGlobal.add(activePosePartKey);
    resetGroupEditValues();
    editFocusPartKey = activePosePartKey;
    renderPosePartFields();
    syncPartPickers();
    syncAnchorDebugPart();
    syncPosePreview();
  }

  syncPanel();
  syncPanelToggle();
}

function defaultTuningFor(def) {
  const tuning = clone(DEFAULT_PLAYER_TUNING);
  if (def.id !== 'player') {
    tuning.speed = 150 + ACTOR_DEFS.findIndex((item) => item.id === def.id) * 18;
    tuning.jumpPower = 580;
    tuning.glideTimeMax = 0.75;
    tuning.rollDistance = 190;
    tuning.dashCooldownMax = 0.75;
  }
  return tuning;
}

function syncActorHealthCapacity(actor, refill = false) {
  const max = clamp(Math.round(Number(actor.tuning.maxHpPips ?? 5)), 1, 20);
  actor.tuning.maxHpPips = max;
  actor.maxHpPips = max;
  actor.hpPips = refill ? max : clamp(Math.round(Number(actor.hpPips || max)), 0, max);
}

function saveState() {
  saveActorState(actors);
}

function saveRankings() {
  saveStoredRankings(rankings);
}

function recordRanking(score, survivalTime = 0, kills = 0, name = playerActor.name || '주인공', message = '') {
  rankings = recordRankingEntry(rankings, score, survivalTime, kills, name, message);
}
