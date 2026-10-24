import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
test('script requests bypass stale canonical CDN responses without changing asset caching', async () => {
  const events = {},
    calls = [];
  vm.runInNewContext(source, {
    self: {
      location: { origin: 'https://example.test' },
      addEventListener(type, fn) {
        events[type] = fn;
      },
    },
    URL,
    Request: globalThis.Request,
    Date: { now: () => 12345 },
    fetch(request, options) {
      calls.push({ request, options });
      return Promise.resolve('ok');
    },
  });
  async function request(path, destination) {
    const r = new globalThis.Request(new URL(path, 'https://example.test'), {
      headers: { 'if-none-match': 'old', 'if-modified-since': 'old' },
    });
    Object.defineProperty(r, 'destination', { value: destination });
    let response;
    events.fetch({
      request: r,
      respondWith(value) {
        response = value;
      },
    });
    await response;
    return r;
  }
  await request('/src/main.js?existing=1', 'script');
  assert.equal(calls[0].request.url, 'https://example.test/src/main.js?existing=1&__source=9ix');
  assert.equal(calls[0].request.headers.has('if-none-match'), false);
  assert.equal(calls[0].request.headers.has('if-modified-since'), false);
  assert.equal(calls[0].options.cache, 'no-store');
  const html = await request('/quarter-view.html', 'document');
  assert.equal(calls[1].request, html);
  assert.equal(calls[1].options.cache, 'no-cache');
  await request('/release-assets/knight.webp', 'image');
  await request('https://cdn.example.org/library.js', 'script');
  assert.equal(calls.length, 2);
});
