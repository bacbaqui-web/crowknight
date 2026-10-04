import assert from 'node:assert/strict';
import test from 'node:test';
import { flushProjectSave, loadSavedState, saveGameState } from '../src/project_storage_helper.js';
import { createProjectStateController } from '../src/project_state_controller.js';
import { loadCharacterAssets, loadEffectAssets } from '../src/asset_loader_helper.js';
import { createRankingController } from '../src/ranking_controller.js';

function installBrowser(fetch) {
  const events = [];
  globalThis.window = {
    fetch,
    clearTimeout() {},
    setTimeout() {
      return 1;
    },
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    dispatchEvent(event) {
      events.push(event.detail);
    },
  };
  globalThis.localStorage = {
    getItem() {
      throw new Error('Stale browser storage must not be used for game loading');
    },
    setItem() {
      throw new Error('Browser storage quota exceeded');
    },
    removeItem() {},
  };
  return events;
}

function project(name = 'player') {
  return {
    actors: [{ id: 'player', name, folder: 'players/player', group: 'players', tuning: { hp: 5 } }],
    activeSessionId: 'default',
    sessions: {},
  };
}

test('세 화면은 브라우저 저장소 대신 각각 draft/beta/published 파일을 읽는다', async () => {
  const requests = [];
  installBrowser(async (url) => {
    requests.push(url.split('?')[0]);
    return { ok: true, json: async () => ({ revision: 'hash', releaseVersion: 'abcd', actors: {}, sessions: {} }) };
  });
  for (const source of ['local', 'beta', 'published']) {
    const state = await loadSavedState({ source });
    assert.equal(state.revision, 'hash');
    assert.equal(state.releaseVersion, 'abcd');
  }
  assert.deepEqual(requests, ['./data/draft.json', './data/beta.json', './data/published.json']);
});

test('저장은 변경 시점 snapshot을 사용하며 브라우저 용량 초과에도 디스크 저장한다', async () => {
  const requests = [];
  installBrowser(async (url, options) => {
    requests.push({ url, state: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ ok: true, revision: 'saved' }) };
  });
  const state = project();
  saveGameState(state);
  state.actors[0].tuning.hp = 999;
  await flushProjectSave();
  assert.equal(requests[0].state.actors.player.tuning.hp, 5);
  assert.equal(requests[0].url, './api/project/save');
});

test('서버 저장 실패는 flush로 전달되고 다음 저장으로 복구할 수 있다', async () => {
  const events = installBrowser(async () => ({ ok: false, json: async () => ({ ok: false, error: 'disk full' }) }));
  saveGameState(project());
  await assert.rejects(flushProjectSave(), /disk full/);
  assert.equal(events.at(-1).ok, false);
  window.fetch = async () => ({ ok: true, json: async () => ({ ok: true, revision: 'recovered' }) });
  saveGameState(project('recovered'));
  assert.equal((await flushProjectSave()).revision, 'recovered');
});

test('게임 화면의 저장 요청은 제작 draft를 덮어쓰지 않는다', () => {
  let requests = 0;
  installBrowser(() => {
    requests += 1;
  });
  createProjectStateController({ editable: false }).saveState();
  assert.equal(requests, 0);
});

test('snapshot 이미지는 mutable 제작 에셋으로 fallback하지 않는다', async () => {
  const requests = [];
  globalThis.Image = class {
    set src(value) {
      requests.push(value);
      this.onload();
    }
  };
  await loadCharacterAssets('players/player', '', { __snapshot: true, body: './release-assets/body.png' });
  await loadEffectAssets('', { __snapshot: true, slash1: './release-assets/slash.png' });
  assert.deepEqual(requests, ['./release-assets/body.png', './release-assets/slash.png']);
});

test('베타 기록 제출은 Firestore와 공개 랭킹 캐시에 접근하지 않는다', async () => {
  let submits;
  let requests = 0;
  installBrowser(() => {
    requests += 1;
    throw new Error('Public ranking access is forbidden');
  });
  const controller = createRankingController({
    remoteEnabled: false,
    elements: {
      rankingForm: {
        addEventListener(type, callback) {
          if (type === 'submit') submits = callback;
        },
        querySelector: () => ({}),
      },
      rankingName: { value: 'beta test' },
      rankingMessage: { value: '', addEventListener() {} },
    },
    getRunResult: () => ({ score: 10, survivalTime: 2, kills: 0 }),
    getPlayerName: () => 'player',
  });
  await submits({ preventDefault() {} });
  assert.equal(controller.getRankings().length, 1);
  assert.equal(await controller.syncFromFirebase(), false);
  assert.equal(requests, 0);
});

test('PSD에서 제거한 파츠는 편집 미리보기에서 이전 PNG로 fallback하지 않는다', async () => {
  const requests = [];
  globalThis.Image = class {
    set src(value) {
      requests.push(value);
      this.onload();
    }
  };
  await loadCharacterAssets('mobs/test', '', { __parts: ['body'] });
  assert.deepEqual(requests, ['./assets/characters/mobs/test/body.png']);
});
