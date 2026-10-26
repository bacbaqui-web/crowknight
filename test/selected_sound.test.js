import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import { COMBAT_SOUNDS } from '../src/combat_sound_catalog.js';

test('five sound families use attributed selected assets at natural speed with intact decays', () => {
  const keys = ['swordSwing', 'clubHit', 'swordHit', 'block', 'parry', 'footstep', 'explosion', 'bigExplosion'];
  const files = new Set(keys.flatMap((key) => COMBAT_SOUNDS[key].files));
  const sources = JSON.parse(readFileSync(new URL('../assets/audio/combat/selected/sources.json', import.meta.url)));
  assert.equal(files.size, 16);
  assert.deepEqual(files, new Set(sources.map((s) => s.file)));
  for (const key of keys) assert.equal(COMBAT_SOUNDS[key].rate, 1);
  assert.equal(COMBAT_SOUNDS.footstep.files.length, 6);
  for (const item of sources) {
    const bytes = readFileSync(new URL('../assets/audio/combat/' + item.file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    assert.ok(item.author && item.license && item.url.startsWith('https://'));
    assert.ok(item.trimStart >= 0 && item.trimStart < 0.3);
    assert.ok(item.duration > 0.1 && item.duration < 2);
    assert.ok(item.trimEnd <= item.originalDuration);
    let peak = 0;
    for (let i = 44; i < bytes.length; i += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)));
    assert.ok(peak > 20000 && peak < 27000);
    if (item.file.includes('explosion')) assert.ok(item.duration > 1.4);
  }
  // Other families are intentionally unchanged in this listening trial.
  for (const key of ['magicCharge', 'tankRumble', 'trapSnap', 'healthPickup'])
    assert.ok(COMBAT_SOUNDS[key].files.every((file) => file.startsWith('v2/')));
});

test('approved club swings retain the exact Pixabay originals', () => {
  const sources = JSON.parse(readFileSync(new URL('../assets/audio/combat/pixabay/sources.json', import.meta.url)));
  assert.deepEqual(
    COMBAT_SOUNDS.clubSwing.files,
    sources.map((s) => s.file)
  );
  assert.equal(COMBAT_SOUNDS.clubSwing.rate, 1);
  assert.deepEqual(
    sources.map((s) => s.selectedCandidate),
    [2, 3]
  );
  for (const item of sources) {
    const bytes = readFileSync(new URL('../assets/audio/combat/' + item.file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    assert.ok(bytes.length > 1000);
    assert.equal(item.author, 'floraphonic');
  }
});
