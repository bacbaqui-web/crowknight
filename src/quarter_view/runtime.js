import { createAttackSettingsView } from './attack_settings_view.js';
import { captureAttackRegions, groundAttackRegions } from './attack_geometry.js';
import { applyQuarterKnockback } from './knockback.js';
import { GAME_KEYS } from '../game_config_data.js';
import { createQuarterRenderer } from './renderer.js';
import { depthOf } from './camera.js';
import { movementInput, preparePlaneMotion, finishPlaneMotion, enemyPlaneDirection } from './motion.js';
import { combatTargetRegions, resolveGroundCollision, sameGroundContact, groundProjectileRegion } from './spatial.js';

const MAP = { ArrowUp: 'QuarterUp', ArrowDown: 'QuarterDown', KeyZ: 'ArrowUp', KeyX: 'ArrowDown' };
export function createQuarterRuntime({ ctx, world }) {
  const renderer = createQuarterRenderer({ ctx, world });
  let paused = false,
    dirty = true,
    viewportWidth,
    viewportHeight,
    pauseForSettings = () => {};
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
    captureAttackRegions,
    beforePlayer: (actor, keys, pressed) => preparePlaneMotion(actor, movementInput(keys), keys, pressed),
    beforeEnemy(actor, target) {
      const direction = enemyPlaneDirection(actor, target);
      preparePlaneMotion(actor, direction);
    },
    afterMotion(actor) {
      finishPlaneMotion(actor);
      actor.quarterFloorY = world.floorY;
      actor.player.quarterDepth = depthOf(actor);
    },
    distance: (a, b) => Math.hypot(a.player.x - b.player.x, depthOf(a) - depthOf(b)),
    targetRegions: combatTargetRegions,
    resolveCollision: resolveGroundCollision,
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
    dirty = true;
    document.querySelector('#quarterPause').textContent = paused ? '계속하기 · P' : '일시정지 · P';
    document.querySelector('#quarterPaused').hidden = !paused;
  }
  return {
    draw(frame) {
      if (paused && !dirty && viewportWidth === world.viewW && viewportHeight === world.viewH) return;
      renderer.draw(frame);
      dirty = false;
      viewportWidth = world.viewW;
      viewportHeight = world.viewH;
    },
    mapCode: (code) => MAP[code] || code,
    gameKeys: new Set([...GAME_KEYS, 'QuarterUp', 'QuarterDown']),
    reset(actors) {
      paused = false;
      renderer.resetDebugHistory();
      actors.forEach((actor, index) => {
        actor.quarterFloorY = world.floorY;
        actor.quarterDepth = index === 0 ? 0 : ((index % 5) - 2) * 85;
        actor.player.quarterDepth = actor.quarterDepth;
        actor.quarterAim = { x: actor.player.facing || 1, z: 0 };
        actor.quarterImpulse = null;
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
        syncPause();
      };
      pauseForSettings = () => {
        if (isActive() && !paused) toggle();
      };
      document.querySelector('#quarterPause').addEventListener('click', toggle);
      addEventListener('keydown', (event) => {
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
