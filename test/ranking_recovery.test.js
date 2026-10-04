import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRemoteRankings } from '../src/firebase_ranking_storage_helper.js';
import { createRankingController } from '../src/ranking_controller.js';

function document(score, id = 'record') {
  return {
    name: `projects/test/databases/(default)/documents/rankingEntries/${id}`,
    fields: { score: { integerValue: String(score) }, name: { stringValue: 'player' } },
  };
}

function formController(fetch) {
  let submit;
  const button = { disabled: false };
  globalThis.window = { fetch };
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {
      throw new Error('quota');
    },
  };
  const controller = createRankingController({
    elements: {
      rankingForm: {
        addEventListener(type, callback) {
          if (type === 'submit') submit = callback;
        },
        querySelector: () => button,
      },
      rankingName: { value: 'player' },
      rankingMessage: { value: '', addEventListener() {} },
    },
    getRunResult: () => ({ score: 10, survivalTime: 2, kills: 1 }),
    getPlayerName: () => 'player',
  });
  return { controller, button, submit: () => submit({ preventDefault() {} }) };
}

test('전체 기록 120개에서 서버가 정렬한 상위 100개를 조회한다', async () => {
  const records = Array.from({ length: 120 }, (_, index) => document(index + 1, String(index)));
  globalThis.window = {
    fetch: async (url, options) => {
      assert.match(url, /documents:runQuery/);
      const query = JSON.parse(options.body).structuredQuery;
      assert.equal(query.orderBy[0].field.fieldPath, 'score');
      assert.equal(query.orderBy[0].direction, 'DESCENDING');
      const sorted = [...records].sort(
        (a, b) => Number(b.fields.score.integerValue) - Number(a.fields.score.integerValue)
      );
      return { ok: true, json: async () => sorted.slice(0, query.limit).map((document) => ({ document })) };
    },
  };
  const rankings = await loadRemoteRankings();
  assert.equal(rankings.length, 100);
  assert.equal(rankings[0].score, 120);
  assert.equal(rankings.at(-1).score, 21);
});

test('랭킹 캐시 용량 초과에도 서버 제출하고 중복 제출은 막는다', async () => {
  let writes = 0;
  const form = formController(async (url) => {
    if (url.includes(':runQuery')) return { ok: true, json: async () => [{ document: document(10) }] };
    writes += 1;
    return { ok: true, json: async () => document(10) };
  });
  await form.submit();
  assert.equal(writes, 1);
  assert.equal(form.button.disabled, true);
  await form.submit();
  assert.equal(writes, 1);
});

test('서버 제출 실패는 재시도할 수 있고 로컬 기록이 중복되지 않는다', async () => {
  let writes = 0;
  const form = formController(async (url) => {
    if (url.includes(':runQuery')) return { ok: false };
    writes += 1;
    return writes === 1 ? { ok: false } : { ok: true, json: async () => document(10) };
  });
  await form.submit();
  assert.equal(form.button.disabled, false);
  assert.equal(form.controller.getRankings().length, 1);
  await form.submit();
  assert.equal(form.button.disabled, true);
  assert.equal(form.controller.getRankings().length, 1);
  assert.equal(writes, 2);
});
