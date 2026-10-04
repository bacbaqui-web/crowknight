import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectSaveQueue } from '../src/project_save_queue.js';

function queue(write) {
  const status = [];
  const state = createProjectSaveQueue({
    write,
    onStatus: (result) => status.push(result),
    setTimer: () => 1,
    clearTimer() {},
  });
  return { ...state, status };
}

test('실패한 저장은 같은 변경 내용으로 재시도하고 성공 전까지 dirty다', async () => {
  const writes = [];
  const saves = queue(async (value) => {
    writes.push(value);
    return writes.length === 1 ? { ok: false, error: 'offline' } : { ok: true, revision: 'saved' };
  });
  saves.schedule('changed state');
  await assert.rejects(saves.flush(), /offline/);
  assert.equal(saves.isDirty(), true);
  await saves.retry();
  assert.deepEqual(writes, ['changed state', 'changed state']);
  assert.equal(saves.isDirty(), false);
});

test('이전 저장을 기다리는 동안 수정해도 flush가 마지막 변경까지 저장한다', async () => {
  let finish;
  const gate = new Promise((resolve) => {
    finish = resolve;
  });
  const writes = [];
  const saves = queue(async (value) => {
    writes.push(value);
    if (value === 'first') await gate;
    return { ok: true, revision: value };
  });
  saves.schedule('first');
  const saving = saves.flush();
  await Promise.resolve();
  saves.schedule('last');
  finish();
  assert.equal((await saving).revision, 'last');
  assert.deepEqual(writes, ['first', 'last']);
  assert.equal(saves.isDirty(), false);
  assert.equal(saves.status.at(-1).revision, 'last');
});

test('실패한 옛 변경 대신 새 변경을 저장하고 옛 실패를 재시도하지 않는다', async () => {
  const writes = [];
  const saves = queue(async (value) => {
    writes.push(value);
    return value === 'old' ? { ok: false, error: 'failed' } : { ok: true };
  });
  saves.schedule('old');
  await assert.rejects(saves.flush());
  saves.schedule('new');
  await saves.retry();
  await saves.retry();
  assert.deepEqual(writes, ['old', 'new']);
});
