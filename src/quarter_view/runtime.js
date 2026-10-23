import { GAME_KEYS } from '../game_config_data.js';
import { createQuarterRenderer } from './renderer.js';
import { depthOf } from './camera.js';
import { movementInput, preparePlaneMotion, finishPlaneMotion, enemyPlaneDirection } from './motion.js';
import { combatTargetRegions, resolveGroundCollision, sameGroundContact } from './spatial.js';

const MAP = { ArrowUp: 'QuarterUp', ArrowDown: 'QuarterDown', KeyZ: 'ArrowUp', KeyX: 'ArrowDown' };
export function createQuarterRuntime({ ctx, world }) {
  const renderer = createQuarterRenderer({ ctx, world });
  let paused = false;
  world.quarterView = {
    beforePlayer: (actor, keys, pressed) => preparePlaneMotion(actor, movementInput(keys), keys, pressed),
    beforeEnemy(actor, target) {
      const direction = enemyPlaneDirection(actor, target);
      preparePlaneMotion(actor, direction);
    },
    afterMotion(actor) {
      finishPlaneMotion(actor);
      actor.player.quarterDepth = depthOf(actor);
    },
    distance: (a, b) => Math.hypot(a.player.x - b.player.x, depthOf(a) - depthOf(b)),
    targetRegions: combatTargetRegions,
    resolveCollision: resolveGroundCollision,
    sameGroundContact,
    afterHit(attacker, target) {
      const axis = attacker.quarterAim || { x: attacker.player.facing, z: 0 };
      // Reaction velocity is signed in the original side-view coordinate system.
      const sign = (attacker.player.facing || 1) * (target.player.facing || 1);
      target.quarterImpulse = { x: axis.x * sign, z: axis.z * sign };
    },
    respawn(actor, target) {
      actor.quarterDepth = Math.max(-430, Math.min(430, depthOf(target) + (Math.random() - 0.5) * 500));
      actor.player.quarterDepth = actor.quarterDepth;
      actor.quarterAim = { x: -1, z: 0 };
      actor.player.quarterAim = { ...actor.quarterAim };
      actor.quarterImpulse = null;
    },
    projectEntity: renderer.projectEntity,
  };
  function syncPause() {
    document.querySelector('#quarterPause').textContent = paused ? '계속하기 · P' : '일시정지 · P';
    document.querySelector('#quarterPaused').hidden = !paused;
  }
  return {
    draw: renderer.draw,
    mapCode: (code) => MAP[code] || code,
    gameKeys: new Set([...GAME_KEYS, 'QuarterUp', 'QuarterDown']),
    reset(actors) {
      paused = false;
      actors.forEach((actor, index) => {
        actor.quarterDepth = index === 0 ? 0 : ((index % 5) - 2) * 85;
        actor.player.quarterDepth = actor.quarterDepth;
        actor.quarterAim = { x: actor.player.facing || 1, z: 0 };
        actor.player.quarterAim = { ...actor.quarterAim };
        actor.quarterImpulse = null;
        actor.quarterSynthetic = null;
      });
      syncPause();
    },
    bindPause({ isActive, clearInput }) {
      const toggle = () => {
        if (!isActive()) return;
        paused = !paused;
        clearInput();
        syncPause();
      };
      document.querySelector('#quarterPause').addEventListener('click', toggle);
      addEventListener('keydown', (event) => {
        if (
          event.code === 'KeyP' &&
          !event.repeat &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.target.closest?.('input, textarea')
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
