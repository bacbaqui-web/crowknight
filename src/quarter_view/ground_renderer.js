import { createGroundTexture, GROUND_TILE_SIZE } from './ground_texture.js';
import { createGpuGroundRenderer } from './gpu_ground_renderer.js';
import { createGroundOverlay } from './ground_overlay.js';
import { groundPoint, QUARTER_PROJECTION } from './camera.js';

// Preserve the existing tile pattern, projecting only columns that can enter the viewport.
export function visibleGroundTiles(view, center) {
  const tiles = [];
  const radius = view.height / (view.zoom * QUARTER_PROJECTION.slope);
  const firstRow = Math.floor((view.depth - radius) / 80) - 1;
  const lastRow = Math.ceil((view.depth + radius) / 80) + 1;
  for (let row = firstRow; row <= lastRow; row++) {
    const z = row * 80;
    const top = groundPoint(center, z - 80, view),
      bottom = groundPoint(center, z + 80, view);
    if (bottom.y < 0 || top.y > view.height) continue;
    const halfWidth = view.width / (2 * Math.min(top.scale, bottom.scale));
    const stagger = (row % 2) * 50;
    const first = Math.max(-22, Math.floor((view.x - halfWidth - center - stagger) / 100) - 1);
    const last = Math.min(22, Math.ceil((view.x + halfWidth - center - stagger) / 100) + 1);
    for (let col = first; col <= last; col++) {
      const x = center + col * 100 + stagger;
      const points = [
        [x - 50, z],
        [x, z - 80],
        [x + 50, z],
        [x, z + 80],
      ].map(([px, pz]) => groundPoint(px, pz, view));
      if (Math.max(...points.map((p) => p.x)) < 0 || Math.min(...points.map((p) => p.x)) > view.width) continue;
      tiles.push({ parity: Boolean((col + row) % 2), points });
    }
  }
  return tiles;
}
function createGroundPainter(ctx, world, createSurface) {
  const tile = createSurface(),
    data = createGroundTexture();
  tile.width = data.width;
  tile.height = data.height;
  const tileContext = tile.getContext('2d');
  const image = tileContext.createImageData?.(data.width, data.height);
  if (image) {
    image.data.set(data.pixels);
    tileContext.putImageData(image, 0, 0);
  }
  const overlay = createGroundOverlay(ctx, world);
  function path(tile) {
    tile.points.forEach((p, index) => (index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  return (hero, view) => {
    if (image) {
      const halfX = view.width / (2 * view.zoom);
      const halfZ = view.height / (view.zoom * QUARTER_PROJECTION.slope);
      for (
        let z = Math.floor((view.depth - halfZ) / GROUND_TILE_SIZE.z);
        z <= Math.ceil((view.depth + halfZ) / GROUND_TILE_SIZE.z);
        z++
      )
        for (
          let x = Math.floor((view.x - halfX) / GROUND_TILE_SIZE.x);
          x <= Math.ceil((view.x + halfX) / GROUND_TILE_SIZE.x);
          x++
        ) {
          const p = groundPoint(x * GROUND_TILE_SIZE.x, z * GROUND_TILE_SIZE.z, view);
          ctx.drawImage(
            tile,
            p.x,
            p.y,
            GROUND_TILE_SIZE.x * view.zoom + 0.5,
            GROUND_TILE_SIZE.z * QUARTER_PROJECTION.slope * view.zoom + 0.5
          );
        }
      overlay(hero, view);
      return;
    }
    ctx.fillStyle = '#17251f';
    ctx.fillRect(0, 0, world.viewW, world.viewH);
    const center = Math.floor(hero.player.x / 100) * 100;
    const tiles = visibleGroundTiles(view, center);
    for (const parity of [false, true]) {
      ctx.beginPath();
      tiles.filter((tile) => tile.parity === parity).forEach(path);
      ctx.fillStyle = parity ? '#3c4e30' : '#445635';
      ctx.fill();
    }
    ctx.beginPath();
    tiles.forEach(path);
    ctx.strokeStyle = '#71826a08';
    ctx.lineWidth = 1;
    ctx.stroke();
    overlay(hero, view);
  };
}

// Camera shake is applied by the caller, so a stationary camera can reuse this exact image.
export function createCanvasGroundRenderer(ctx, world, createSurface = () => document.createElement('canvas')) {
  const surface = createSurface();
  const paint = createGroundPainter(surface.getContext('2d', { alpha: false }), world, createSurface);
  let previous = null;
  const stats = { groundHits: 0, groundBuilds: 0 };
  const draw = (hero, view) => {
    const key = [world.viewW, world.viewH, view.x, view.depth, view.zoom, Math.floor(hero.player.x / 100)];
    if (!previous || key.some((value, index) => value !== previous[index])) {
      if (surface.width !== world.viewW) surface.width = world.viewW;
      if (surface.height !== world.viewH) surface.height = world.viewH;
      paint(hero, view);
      stats.groundBuilds++;
      previous = key;
    } else stats.groundHits++;
    ctx.drawImage(surface, 0, 0);
  };
  draw.stats = stats;
  return draw;
}

export function createGroundRenderer(ctx, world, createSurface = () => document.createElement('canvas')) {
  const gpu = createGpuGroundRenderer(ctx, world, createSurface);
  if (!gpu) {
    const canvas = createCanvasGroundRenderer(ctx, world, createSurface);
    canvas.backend = 'canvas';
    return canvas;
  }
  let fallback = null,
    backend = 'gpu';
  const draw = (hero, view) => {
    if (gpu(hero, view)) {
      backend = 'gpu';
      return;
    }
    fallback ||= createCanvasGroundRenderer(ctx, world, createSurface);
    backend = 'canvas';
    fallback(hero, view);
  };
  draw.stats = {
    get groundHits() {
      return gpu.stats.groundHits + (fallback?.stats.groundHits || 0);
    },
    get groundBuilds() {
      return gpu.stats.groundBuilds + (fallback?.stats.groundBuilds || 0);
    },
  };
  Object.defineProperty(draw, 'backend', { get: () => backend });
  return draw;
}
