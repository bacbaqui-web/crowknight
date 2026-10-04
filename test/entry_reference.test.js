import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('공개·베타·세팅 HTML의 로컬 script/style/이미지 경로가 존재한다', () => {
  for (const page of ['index.html', 'beta.html', 'setting.html']) {
    const html = readFileSync(resolve(root, page), 'utf8');
    for (const [, path] of html.matchAll(/(?:src|href)=["'](\.\/?[^"']+)["']/g)) {
      assert.ok(existsSync(resolve(root, path.split(/[?#]/)[0])), `${page}: ${path}`);
    }
  }
});

test('분리한 설정 CSS의 import 경로가 존재한다', () => {
  const file = resolve(root, 'src/settingsPanel.css');
  for (const [, path] of readFileSync(file, 'utf8').matchAll(/@import url\(["']([^"']+)["']\)/g)) {
    assert.ok(existsSync(resolve(dirname(file), path)), path);
  }
});
