import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { drawPuppetImagePart } from '../src/actor_renderer.js';

const draft = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url)));

function spearman(progress, facing = 1) {
  const player = new PuppetPlayer(0, 0, {});
  player.applyTuning(draft.actors.spearman.tuning);
  player.facing = facing;
  player.customActionKey = 'customAction2';
  player.customActionDuration = 1.2;
  player.customActionTime = 1.2 * (1 - progress);
  player.getActionFrameProgress = () => progress;
  return player;
}

test('창잡이는 준비/회수 때 공격하지 않고 찌르는 구간에만 판정한다', () => {
  for (const progress of [0, 0.3, 0.9, 1]) {
    assert.equal(spearman(progress).attackInteractionRegions.length, 0);
  }
  assert.ok(spearman(0.55).attackInteractionRegions.length > 0);
});

test('방패 없는 캐릭터는 이미지가 없는 선택 파츠를 건너뛴다', () => {
  assert.doesNotThrow(() => drawPuppetImagePart({}, {}, undefined, {}, 0, 0, 0, 'shield'));
});
