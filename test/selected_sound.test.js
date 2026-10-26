import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import { COMBAT_SOUNDS } from '../src/combat_sound_catalog.js';

test('five sound families use attributed selected assets at natural speed with intact decays', () => {
  const keys = ['swordHit', 'footstep'];
  const files = new Set(keys.flatMap((key) => COMBAT_SOUNDS[key].files));
  const sources = JSON.parse(readFileSync(new URL('../assets/audio/combat/selected/sources.json', import.meta.url)));
  assert.equal(files.size, 8);
  assert.deepEqual(
    files,
    new Set(
      sources
        .filter(
          (s) =>
            !s.file.includes('explosion') &&
            !s.file.includes('swing-') &&
            !s.file.includes('shield-') &&
            !s.file.includes('blunt-hit-')
        )
        .map((s) => s.file)
    )
  );
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

test('approved club swings and explosion retain the exact Pixabay originals', () => {
  const sources = JSON.parse(readFileSync(new URL('../assets/audio/combat/pixabay/sources.json', import.meta.url)));
  assert.deepEqual(
    COMBAT_SOUNDS.clubSwing.files,
    sources.filter((s) => [2, 3].includes(s.selectedCandidate)).map((s) => s.file)
  );
  assert.equal(COMBAT_SOUNDS.clubSwing.rate, 1);
  for (const key of ['explosion', 'bigExplosion']) {
    assert.deepEqual(COMBAT_SOUNDS[key].files, ['pixabay/explosion-medium.mp3']);
    assert.equal(COMBAT_SOUNDS[key].rate, 1);
  }
  assert.deepEqual(
    sources.map((s) => s.selectedCandidate),
    [2, 3, 10, 14, 14, 15, 21]
  );
  for (const item of sources) {
    const bytes = readFileSync(new URL('../assets/audio/combat/' + item.file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    assert.ok(bytes.length > 1000);
    assert.ok(item.author && item.license);
  }
});

test('sword swing uses only the fourth and fifth selected cuts at original speed', () => {
  assert.deepEqual(COMBAT_SOUNDS.swordSwing.files, ['pixabay/sword-swipe-4.wav', 'pixabay/sword-swipe-5.wav']);
  assert.equal(COMBAT_SOUNDS.swordSwing.rate, 1);
  const sources = JSON.parse(readFileSync(new URL('../assets/audio/combat/pixabay/sources.json', import.meta.url)));
  const cuts = sources.filter((s) => s.selectedCandidate === 14);
  assert.deepEqual(
    cuts.map((s) => [s.swipe, s.trimStart, s.trimEnd]),
    [
      [4, 3.49, 3.82],
      [5, 4.07, 4.55],
    ]
  );
  for (const cut of cuts) {
    const source = readFileSync(new URL('../assets/audio/combat/' + cut.sourceFile, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), cut.sourceSha256);
  }
});

test('block and parry use the selected shortsword shield while hero club stays distinct', () => {
  for (const key of ['block', 'parry'])
    assert.deepEqual(COMBAT_SOUNDS[key].files, ['pixabay/shield-block-shortsword.mp3']);
  assert.deepEqual(COMBAT_SOUNDS.clubSwing.files, ['pixabay/club-swing-1.mp3', 'pixabay/club-swing-2.mp3']);
  assert.ok(COMBAT_SOUNDS.clubSwing.files.every((file) => !COMBAT_SOUNDS.swordSwing.files.includes(file)));
});

test('hero hit uses blunt impact independently of enemy blade hit', () => {
  assert.deepEqual(COMBAT_SOUNDS.clubHit.files, ['pixabay/club-hit-blunt.mp3']);
  assert.ok(COMBAT_SOUNDS.swordHit.files.every((file) => file.startsWith('selected/blade-hit-')));
});
