import { PuppetPlayer } from './puppetPlayer.js';
import { drawAttackTrail } from './actorEffectsRenderer.js';
import { drawActor } from './actorRenderer.js';
import { defaultTuningFor, syncActorHealthCapacity } from './actorTuning.js';
import { lineUpActors as lineUpActorPositions, placeEnemiesAhead as placeEnemyActorsAhead } from './actorPlacement.js';
import { resetPlayerActionState, updatePostRollInvulnerability } from './actorState.js';
import {
  defaultEffectSize,
  frameValue,
  interpolateEffectFrameValues,
  interpolateFrameValues,
  syncFrameAliases,
} from './animationFrames.js';
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
import {
  effectFrameAt,
  effectKeyframesFor,
  ensureEffectOffset,
  ensureEffectSettings,
  ensurePoseOffset,
  ensurePoseSettings,
  makePoseKeyframeId,
  mergeTuning,
  poseKeyframesFor,
  replaceObject,
  sortPoseKeyframes,
} from './tuningNormalize.js';
import { axisFromCanvasMatrix, transformCanvasPoint } from './screenGeometry.js';
import { clamp, clone, setPath } from './utils.js';
import { applyWorldView, drawWorld } from './worldRenderer.js';
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
import { previewTimeoutMs, timelineDurationFromFrames } from './tuningPlayback.js';
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
  syncPanelToggleState,
} from './tuningPanelDom.js';
import { isMasterPart, partLabel } from './tuningLabels.js';
import {
  effectFieldLimits,
  partFieldLimits,
  partPositionSources,
  poseFieldLimits,
  poseMotionGroups,
} from './tuningParts.js';
import { isEmptyEditableSlot, selectedOrFirstEmptySlot, syncTimelinePlaybackControls } from './tuningTimelineDom.js';
import { bindKeyframeDrag, timelinePointerValue } from './timelineDragControls.js';
import {
  createDefaultGroupEditValues,
  resetGroupTransformValues as resetGroupTransformValueState,
} from './panelEditState.js';
import { renderKeyframeTimeline } from './timelineRenderer.js';
import {
  addEffectTimelineKeyframe,
  addPoseTimelineKeyframe,
  deleteEffectTimelineKeyframe,
  deletePoseTimelineKeyframe,
  pasteEffectTimelineFrame,
  pastePoseTimelineFramePart,
  resetEffectTimelineAnimation,
  resetPoseTimelineAnimation,
} from './timelineKeyframeMutations.js';
import {
  createEffectFrameCopy,
  createPoseFrameCopy,
  poseFramePasteParts,
  selectedPoseFrameCopyMode,
  selectedPoseFrameCopyParts,
} from './timelineFrameClipboard.js';
import {
  activeTimelineT,
  timelineFrameCountFor,
  timelineLastSlot,
  timelineSlotLeft,
  timelineSlotToValue,
  timelineValueToSlot,
} from './timelineState.js';
import { createEffectPreview, createPosePreview, shouldPreviewEffect, shouldPreviewPose } from './previewState.js';
import { getCameraX, getViewTransform } from './cameraView.js';
import {
  MOVE_HANDLE_RADIUS,
  drawAnchorHandleDot,
  drawHandleArrow,
  drawHandleCircle,
  drawHandleLine,
  drawPolygon,
  handleColor,
  handleCursor,
  handleLineStart,
} from './editHandleDrawing.js';
import {
  createEffectEditHandleGeometry,
  createGroupEditHandleGeometry,
  createPartEditHandleGeometry,
  findEditHandleAt,
} from './editHandleGeometry.js';
import {
  applyCanvasGroupDrag,
  applyCanvasGroupRotation,
  applyCanvasGroupScale,
  applyCanvasPartDrag,
  applyEffectCanvasDrag,
} from './canvasDragApply.js';
import { canvasPointFromEvent } from './canvasDragMath.js';
import { pickDragValues, pickEffectDragValues, pickVisualValues } from './canvasDragState.js';
import { setPartAnchorValue } from './canvasVisualValues.js';
import { effectSizeFromPercent, effectSizePercent } from './effectVisualValues.js';
import { renderScrubGroups } from './tuningScrubControls.js';
import {
  ACTOR_DEFS,
  DEATH_RESULT_DELAY,
  GAME_KEYS,
  MASTER_PART_KEY,
  POSE_MAX_FRAMES,
  POSE_MIN_FRAMES,
  POSE_PART_KEYS,
  TUNING_FIELDS,
} from './gameConfig.js';

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
let editFocusPartKey = null;
let editFocusContext = null;
let editHandleHover = null;
let editHandleActiveMode = null;
let activePartKeyGlobal = null;
let selectedPosePartKeysGlobal = new Set();
let groupEditValues = createDefaultGroupEditValues();
let undoTuningChangeGlobal = null;
let poseFrameCopyGlobal = null;
let poseFramePasteGlobal = null;
let poseFrameSelectionActive = false;
let effectEditHandle = null;

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
    isEditPanelOpen: panelOpenForEdit(),
    hasActiveEditPart: Boolean(activeEditPartKey()),
  });
  drawWorld(ctx, world, view);

  ctx.save();
  applyWorldView(ctx, world, view);
  particleEffects.drawDust();
  actors.forEach((actor) => drawRollGhosts(ctx, actor));
  actors.forEach((actor) =>
    drawActor(ctx, world, actor, {
      selectedActor,
      activeEditPartKey,
      activeEditPartKeys,
    })
  );
  particleEffects.drawHitSparks();
  particleEffects.drawDeathParticles();
  actors.forEach((actor) => drawAttackTrail(ctx, actor, effectAssets));

  drawSettingsDebugBoxes();
  ctx.restore();

  drawEditHandles();

  syncRunHud();
  if (!settingsRankingList && !isFullStage) drawRankingHud(ctx, { rankings, battleActive, lastRecordedScore });
}

