import assert from 'node:assert/strict';
import test from 'node:test';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import {
  applyCustomActionVelocityModifier,
  applyCustomActionTargetMove,
} from '../src/action_movement_formula_helper.js';
import { blendActionOffset, interpolateInteractionValues } from '../src/actor_runtime_pose_helper.js';
import { resolveCollisionInteractions } from '../src/combat_collision_helper.js';
import { createInteractionRegionFrameCache } from '../src/combat_cache_helper.js';
import { ACTION_FPS } from '../src/game_config_data.js';
import { bindKeyboardControls } from '../src/input_control_controller.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  return value;
}

for (const fixture of JSON.parse(readFileSync(new URL('./fixtures/tuning-normalization.json', import.meta.url)))) {
  test(`저장 호환성: ${fixture.name} 정규화 결과가 리팩토링 전과 같다`, () => {
    const now = Date.now;
    const random = Math.random;
    Date.now = () => 1700000000000;
    Math.random = () => 0.25;
    try {
      const result = mergeTuning(
        defaultTuningFor({ id: 'player_01', group: 'players', type: 'player' }),
        fixture.saved
      );
      const hash = createHash('sha256')
        .update(JSON.stringify(canonical(result)))
        .digest('hex');
      assert.equal(hash, fixture.sha256);
    } finally {
      Date.now = now;
      Math.random = random;
    }
  });
}

function playerWithFormula(formula) {
  return {
    actions: [{ key: 'skill' }],
    actionSettings: { skill: { duration: 1, playback: 'loop', formulas: [formula] } },
    customActionKey: 'skill',
    customActionTriggerMode: 'pressLoop',
    customActionDuration: 1,
    customActionElapsed: 0,
    facing: 1,
    customActionFacing: 1,
    x: 10,
    y: 100,
    floorY: 100,
    vx: 0,
    vy: 0,
    onGround: true,
  };
}

test('반복 Action 경계를 넘는 이동 속도 수식의 프레임 누적을 유지한다', () => {
  const player = playerWithFormula({
    type: 'velocity',
    enabled: true,
    x: 2,
    y: 0,
    mode: 'add',
    startFrame: 1,
    endFrame: 30,
  });
  player.customActionElapsed = 0.95;
  applyCustomActionVelocityModifier(player, 0.1);
  assert.ok(Math.abs(player.vx - 2) < 0.000001);
});

test('목표 이동은 프로젝트의 프레임 단위와 그림자 기준 좌표를 유지한다', () => {
  const player = playerWithFormula({ type: 'targetMove', enabled: true, triggerFrame: 1, x: 30, y: -6, moveFrames: 3 });
  applyCustomActionTargetMove(player, 1 / ACTION_FPS);
  assert.equal(player.x, 20);
  assert.equal(player.y, 98);
  assert.equal(player.onGround, false);
});

test('자세 회전은 350도에서 10도로 최단 경로를 따라 보간한다', () => {
  assert.equal(blendActionOffset({ rot: 350 }, { rot: 10 }, {}, 0.5).rot, 360);
  const interaction = interpolateInteractionValues({ active: 1, damage: 0 }, { active: 0, damage: 10 }, 0.5);
  assert.equal(interaction.active, 1);
  assert.equal(interaction.damage, 5);
});

test('보스와 잡몹 충돌은 보스를 밀지 않고 잡몹만 밀어낸다', () => {
  const actor = (id, group, x) => ({
    id,
    group,
    player: {
      x,
      y: 0,
      collisionInteractionRegions: [
        { x, y: 0, w: 10, h: 10, active: true, reaction: { noOverlap: true, pushPower: 1, resistance: 1 } },
      ],
    },
  });
  const boss = actor('boss', 'bosses', 0);
  const mob = actor('mob', 'mobs', 5);
  resolveCollisionInteractions([boss, mob], createInteractionRegionFrameCache());
  assert.equal(boss.player.x, 0);
  assert.equal(mob.player.x, 10);
});

test('키 입력 후 포커스를 잃으면 이동/방어 키와 누른 키 상태를 해제한다', () => {
  const handlers = {};
  globalThis.addEventListener = (name, fn) => {
    handlers[name] = fn;
  };
  globalThis.document = {
    addEventListener(name, fn) {
      handlers[name] = fn;
    },
    hidden: false,
  };
  const keys = new Set(['ArrowRight', 'KeyE']);
  const pressed = new Set(['KeyQ']);
  bindKeyboardControls({ keys, pressed, handleShortcut: () => false });
  handlers.blur();
  assert.equal(keys.size, 0);
  assert.equal(pressed.size, 0);
  keys.add('ArrowLeft');
  document.hidden = true;
  handlers.visibilitychange();
  assert.equal(keys.size, 0);
});
