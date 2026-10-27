import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import vm from 'node:vm';

test('all browser projection consumers resolve to the same fresh modules before game startup', () => {
  const html = readFileSync(new URL('../quarter-view.html', import.meta.url), 'utf8');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find((match) =>
    match[1].includes("map.type = 'importmap'")
  );
  assert.ok(inline);
  assert.ok(inline.index < html.indexOf('src="./src/quarter_view/startup.js'));
  const maps = [];
  const context = {
    URL,
    location: { href: 'https://example.test/crowknight/quarter-view.html?view=release' },
    document: { createElement: () => ({}), currentScript: { after: (script) => maps.push(script) } },
    Date: { now: () => 123 },
  };
  vm.runInNewContext(inline[1], context);
  assert.equal(maps[0].type, 'importmap');
  const imports = JSON.parse(maps[0].textContent).imports;
  assert.equal(Object.keys(imports).length, 64);
  for (const name of [
    'camera',
    'environment',
    'scenery_art',
    'scenery_catalog',
    'scenery_renderer',
    'ground_texture',
    'ground_patterns',
    'dual_grid',
    'arrival',
    'arrival_visual',
    '../particle_effects_engine',
    'ground_shaders',
    'gpu_ground_renderer',
    'attack_geometry',
    'attack_effects',
    'effect_geometry',
    'effect_directions',
    'effect_layout',
    'effect_guides',
    'effect_editor_view',
    'effect_editor_preview',
    'effect_editor_markup',
    'effect_editor_handles',
    '../actor_canvas_renderer',
    'slash_trail',
    'weapon_contact',
    'knockback',
    'renderer',
    'runtime',
    'attack_history',
    'hitbox_view',
    'spatial',
    'attack_settings_view',
    '../actor_renderer',
    '../spearman_throw_renderer',
  ]) {
    const key = new URL(`./src/quarter_view/${name}.js`, context.location.href).href;
    assert.equal(imports[key], `${key}?projection=3f`);
  }
});
