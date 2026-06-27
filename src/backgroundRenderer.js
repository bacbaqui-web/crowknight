import { normalizeSceneBackground } from './sceneSession.js';
import { clamp } from './utils.js';

const imageCache = new Map();
const metricsCache = new WeakMap();

export function preloadSceneBackground(background) {
  const normalized = normalizeSceneBackground(background);
  if (normalized.psdPreview.enabled && normalized.psdPreview.url.trim()) getCachedImage(normalized.psdPreview.url);
  normalized.psdLayers.forEach((layer) => {
    if (layer.enabled && layer.imageSrc.trim()) getCachedImage(layer.imageSrc);
  });
  if (normalized.type === 'image' && normalized.imageSrc.trim()) getCachedImage(normalized.imageSrc);
  if (normalized.type === 'layers') {
    normalized.layers.forEach((layer) => {
      if (layer.enabled) getCachedImage(layer.src);
    });
  }
}

export function drawSceneBackground(ctx, world, view, background) {
  const normalized = normalizeSceneBackground(background);
  const hasPsdBackground = hasActivePsdBackground(normalized);

  ctx.save();
  ctx.clearRect(0, 0, world.viewW, world.viewH);
  drawBaseColor(ctx, world, normalized.color);
  drawPsdBackgroundRoleLayers(ctx, world, view, normalized, ['back', 'ground']);

  if (!hasPsdBackground) {
    if (normalized.type === 'preset') drawPresetBackground(ctx, world, view, normalized);
    if (normalized.type === 'image') drawImageBackground(ctx, world, normalized);
    if (normalized.type === 'layers') drawLayeredBackground(ctx, world, view, normalized);
    if (normalized.type === 'color') drawBaseColor(ctx, world, normalized.color);
  }

  ctx.restore();
}

export function drawSceneForeground(ctx, world, view, background) {
  const normalized = normalizeSceneBackground(background);
  drawPsdBackgroundRoleLayers(ctx, world, view, normalized, ['front']);
}

function drawPsdBackgroundRoleLayers(ctx, world, view, background, roles) {
  const layersWithImages = background.psdLayers.filter((layer) => layer.enabled && layer.imageSrc.trim());
  if (!layersWithImages.length) {
    if (roles.includes('back')) drawPsdPreviewBackground(ctx, world, background);
    return;
  }

  const roleLayers = layersWithImages.filter((layer) => roles.includes(layer.role));
  [...roleLayers].reverse().forEach((layer) => drawClipLayerImage(ctx, world, view, background, layer));
}

function hasActivePsdBackground(background) {
  const hasLayer = background.psdLayers.some((layer) => layer.enabled && layer.imageSrc.trim());
  return hasLayer || Boolean(background.psdPreview.enabled && background.psdPreview.url.trim());
}

function drawPsdPreviewBackground(ctx, world, background) {
  if (!background.psdPreview.enabled || !background.psdPreview.url.trim()) return;

  const imageState = getCachedImage(background.psdPreview.url);
  if (!imageState.loaded || imageState.error) return;

  drawCoverImage(ctx, world, imageState.image, { opacity: 1, offsetX: 0, offsetY: 0, scale: 1 });
}

