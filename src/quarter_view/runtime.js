import { createPerformanceView } from './performance_view.js';
import { createAttackSettingsView } from './attack_settings_view.js';
import { captureAttackRegions, groundAttackRegions } from './attack_geometry.js';
import { applyQuarterKnockback } from './knockback.js';
import { GAME_KEYS } from '../game_config_data.js';
import { createQuarterRenderer } from './renderer.js';
import { depthOf } from './camera.js';
import { alignEnemyWeaponRegions, syncEnemyWeaponFacing } from './weapon_contact.js';
import { prepareQuarterFacing } from './facing.js';
import { movementInput, preparePlaneMotion, finishPlaneMotion, enemyPlaneDirection } from './motion.js';
import { combatTargetRegions, resolveGroundCollision, sameGroundContact, groundProjectileRegion } from './spatial.js';

const MAP = { ArrowUp: 'QuarterUp', ArrowDown: 'QuarterDown', KeyZ: 'ArrowUp', KeyX: 'ArrowDown' };
export function createQuarterRuntime({ ctx, world }) {
  const renderer = createQuarterRenderer({ ctx, world });
  // Native x is a temporary movement scalar; apply world bounds only after ground projection.
  const motionWorld = Object.assign(Object.create(world), { minX: -Infinity, maxX: Infinity });
  let paused = false,
    externalPaused = false,
    previousFrozen = false,
    dirty = true,
    viewportWidth,
    viewportHeight,
    pauseForSettings = () => {},
    controlledActor;
  const frameMeter = createPerformanceView({
    button: document.querySelector('#quarterFps'),
    panel: document.querySelector('#quarterPerformance'),
    root: document.body,
    getCounters: renderer.getRenderStats,
    isPaused: () => paused || externalPaused,
  });
  document.addEventListener('visibilitychange', frameMeter.reset);
  const attackSettings = createAttackSettingsView({
    panel: document.querySelector('#quarterAttackSettings'),
    onOpen: () => pauseForSettings(),
    onChange: () => {
      renderer.resetDebugHistory();
      dirty = true;
    },
  });
  document.querySelector('#quarterHitboxes').addEventListener('click', () => {
    dirty = true;
  });
  world.quarterView = {
    motionWorld,
    prepareAttackRegions: alignEnemyWeaponRegions,
    captureAttackRegions(actor, raw, flat) {
      captureAttackRegions(actor, raw, flat);
      renderer.captureTrails(actor, raw);
    },
    beforePlayer(actor, keys, pressed) {
      controlledActor = actor;
      return preparePlaneMotion(actor, movementInput(keys), keys, pressed);
    },
    beforeEnemy(actor, target) {
      const direction = enemyPlaneDirection(actor, target);
      preparePlaneMotion(actor, direction);
    },
    afterMotion(actor) {
      finishPlaneMotion(actor, world);
      if (actor !== controlledActor) syncEnemyWeaponFacing(actor);
      actor.quarterFloorY = world.floorY;
      actor.player.quarterDepth = depthOf(actor);
    },
    distance: (a, b) => Math.hypot(a.player.x - b.player.x, depthOf(a) - depthOf(b)),
    targetRegions: combatTargetRegions,
    resolveCollision: (a, b, dimensions) => resolveGroundCollision(a, b, dimensions, world),
    sameGroundContact,
    attackRegions: groundAttackRegions,
    projectileRegion: groundProjectileRegion,
    applyKnockback: (attacker, target, region) => applyQuarterKnockback(attacker, target, region, world),
    respawn(actor, target) {
      actor.quarterDepth = Math.max(-430, Math.min(430, depthOf(target) + (Math.random() - 0.5) * 500));
      actor.player.quarterDepth = actor.quarterDepth;
      actor.quarterAim = { x: -1, z: 0 };
      actor.quarterImpulse = null;
    },
    projectEntity: renderer.projectEntity,
  };
  function syncPause() {
    frameMeter.reset();
    dirty = true;
    document.querySelector('#quarterPause').textContent = paused ? '계속하기 · P' : '일시정지 · P';
    document.querySelector('#quarterPaused').hidden = !paused;
  }
  return {
    prepareInput: (actor, keys) => prepareQuarterFacing(actor, movementInput(keys)),
    startFrame: frameMeter.start,
    finishFrame: frameMeter.finish,
    draw(frame) {
      if (externalPaused !== Boolean(frame.scenePaused)) frameMeter.reset();
      externalPaused = Boolean(frame.scenePaused);
      if (externalPaused) controlledActor?.quarterPendingInputs?.clear();
      const frozen = paused || externalPaused;
      if (frozen && previousFrozen && !dirty && viewportWidth === world.viewW && viewportHeight === world.viewH)
        return false;
      renderer.draw(frame);
      dirty = false;
      viewportWidth = world.viewW;
      viewportHeight = world.viewH;
      previousFrozen = frozen;
      return true;
    },
    mapCode: (code) => MAP[code] || code,
    gameKeys: new Set([...GAME_KEYS, 'QuarterUp', 'QuarterDown']),
    reset(actors) {
      paused = false;
      externalPaused = previousFrozen = false;
      frameMeter.reset();
      renderer.resetEffectCache();
      renderer.resetTrails();
      renderer.resetDebugHistory();
      actors.forEach((actor, index) => {
        actor.quarterFloorY = world.floorY;
        actor.quarterDepth = index === 0 ? 0 : ((index % 5) - 2) * 85;
        actor.player.quarterDepth = actor.quarterDepth;
        actor.quarterAim = { x: actor.player.facing || 1, z: 0 };
        actor.quarterImpulse = null;
        actor.quarterImpulseSerial = null;
        actor.quarterInputDirection = null;
        actor.quarterVelocityFacing = actor.player.facing || 1;
        actor.quarterPendingInputs = new Map();
        actor.quarterSynthetic = null;
        actor.quarterAttackRegions = [];
        actor.quarterAttackRawRegions = [];
        actor.quarterAttackSerial = null;
      });
      attackSettings.reset(actors);
      paused = document.querySelector('#quarterAttackSettings').open;
      syncPause();
    },
    bindPause({ isActive, clearInput }) {
      const toggle = () => {
        if (!isActive()) return;
        paused = !paused;
        clearInput();
        controlledActor?.quarterPendingInputs?.clear();
        syncPause();
      };
      pauseForSettings = () => {
        if (isActive() && !paused) toggle();
      };
      document.querySelector('#quarterPause').addEventListener('click', toggle);
      addEventListener('keydown', (event) => {
        if (event.metaKey || event.ctrlKey) controlledActor?.quarterPendingInputs?.clear();
        if (
          event.code === 'KeyP' &&
          !event.repeat &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.target.closest?.('input, textarea, select')
        ) {
          event.preventDefault();
          toggle();
        }
      });
      const pauseOnBlur = () => {
        if (isActive() && !paused) toggle();
      };
      addEventListener('blur', pauseOnBlur);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseOnBlur();
      });
    },
    isPaused: () => paused,
  };
}
