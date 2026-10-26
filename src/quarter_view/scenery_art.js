const images = new Map();
let loading;
export const SCENERY_ASSETS = Object.freeze({
  tree: new globalThis.URL('../../assets/quarter-forest/tree-flat-v2.webp', import.meta.url).href,
  rock: new globalThis.URL('../../assets/quarter-forest/rock-flat-v2.webp', import.meta.url).href,
  hut: new globalThis.URL('../../assets/quarter-forest/ruin-flat-v2.webp', import.meta.url).href,
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
  canvas.height = 520;
  const ctx = canvas.getContext('2d');
  ctx.translate(150, 460);
  const image = images.get(type);
  if (!image) return canvas;
  ctx.fillStyle = '#525d3920';
  ctx.beginPath();
  ctx.ellipse(8, 8, type === 'tree' ? 40 : 70, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'tree') {
    ctx.filter = ['none', 'brightness(.72)', 'brightness(1.16) saturate(.7)'][variant % 3];
    if (variant === 1) ctx.scale(-1, 1);
    ctx.drawImage(image, -88, -405, 176, 415);
  } else if (type === 'rock') ctx.drawImage(image, -73, -72, 146, 88);
  else ctx.drawImage(image, -110, -115, 220, 135);
  return canvas;
}