function drawClipLayerImage(ctx, world, view, background, layer) {
  const imageState = getCachedImage(layer.imageSrc);
  if (!imageState.loaded || imageState.error) return;

  const metrics = getImageMetrics(imageState.image);
  const baseLayout = getCoverImageLayout(world, imageState.image, {
    opacity: 1,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const imageScaleX = baseLayout.scaleX * layer.scale;
  const imageScaleY = baseLayout.scaleY * layer.scale;
  const width = metrics.width * imageScaleX;
  const height = metrics.height * imageScaleY;
  if (width <= 0 || height <= 0) return;

  const scrollX = layer.role === 'ground' ? getGroundScrollX(world, view) : view.focusX * layer.influence;
  const scrollOffset = modulo(scrollX, width);
  const sourceX = metrics.x;
  const sourceY = metrics.y;
  const sourceWidth = metrics.width;
  const sourceHeight = metrics.height;
  const naturalX = baseLayout.x + metrics.x * imageScaleX + layer.offsetX;
  const naturalY =
    baseLayout.y + metrics.y * imageScaleY + layer.offsetY + getClipLayerVerticalDeltaY(world, view, layer);
  const startX = naturalX - scrollOffset - width;

  ctx.save();
  ctx.globalAlpha = clamp(layer.opacity, 0, 1);
  for (let x = startX; x < world.viewW + width; x += width) {
    const left = Math.round(x);
    const right = Math.round(x + width);
    const drawWidth = Math.max(1, right - left);
    ctx.drawImage(imageState.image, sourceX, sourceY, sourceWidth, sourceHeight, left, naturalY, drawWidth, height);
  }
  ctx.restore();
}

function getGroundScrollX(world, view) {
  return view.focusX - world.viewW / (2 * view.zoom);
}

function getClipLayerVerticalDeltaY(world, view, layer) {
  return getCameraScreenDeltaY(world, view) * layer.verticalInfluence;
}

function getCameraScreenDeltaY(world, view) {
  const defaultFocusY = clamp(world.floorY - 120, world.viewH * 0.35, world.floorY - 120);
  const defaultFloorY = (world.floorY - defaultFocusY) * view.zoom + world.viewH / 2;
  const currentFloorY = (world.floorY - view.focusY) * view.zoom + world.viewH / 2;
  return currentFloorY - defaultFloorY;
}

function drawLayeredBackground(ctx, world, view, background) {
  background.layers.forEach((layer) => {
    if (!layer.enabled) return;

    const imageState = getCachedImage(layer.src);
    if (!imageState.loaded || imageState.error) return;

    drawParallaxLayer(ctx, world, view, imageState.image, layer);
  });
}

function drawParallaxLayer(ctx, world, view, image, layer) {
  const scale = Math.max(0.2, layer.scale);
  const width = image.width * scale;
  const height = image.height * scale;
  if (width <= 0 || height <= 0) return;

  const speed = layer.speed;
  const offset = modulo(view.focusX * speed, width);
  const startX = -offset - width + layer.offsetX;
  const y = world.viewH - height + layer.offsetY;

  ctx.save();
  ctx.globalAlpha = clamp(layer.opacity, 0, 1);
  for (let x = startX; x < world.viewW + width; x += width) {
    ctx.drawImage(image, x, y, width, height);
  }
  ctx.restore();
}

function drawBaseColor(ctx, world, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, world.viewW, world.viewH);
}

function drawPresetBackground(ctx, world, view, background) {
  const drawers = {
    training: drawTrainingPreset,
    moonlit: drawMoonlitPreset,
    ember: drawEmberPreset,
    castle: drawCastlePreset,
  };
  const draw = drawers[background.preset] || drawTrainingPreset;

  ctx.save();
  ctx.globalAlpha = clamp(background.opacity, 0, 1);
  draw(ctx, world, view);
  ctx.restore();
}

function drawTrainingPreset(ctx, world) {
  drawVerticalGradient(ctx, world, '#171720', '#11141b');

  ctx.fillStyle = 'rgba(124, 195, 162, 0.08)';
  for (let x = -40; x < world.viewW + 80; x += 120) {
    ctx.fillRect(x, 0, 1, world.viewH);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let y = world.floorY - 210; y < world.floorY; y += 42) {
    ctx.fillRect(0, y, world.viewW, 1);
  }
}

function drawMoonlitPreset(ctx, world, view) {
  drawVerticalGradient(ctx, world, '#111827', '#17221e');

  ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
  ctx.beginPath();
  ctx.arc(world.viewW - 140, 90, 34, 0, Math.PI * 2);
  ctx.fill();

  drawParallaxHills(ctx, world, view, {
    y: world.floorY - 98,
    height: 86,
    step: 260,
    color: '#1e2d34',
    speed: 0.08,
  });
  drawParallaxHills(ctx, world, view, {
    y: world.floorY - 58,
    height: 68,
    step: 190,
    color: '#15271f',
    speed: 0.18,
  });
  drawTreeLine(ctx, world, view);
}

function drawEmberPreset(ctx, world, view) {
  drawVerticalGradient(ctx, world, '#321a22', '#121218');

  const glow = ctx.createRadialGradient(
    world.viewW * 0.22,
    world.viewH * 0.32,
    20,
    world.viewW * 0.22,
    world.viewH * 0.32,
    280
  );
  glow.addColorStop(0, 'rgba(239, 118, 122, 0.34)');
  glow.addColorStop(1, 'rgba(239, 118, 122, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, world.viewW, world.viewH);

  drawParallaxHills(ctx, world, view, {
    y: world.floorY - 120,
    height: 118,
    step: 300,
    color: '#2a2027',
    speed: 0.12,
  });
  drawRuinColumns(ctx, world, view);
}

function drawCastlePreset(ctx, world, view) {
  drawVerticalGradient(ctx, world, '#18202c', '#10131a');
  drawCastleWall(ctx, world, view, world.floorY - 205, '#222a36', 0.08);
  drawCastleWall(ctx, world, view, world.floorY - 132, '#2a3340', 0.18);
}

function drawVerticalGradient(ctx, world, top, bottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.viewH);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.viewW, world.viewH);
}

function drawParallaxHills(ctx, world, view, { y, height, step, color, speed }) {
  const cameraX = view.focusX * speed;
  const startX = -step - (cameraX % step);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, world.viewH);
  for (let x = startX; x < world.viewW + step; x += step) {
    ctx.quadraticCurveTo(x + step * 0.48, y - height, x + step, y);
  }
  ctx.lineTo(world.viewW, world.viewH);
  ctx.closePath();
  ctx.fill();
}