function getRunScore() {
  return calculateRunScore(runSurvivalTime, runKills);
}

function syncRunHud() {
  syncRunHudView({ survivalTime: runSurvivalTime, kills: runKills, hudSurvivalTime, hudKills });
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
  groupEditValues = createDefaultGroupEditValues();
}

function resetGroupTransformValues() {
  resetGroupTransformValueState(groupEditValues);
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
  drawPolygon(ctx, box.points, true);
  drawPolygon(ctx, box.points, false);
  ctx.fillStyle = 'rgba(255, 244, 168, 0.95)';
  ctx.font = '12px sans-serif';
  ctx.fillText(key === 'jumpAttack' ? '점공' : key.replace('attack', '') + '타', box.x + 4, box.y - 6);
  ctx.restore();
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
      ctx,
      handleLineStart(anchor, handles.width.point),
      handles.width.point,
      handleColor('width', activeMode)
    );
  if (handles.height)
    drawHandleArrow(
      ctx,
      handleLineStart(anchor, handles.height.point),
      handles.height.point,
      handleColor('height', activeMode)
    );
  if (handles.size)
    drawHandleArrow(
      ctx,
      handleLineStart(anchor, handles.size.point),
      handles.size.point,
      handleColor('size', activeMode)
    );
  if (handles.rotate)
    drawHandleLine(
      ctx,
      handleLineStart(anchor, handles.rotate.point),
      handles.rotate.point,
      handleColor('rotate', activeMode)
    );
  if (handles.opacity)
    drawHandleLine(
      ctx,
      handleLineStart(anchor, handles.opacity.point),
      handles.opacity.point,
      handleColor('opacity', activeMode)
    );

  if (handles.rotate) drawHandleCircle(ctx, handles.rotate.point, 9, handleColor('rotate', activeMode), true);
  if (handles.opacity) drawHandleCircle(ctx, handles.opacity.point, 8, handleColor('opacity', activeMode), true);

  if (handles.move) drawHandleCircle(ctx, anchor, MOVE_HANDLE_RADIUS, handleColor('move', activeMode), false);
  if (handles.anchor) drawAnchorHandleDot(ctx, anchor, handleColor('anchor', activeMode));
  ctx.restore();
}

function getEditHandleGeometry() {
  if (!panelOpenForEdit()) return null;

  const effectGeometry = getEffectEditHandleGeometry();
  if (effectGeometry) return effectGeometry;

  if (!editFocusPartKey) return null;

  const groupGeometry = getGroupEditHandleGeometry();
  if (groupGeometry) return groupGeometry;

  return createPartEditHandleGeometry({
    editFocusPartKey,
    editHandleInfo: selectedActor.player.editHandles?.[editFocusPartKey],
    poseFrameSelectionActive,
  });
}

function getEffectEditHandleGeometry() {
  if (currentOpenEditContext() !== 'effect' || !effectEditHandle) return null;
  return createEffectEditHandleGeometry(effectEditHandle);
}

function getGroupEditHandleGeometry() {
  return createGroupEditHandleGeometry({
    editFocusContext,
    selectedPosePartKeys: selectedPosePartKeysGlobal,
    poseFrameSelectionActive,
    editHandles: selectedActor.player.editHandles,
    hitRegions: selectedActor.player.hitRegions,
    groupEditValues,
  });
}

