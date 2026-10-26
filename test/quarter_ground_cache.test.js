import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroundRenderer } from '../src/quarter_view/ground_renderer.js';
import { createGroundTexture } from '../src/quarter_view/ground_texture.js';

function fixture() {
  const calls = { uploads: 0, draws: 0, blits: 0, view: null };
  const handlers = {};
  const gl = {
    createShader: () => ({}),
    shaderSource() {},
    compileShader() {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader() {},
    linkProgram() {},
    deleteShader() {},
    getProgramParameter: () => true,
    useProgram() {},
    createTexture: () => ({}),
    activeTexture() {},
    bindTexture() {},
    texParameteri() {},
    generateMipmap() {},
    texImage2D() {
      calls.uploads++;
    },
    getUniformLocation: (_, name) => name,
    uniform1i() {},
    uniform1f() {},
    uniform2f() {},
    uniform3f(name, ...values) {
      if (name === 'uView') calls.view = values;
    },
    getParameter: () => 4096,
    isContextLost: () => false,
    viewport() {},
    drawArrays() {
      calls.draws++;
    },
  };
  const ctx = {
    drawImage() {
      calls.blits++;
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillRect() {},
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  let surfaces = 0;
  const factory = () => {
    const gpu = surfaces++ === 0;
    return {
      width: 0,
      height: 0,
      getContext: () => (gpu ? gl : ctx),
      addEventListener(name, listener) {
        handlers[name] = listener;
      },
    };
  };
  const world = { viewW: 800, viewH: 600 };
  return { calls, handlers, world, draw: createGroundRenderer(ctx, world, factory) };
}

test('grass and dirt texture is deterministic, varied and opaque', () => {
  const texture = createGroundTexture();
  assert.equal(texture.pixels.length, 256 * 256 * 4);
  const colors = new Set();
  for (let i = 0; i < texture.pixels.length; i += 4) {
    colors.add([...texture.pixels.slice(i, i + 3)].join(','));
    assert.equal(texture.pixels[i + 3], 255);
  }
  assert.ok(colors.size > 100);
  assert.deepEqual(createGroundTexture().pixels, texture.pixels);
});

test('moving, depth, zoom and viewport changes reuse one GPU texture; a stationary view reuses its projection', () => {
  const { draw, calls, world } = fixture();
  const hero = { player: { x: 480 } };
  const view = { width: 800, height: 600, x: 590, depth: 0, zoom: 1.4 };
  for (let i = 0; i < 300; i++) {
    hero.player.x += 17;
    view.x += 17;
    view.depth = Math.sin(i) * 160;
    view.zoom = 1 + i / 1000;
    if (i === 150) {
      world.viewW = view.width = 900;
      world.viewH = view.height = 650;
    }
    draw(hero, view);
  }
  assert.equal(draw.backend, 'gpu');
  assert.equal(calls.uploads, 1);
  assert.equal(calls.draws, 300);
  draw(hero, view);
  assert.equal(calls.draws, 300);
  assert.equal(calls.blits, 301);
  view.x = 1000000000590;
  draw(hero, view);
  assert.deepEqual(calls.view, [590, view.depth, view.zoom]);
  assert.deepEqual({ ...draw.stats }, { groundHits: 302, groundBuilds: 1 });
});

test('context loss falls back safely and restoration uploads exactly once before resuming GPU reuse', () => {
  const { draw, calls, handlers } = fixture();
  const hero = { player: { x: 480 } },
    view = { width: 800, height: 600, x: 590, depth: 0, zoom: 1.4 };
  draw(hero, view);
  let prevented = false;
  handlers.webglcontextlost({
    preventDefault() {
      prevented = true;
    },
  });
  draw(hero, view);
  assert.ok(prevented);
  assert.equal(draw.backend, 'canvas');
  assert.equal(calls.uploads, 1);
  handlers.webglcontextrestored();
  draw(hero, view);
  draw(hero, { ...view, depth: 60 });
  assert.equal(draw.backend, 'gpu');
  assert.equal(calls.uploads, 2);
  assert.equal(calls.draws, 3);
  assert.deepEqual({ ...draw.stats }, { groundHits: 3, groundBuilds: 3 });
});
