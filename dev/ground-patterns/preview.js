import { preloadGroundPatterns, terrainColor, transitionColor } from '../../src/quarter_view/ground_patterns.js';
import { DUAL_LAYERS } from '../../src/quarter_view/dual_grid.js';
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
const labels = ['풀 ↔ 흙', '풀 ↔ 물가', '흙 ↔ 돌길', '흙 ↔ 폐허', '물가 ↔ 물'];
for (const [i, layer] of DUAL_LAYERS.entries()) {
  const section = document.createElement('section'),
    title = document.createElement('h2'),
    atlas = document.createElement('canvas'),
    link = document.createElement('a');
  title.textContent = labels[i] + ' · 코너 조합 16종';
  atlas.width = atlas.height = 512;
  atlas.setAttribute('aria-label', title.textContent);
  paint(atlas, (x, y) => {
    const cx = Math.floor(x / 128),
      cz = Math.floor(y / 128),
      mask = cz * 4 + cx;
    return transitionColor(
      layer.base,
      layer.id,
      mask,
      (x % 128) / 127,
      (y % 128) / 127,
      ((x % 128) * 800) / 127,
      ((y % 128) * 800) / 127
    );
  });
  link.textContent = '16타일 PNG 다운로드';
  link.download = 'dual-' + layer.id + '-16.png';
  link.href = atlas.toDataURL('image/png');
  section.append(title, atlas, link);
  document.querySelector('#patterns').append(section);
}
document.querySelector('#status').textContent =
  'Dual-grid 5세트 · 80개 연결 타일 준비 완료. NW=1, NE=2, SW=4, SE=8 순서의 비트 조합입니다.';