function getEditHandleAt(point) {
  return findEditHandleAt(point, getEditHandleGeometry());
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

  const syncPanelToggle = () => syncPanelToggleState(panel, openButton);

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
      return effectSizePercent(effectSelect.value, frame, prop);
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
      writeEffectFrameValue(prop, effectSizeFromPercent(effectSelect.value, prop, value));
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
    const id = addPoseTimelineKeyframe(selectedActor.tuning, poseSelect.value, t);
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
    deletePoseTimelineKeyframe(selectedActor.tuning, poseSelect.value, activePoseKeyframeId);
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
    resetPoseTimelineAnimation(selectedActor.tuning, poseSelect.value);
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
    const selectedParts = selectedPoseFrameCopyParts(selectedPosePartKeysGlobal, activePosePartKey);
    copiedPoseFrame = createPoseFrameCopy({
      tuning: selectedActor.tuning,
      poseKey: poseSelect.value,
      id,
      reference,
      selectedParts,
      mode: selectedPoseFrameCopyMode(selectedPosePartKeysGlobal, activePosePartKey),
      activePosePartKey,
    });
    syncPoseToolbarButtons();
  }

  function pasteActivePoseFrame() {
    if (!copiedPoseFrame || !poseSection.classList.contains('is-open')) return;
    const id = activePoseKeyframeId || poseFrame;
    if (!isPoseTimelineFrameId(id)) return;

    beginUndoSnapshot();
    const pasteParts = poseFramePasteParts(copiedPoseFrame, selectedPosePartKeysGlobal, activePosePartKey);

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
    pastePoseTimelineFramePart({
      frames,
      id,
      sourceFrame: copiedPoseFrame.parts[from],
      ensureKeyframe: ensurePoseKeyframeForPart,
    });
  }

  function isPoseTimelineFrameId(id) {
    return Boolean(id && poseTimelineKeyframes().some((frame) => frame.id === id));
  }

  function renderPoseTimeline() {
    renderPoseSettings();
    const frameCount = getPoseFrameCount();
    renderKeyframeTimeline({
      track: poseTimelineTrack,
      frameCount,
      keyframes: poseTimelineKeyframes(),
      selectedSlot: selectedPoseSlot,
      activeKeyframeId: activePoseKeyframeId,
      fixedFrame: poseFrame,
      lastSlot: getPoseLastSlot(),
      toSlot: tToSlot,
      slotToLeft,
      selectSlot: selectPoseSlot,
      bindDrag: bindPoseKeyframeDrag,
      addButton: poseAddKeyframe,
      deleteButton: poseDeleteKeyframe,
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
    bindKeyframeDrag(button, id, {
      selectKeyframe: selectPoseKeyframe,
      selectForDrag: selectPoseKeyframeForDrag,
      beginUndo: beginUndoSnapshot,
      moveKeyframe: movePoseKeyframe,
      pointerT: timelinePointerT,
      finishUndo: commitUndoSnapshot,
      afterFinish: () => {
        if (activePosePartKey) renderPosePartFields();
      },
    });
  }

  function timelinePointerT(event) {
    return timelinePointerValue(event, poseTimelineTrack, getPoseFrameCount(), getPoseLastSlot());
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
    selectedActor.player.posePreview = createPosePreview({
      pose: poseSelect.value,
      playing: false,
      t,
      now: performance.now(),
    });
    poseTimelineTrack.querySelectorAll(`[data-keyframe-id="${id}"]`).forEach((button) => {
      button.style.left = `${slotToLeft(nextSlot)}%`;
      button.title = `${nextSlot + 1}칸`;
    });
  }

  function selectPoseKeyframeForDrag(id) {
    activePoseKeyframeId = id;
    stopPosePreview();
    const t = getActivePoseT();
    selectedActor.player.posePreview = createPosePreview({
      pose: poseSelect.value,
      playing: false,
      t,
      now: performance.now(),
    });
    poseDeleteKeyframe.disabled = false;
    poseTimelineTrack.querySelectorAll('.pose-keyframe').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.keyframeId === id);
    });
  }

  function getActivePoseT() {
    const frames = activePoseKeyframeId
      ? selectedActor.tuning.poseOffsets[poseSelect.value]?.[activePosePartKey || POSE_PART_KEYS[0]]
      : null;
    return activeTimelineT({
      activeKeyframeId: activePoseKeyframeId,
      selectedSlot: selectedPoseSlot,
      fixedFrame: poseFrame,
      keyframes: poseTimelineKeyframes(),
      selectedKeyframe: frames?.keyframes?.find((frame) => frame.id === activePoseKeyframeId),
      frameCount: getPoseFrameCount(),
    });
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
    return timelineValueToSlot(t, getPoseFrameCount());
  }

  function slotToT(slot) {
    return timelineSlotToValue(slot, getPoseFrameCount());
  }

  function slotToLeft(slot) {
    return timelineSlotLeft(slot, getPoseFrameCount());
  }

  function getPoseFrameCount() {
    ensurePoseSettings(selectedActor.tuning);
    return timelineFrameCountFor(selectedActor.tuning.poseSettings, poseSelect.value);
  }

  function getPoseLastSlot() {
    return timelineLastSlot(getPoseFrameCount());
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
    const hasPosePreview = shouldPreviewPose({
      playing: posePreviewPlaying,
      activeKeyframeId: activePoseKeyframeId,
      fixedFrame: poseFrame,
      selectedSlot: selectedPoseSlot,
    });
    if (!hasPosePreview) {
      posePlayback.classList.toggle('is-active', false);
      renderPoseTimeline();
      return;
    }
    const settings = selectedActor.tuning.poseSettings[poseSelect.value] || {};
    selectedActor.player.posePreview = createPosePreview({
      pose: poseSelect.value,
      fixedFrame: activePoseKeyframeId ? null : poseFrame,
      playing: posePreviewPlaying,
      loop: settings.playback !== 'once',
      t: activePoseKeyframeId || selectedPoseSlot !== null ? getActivePoseT() : null,
      now: performance.now(),
    });
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
    const t = effectSlotToT(slot);
    const id = addEffectTimelineKeyframe(selectedActor.tuning, effectSelect.value, t);
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
    deleteEffectTimelineKeyframe(selectedActor.tuning, effectSelect.value, activeEffectKeyframeId);
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
    resetEffectTimelineAnimation(selectedActor.tuning, effectSelect.value);
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
    copiedEffectFrame = createEffectFrameCopy(effectSelect.value, source);
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
    pasteEffectTimelineFrame({
      effect,
      effectKey: effectSelect.value,
      id,
      sourceFrame: copiedEffectFrame.frame,
      ensureKeyframe: ensureEffectKeyframe,
    });
  }

  function isEffectTimelineFrameId(id) {
    return Boolean(id && effectTimelineKeyframes().some((frame) => frame.id === id));
  }

  function renderEffectTimeline() {
    renderEffectSettings();
    const frameCount = getEffectFrameCount();
    renderKeyframeTimeline({
      track: effectTimelineTrack,
      frameCount,
      keyframes: effectTimelineKeyframes(),
      selectedSlot: selectedEffectSlot,
      activeKeyframeId: activeEffectKeyframeId,
      fixedFrame: effectFrame,
      lastSlot: getEffectLastSlot(),
      toSlot: effectTToSlot,
      slotToLeft: effectSlotToLeft,
      selectSlot: selectEffectSlot,
      bindDrag: bindEffectKeyframeDrag,
      addButton: effectAddKeyframe,
      deleteButton: effectDeleteKeyframe,
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
    bindKeyframeDrag(button, id, {
      selectKeyframe: selectEffectKeyframe,
      selectForDrag: selectEffectKeyframeForDrag,
      beginUndo: beginUndoSnapshot,
      moveKeyframe: moveEffectKeyframe,
      pointerT: effectTimelinePointerT,
      finishUndo: commitUndoSnapshot,
      afterFinish: renderEffectFields,
    });
  }

  function effectTimelinePointerT(event) {
    return timelinePointerValue(event, effectTimelineTrack, getEffectFrameCount(), getEffectLastSlot());
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
    selectedActor.player.effectPreview = createEffectPreview({
      key: effectSelect.value,
      playing: false,
      t,
      now: performance.now(),
    });
    effectTimelineTrack.querySelectorAll(`[data-keyframe-id="${id}"]`).forEach((button) => {
      button.style.left = `${effectSlotToLeft(nextSlot)}%`;
      button.title = `${nextSlot + 1}칸`;
    });
  }

  function selectEffectKeyframeForDrag(id) {
    activeEffectKeyframeId = id;
    stopEffectPreview();
    const t = getActiveEffectT();
    selectedActor.player.effectPreview = createEffectPreview({
      key: effectSelect.value,
      playing: false,
      t,
      now: performance.now(),
    });
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
    return activeTimelineT({
      activeKeyframeId: activeEffectKeyframeId,
      selectedSlot: selectedEffectSlot,
      fixedFrame: effectFrame,
      keyframes: effectTimelineKeyframes(),
      selectedKeyframe: selectedActor.tuning.effectOffsets[effectSelect.value]?.keyframes?.find(
        (frame) => frame.id === activeEffectKeyframeId
      ),
      frameCount: getEffectFrameCount(),
    });
  }

  function effectTToSlot(t) {
    return timelineValueToSlot(t, getEffectFrameCount());
  }

  function effectSlotToT(slot) {
    return timelineSlotToValue(slot, getEffectFrameCount());
  }

  function effectSlotToLeft(slot) {
    return timelineSlotLeft(slot, getEffectFrameCount());
  }

  function getEffectFrameCount() {
    ensureEffectSettings(selectedActor.tuning);
    return timelineFrameCountFor(selectedActor.tuning.effectSettings, effectSelect.value);
  }

  function getEffectLastSlot() {
    return timelineLastSlot(getEffectFrameCount());
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
    const hasEffectPreview = shouldPreviewEffect({
      playing: effectPreviewPlaying,
      activeKeyframeId: activeEffectKeyframeId,
      fixedFrame: effectFrame,
      selectedSlot: selectedEffectSlot,
    });
    if (!hasEffectPreview) {
      effectPlayback.classList.toggle('is-active', false);
      renderEffectTimeline();
      return;
    }
    selectedActor.player.effectPreview = createEffectPreview({
      key: effectSelect.value,
      playing: effectPreviewPlaying,
      t: effectPreviewPlaying ? null : getActiveEffectT(),
      now: performance.now(),
    });
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
    groupEditValues = snapshot.groupEditValues ? clone(snapshot.groupEditValues) : createDefaultGroupEditValues();
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

    const point = canvasPointFromEvent(canvas, event);
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
    const point = canvasPointFromEvent(canvas, event);
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
      startValues: pickEffectDragValues(target, effectSelect.value),
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
    const point = canvasPointFromEvent(canvas, event);
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
    const hit = getEditHandleAt(canvasPointFromEvent(canvas, event));
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
    applyCanvasGroupRotation(drag, degrees);
  }

  function applyCurrentGroupScale(scale) {
    const drag = createCurrentGroupDrag('size');
    if (!drag.handle || !drag.parts.length) return;
    applyCanvasGroupScale(drag, scale);
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

  function applyCanvasDrag(drag, dx, dy) {
    if (drag.context === 'effect') {
      applyEffectCanvasDrag(drag, dx, dy, effectSelect.value, writeEffectFrameValue);
      return;
    }
    if (drag.group) {
      applyCanvasGroupDrag(drag, dx, dy, groupEditValues);
      return;
    }

    applyCanvasPartDrag(drag, dx, dy);
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

  function clearPanelSelectionState({ clearCopiedEffect = false } = {}) {
    selectedPosePartKeysGlobal.clear();
    activePartKeyGlobal = null;
    activePartKey = null;
    activePosePartKey = null;
    activePoseKeyframeId = null;
    selectedPoseSlot = null;
    activeEffectKeyframeId = null;
    selectedEffectSlot = null;
    effectFrame = null;
    if (clearCopiedEffect) copiedEffectFrame = null;
    resetGroupEditValues();
  }

  function clearActorPreviewState() {
    actors.forEach((actor) => {
      actor.player.anchorDebugPart = null;
      actor.player.posePreview = null;
      actor.player.effectPreview = null;
    });
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    syncPanelToggle();
    clearPanelSelectionState();
    stopEffectPreview();
    editFocusPartKey = null;
    editFocusContext = null;
    editHandleHover = null;
    editHandleActiveMode = null;
    canvas.style.cursor = '';
    syncPartPickers();
    clearActorPreviewState();
    document.activeElement?.blur();
  }

  function resetSelectedActorTuning() {
    pushUndoSnapshot();
    replaceObject(selectedActor.tuning, defaultTuningFor(selectedActor));
    selectedActor.name = selectedActor.label;
    clearPanelSelectionState({ clearCopiedEffect: true });
    selectedActor.player.applyTuning(selectedActor.tuning);
    selectedActor.hp = 100;
    saveState();
    syncPanel();
  }

  function handleActorChange() {
    selectedActor = actors.find((actor) => actor.id === actorSelect.value) || playerActor;
    clearPanelSelectionState({ clearCopiedEffect: true });
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

function saveState() {
  saveActorState(actors);
}

function saveRankings() {
  saveStoredRankings(rankings);
}

function recordRanking(score, survivalTime = 0, kills = 0, name = playerActor.name || '주인공', message = '') {
  rankings = recordRankingEntry(rankings, score, survivalTime, kills, name, message);
}