function drawTreeLine(ctx, world, view) {
  const cameraX = view.focusX * 0.24;
  const step = 70;
  const startX = -step - (cameraX % step);
  const baseY = world.floorY - 20;

  ctx.fillStyle = '#102018';
  for (let x = startX; x < world.viewW + step; x += step) {
    const height = 72 + (Math.abs(Math.round(x / step)) % 3) * 18;
    ctx.beginPath();
    ctx.moveTo(x - 30, baseY);
    ctx.lineTo(x, baseY - height);
    ctx.lineTo(x + 32, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 3, baseY - 20, 6, 28);
  }
}

function drawRuinColumns(ctx, world, view) {
  const cameraX = view.focusX * 0.2;
  const step = 240;
  const startX = -step - (cameraX % step);
  const baseY = world.floorY - 42;

  ctx.fillStyle = '#211a21';
  for (let x = startX; x < world.viewW + step; x += step) {
    const height = 96 + (Math.abs(Math.round(x / step)) % 2) * 38;
    ctx.fillRect(x, baseY - height, 34, height);
    ctx.fillRect(x - 14, baseY - height - 14, 62, 14);
  }
}

function drawCastleWall(ctx, world, view, y, color, speed) {
  const cameraX = view.focusX * speed;
  const blockW = 96;
  const startX = -blockW - (cameraX % blockW);

  ctx.fillStyle = color;
  ctx.fillRect(0, y, world.viewW, world.floorY - y);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let x = startX; x < world.viewW + blockW; x += blockW) {
    ctx.fillRect(x, y + 18, blockW - 14, 2);
    ctx.fillRect(x + 8, y + 62, blockW - 22, 2);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let x = startX; x < world.viewW + blockW; x += blockW) {
    ctx.fillRect(x + 24, y + 30, 22, 42);
  }
}

function drawImageBackground(ctx, world, background) {
  const imageState = getCachedImage(background.imageSrc);
  if (!imageState.loaded || imageState.error) return;

  const image = imageState.image;
  ctx.save();
  ctx.globalAlpha = clamp(background.opacity, 0, 1);

  if (background.fit === 'repeat') {
    drawRepeatedImage(ctx, world, image, background);
  } else {
    drawFittedImage(ctx, world, image, background);
  }

  ctx.restore();
}

function drawFittedImage(ctx, world, image, background) {
  if (background.fit === 'cover') {
    drawCoverImage(ctx, world, image, background);
    return;
  }

  const sourceRatio = image.width / image.height;
  const targetRatio = world.viewW / world.viewH;
  let width = world.viewW;
  let height = world.viewH;

  if (background.fit === 'contain') {
    if (sourceRatio > targetRatio) height = width / sourceRatio;
    else width = height * sourceRatio;
  }

  width *= background.scale;
  height *= background.scale;

  const x = (world.viewW - width) / 2 + background.offsetX;
  const y = (world.viewH - height) / 2 + background.offsetY;
  ctx.drawImage(image, x, y, width, height);
}

function drawCoverImage(ctx, world, image, settings) {
  const layout = getCoverImageLayout(world, image, settings);

  ctx.save();
  ctx.globalAlpha = clamp(settings.opacity, 0, 1);
  ctx.drawImage(image, layout.x, layout.y, layout.width, layout.height);
  ctx.restore();
}

function getCoverImageLayout(world, image, settings) {
  const sourceRatio = image.width / image.height;
  const targetRatio = world.viewW / world.viewH;
  let width = world.viewW;
  let height = world.viewH;

  if (sourceRatio > targetRatio) width = height * sourceRatio;
  else height = width / sourceRatio;

  width *= settings.scale;
  height *= settings.scale;

  const x = (world.viewW - width) / 2 + settings.offsetX;
  const y = (world.viewH - height) / 2 + settings.offsetY;

  return {
    x,
    y,
    width,
    height,
    scaleX: width / image.width,
    scaleY: height / image.height,
  };
}

function drawRepeatedImage(ctx, world, image, background) {
  const pattern = ctx.createPattern(image, 'repeat');
  if (!pattern) return;

  const width = image.width * background.scale;
  const height = image.height * background.scale;
  ctx.translate(background.offsetX, background.offsetY);
  ctx.scale(width / image.width, height / image.height);
  ctx.fillStyle = pattern;
  ctx.fillRect(
    -background.offsetX,
    -background.offsetY,
    world.viewW / background.scale,
    world.viewH / background.scale
  );
}

function getImageMetrics(image) {
  if (metricsCache.has(image)) return metricsCache.get(image);

  const fallback = {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let minX = image.width;
    let minY = image.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const alpha = pixels[(y * image.width + x) * 4 + 3];
        if (alpha <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    const metrics =
      maxX >= minX && maxY >= minY
        ? {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          }
        : fallback;
    metricsCache.set(image, metrics);
    return metrics;
  } catch {
    metricsCache.set(image, fallback);
    return fallback;
  }
}

function getCachedImage(src) {
  const key = src.trim();
  if (imageCache.has(key)) return imageCache.get(key);

  const image = new Image();
  const state = { image, loaded: false, error: false };
  image.onload = () => {
    state.loaded = true;
  };
  image.onerror = () => {
    state.error = true;
  };
  image.src = key;
  imageCache.set(key, state);
  return state;
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
