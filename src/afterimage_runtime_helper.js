import { clone } from './common_helper.js';
import { activeActionFormulaAtProgress } from './formula_runtime_engine.js';
import { timelineFrameCount, timelineFrameDelta } from './timeline_playback_helper.js';

const PLAYER_SNAPSHOT_KEYS = [
  'x',
  'y',
  'facing',
  'state',
  'stateTime',
  'animTime',
  'fallbackActionKey',
  'customActionKey',
  'customActionElapsed',
  'customActionTime',
  'customActionDuration',
  'customActionTriggerMode',
  'customActionFacing',
  'customActionViewFacing',
  'customActionRepeatRelease',
  'customActionBlend',
  'actionPreview',
];

export function updateFormulaAfterimages(actors = [], dt = 0) {
  actors.forEach((actor) => updateActorAfterimages(actor, dt));
}

export function drawFormulaAfterimages(ctx, actor) {
  if (!actor?.afterimages?.length || !actor?.player) return;

  const player = actor.player;
  const liveState = capturePlayerSnapshot(player);
  const liveRuntimeDrawState = captureRuntimeDrawState(player);

  actor.afterimages
    .slice()
    .reverse()
    .forEach((ghost) => {
      const alpha = ghostAlpha(ghost);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha *= alpha;
      applyPlayerSnapshot(player, ghost.snapshot);
      player.afterimageTintColor = ghost.color;
      player.afterimageTintOpacity = ghost.colorOpacity;
      player.anchorDebugPart = null;
      player.debugInteractionObjects = false;
      player.glowPart = null;
      player.glowParts = [];
      player.draw(ctx);
      ctx.restore();
    });

  applyPlayerSnapshot(player, liveState);
  applyRuntimeDrawState(player, liveRuntimeDrawState);
}

function updateActorAfterimages(actor, dt) {
  if (!actor?.player) return;
  const frameDelta = timelineFrameDelta(dt);
  actor.afterimages = (actor.afterimages || [])
    .map((ghost) => ({
      ...ghost,
      lifeFrames: Number(ghost.lifeFrames || 0) - frameDelta,
    }))
    .filter((ghost) => ghost.lifeFrames > 0);

  const formula = activeAfterimageFormula(actor);
  if (!formula || formula.amount <= 0 || formula.opacity <= 0) {
    actor.afterimageSpawnFrames = 0;
    actor.afterimageActiveSignature = '';
    return;
  }

  const ghostsPerFrame = Math.max(1, Math.round(Number(formula.amount || 1)));
  const fadeFrames = Math.max(1, Math.round(Number(formula.fadeFrames || 1)));
  const maxGhosts = Math.max(1, Math.ceil(fadeFrames * ghostsPerFrame));
  const signature = afterimageSignature(actor, formula);
  if (actor.afterimageActiveSignature !== signature) {
    actor.afterimageSpawnFrames = 1;
    actor.afterimageActiveSignature = signature;
  } else {
    actor.afterimageSpawnFrames = Number(actor.afterimageSpawnFrames || 0) + frameDelta;
  }

  const spawnCount = Math.floor(actor.afterimageSpawnFrames * ghostsPerFrame);
  if (spawnCount <= 0) return;
  actor.afterimageSpawnFrames -= spawnCount / ghostsPerFrame;
  for (let index = 0; index < spawnCount; index += 1) {
    actor.afterimages.unshift(createAfterimageGhost(actor.player, formula, fadeFrames));
  }
  actor.afterimages.length = Math.min(actor.afterimages.length, maxGhosts);
}

function activeAfterimageFormula(actor) {
  const player = actor.player;
  const actionKey = player.actionKey;
  const settings = player.actionSettings?.[actionKey] || {};
  const frameCount = timelineFrameCount(settings);
  const progress = player.getActionFrameProgress?.() || 0;
  return activeActionFormulaAtProgress(settings, 'afterimage', progress, frameCount);
}

function createAfterimageGhost(player, formula, fadeFrames) {
  return {
    snapshot: capturePlayerSnapshot(player),
    color: formula.color || '#8edab8',
    opacity: Math.max(0, Math.min(1, Number(formula.opacity ?? 0.35))),
    colorOpacity: Math.max(0, Math.min(1, Number(formula.colorOpacity ?? 0.35))),
    lifeFrames: fadeFrames,
    maxLifeFrames: fadeFrames,
  };
}

function capturePlayerSnapshot(player) {
  return Object.fromEntries(
    PLAYER_SNAPSHOT_KEYS.map((key) => [
      key,
      key === 'customActionRepeatRelease' || key === 'customActionBlend' || key === 'actionPreview'
        ? clone(player[key] || null)
        : player[key],
    ])
  );
}

function applyPlayerSnapshot(player, snapshot = {}) {
  PLAYER_SNAPSHOT_KEYS.forEach((key) => {
    player[key] =
      key === 'customActionRepeatRelease' || key === 'customActionBlend' || key === 'actionPreview'
        ? clone(snapshot[key] || null)
        : snapshot[key];
  });
}

function captureRuntimeDrawState(player) {
  return {
    afterimageTintColor: player.afterimageTintColor,
    afterimageTintOpacity: player.afterimageTintOpacity,
    anchorDebugPart: player.anchorDebugPart,
    debugInteractionObjects: player.debugInteractionObjects,
    glowPart: player.glowPart,
    glowParts: Array.isArray(player.glowParts) ? [...player.glowParts] : player.glowParts,
  };
}

function applyRuntimeDrawState(player, state) {
  player.afterimageTintColor = state.afterimageTintColor;
  player.afterimageTintOpacity = state.afterimageTintOpacity;
  player.anchorDebugPart = state.anchorDebugPart;
  player.debugInteractionObjects = state.debugInteractionObjects;
  player.glowPart = state.glowPart;
  player.glowParts = Array.isArray(state.glowParts) ? [...state.glowParts] : state.glowParts;
}

function ghostAlpha(ghost) {
  const life = Math.max(0, Number(ghost.lifeFrames || 0));
  const maxLife = Math.max(0.0001, Number(ghost.maxLifeFrames || 1));
  return (life / maxLife) * Math.max(0, Math.min(1, Number(ghost.opacity || 0)));
}

function afterimageSignature(actor, formula) {
  return [
    actor.player.actionKey,
    formula.startFrame,
    formula.endFrame,
    formula.amount,
    formula.opacity,
    formula.color,
    formula.colorOpacity,
    formula.fadeFrames,
  ].join(':');
}
