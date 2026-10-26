import {
  GROUND_PATTERNS,
  GROUND_TRANSITIONS,
  preloadGroundPatterns,
  terrainColor,
} from '../../src/quarter_view/ground_patterns.js';
await preloadGroundPatterns();
function paint(canvas, colorAt) {
  const ctx = canvas.getContext('2d'),
    image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const c = colorAt(x, y),
        p = (y * canvas.width + x) * 4;
      image.data[p] = c[0];
      image.data[p + 1] = c[1];
      image.data[p + 2] = c[2];
      image.data[p + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
}
paint(document.querySelector('#map'), (x, y) => terrainColor(x * 2 - 180, y * 2 - 700));
const catalog = [...GROUND_PATTERNS.map((p) => [p.id, p.id, p.label]), ...GROUND_TRANSITIONS];
for (const [i, [a, b, label]] of catalog.entries()) {
  const figure = document.createElement('figure'),
    canvas = document.createElement('canvas'),
    caption = document.createElement('figcaption');
  canvas.width = canvas.height = 160;
  canvas.setAttribute('aria-label', label);
  paint(canvas, (x, y) =>
    terrainColor(x * 2, y * 2, {
      a,
      b,
      mix: a === b ? 0 : Math.max(0, Math.min(1, (x - 64 + Math.sin(y / 16) * 9) / 32)),
    })
  );
  caption.textContent = `${i + 1}. ${label}`;
  figure.append(canvas, caption);
  document.querySelector('#patterns').append(figure);
}
document.querySelector('#status').textContent = '24종 준비 완료 · 위 지도는 시작 공터와 오른쪽 위 연못 주변입니다.';
