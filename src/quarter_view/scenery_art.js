const images = new Map();
let loading;
export const SCENERY_ASSETS = Object.freeze({
  tree: new globalThis.URL('../../assets/quarter-forest/tree-painted-v1.webp', import.meta.url).href,
  rock: new globalThis.URL('../../assets/quarter-forest/rock-painted-v1.webp', import.meta.url).href,
  hut: new globalThis.URL('../../assets/quarter-forest/ruin-painted-v1.webp', import.meta.url).href,
});
export function preloadSceneryArt() {
  return (loading ||= Promise.all(
    Object.entries(SCENERY_ASSETS).map(async ([type, url]) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      images.set(type, image);
    })
  ));
}
// Rasterize scaled / tinted variants once; moving the camera only blits cached surfaces.
export function createScenerySprite(type, createSurface = () => document.createElement('canvas'), variant = 0) {
  const canvas = createSurface();
  canvas.width = 300;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  ctx.translate(150, 300);
  const image = images.get(type);
  if (!image) return canvas;
  ctx.fillStyle = '#133d402b';
  ctx.beginPath();
  ctx.ellipse(8, 8, type === 'tree' ? 40 : 70, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'tree') {
    ctx.filter = ['brightness(1.35)', 'brightness(1.65) saturate(.75)', 'brightness(1.1)'][variant % 3];
    if (variant === 1) ctx.scale(-1, 1);
    ctx.drawImage(image, -100, -280, 200, 290);
  } else if (type === 'rock') ctx.drawImage(image, -73, -72, 146, 88);
  else ctx.drawImage(image, -102, -126, 204, 158);
  return canvas;
}
