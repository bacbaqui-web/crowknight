import { QUARTER_PROJECTION } from './camera.js';
import { SCENERY_TYPES } from './environment.js';

// Shared ink outline, muted ochres and moss greens match the segmented character artwork.
export function createScenerySprite(type, createSurface = () => document.createElement('canvas')) {
  const canvas = createSurface();
  canvas.width = 300;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  ctx.translate(150, 300);
  const slope = QUARTER_PROJECTION.slope,
    o = SCENERY_TYPES[type],
    w = o.w / 2,
    d = (o.d * slope) / 2,
    h = o.height;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#171e19';
  function polygon(points, fill) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }
  function line(points, color = '#30392b', width = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = '#171e19';
    ctx.lineWidth = 3;
  }
  ctx.fillStyle = '#111b1744';
  ctx.beginPath();
  ctx.ellipse(12, 7, type === 'tree' ? 70 : w + 12, d + 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'rock') {
    polygon(
      [
        [-w, d],
        [-w, -d - h * 0.6],
        [-w * 0.65, -d - h],
        [w * 0.65, -d - h],
        [w, -h * 0.6],
        [w, d],
        [w * 0.5, d + 8],
        [-w * 0.6, d + 7],
      ],
      '#747764'
    );
    polygon(
      [
        [-w, -d - h * 0.6],
        [-w * 0.65, -d - h],
        [w * 0.65, -d - h],
        [w, -h * 0.6],
        [w * 0.45, d - h],
        [-w * 0.6, d - h],
      ],
      '#a1a28a'
    );
    polygon(
      [
        [w * 0.45, d - h],
        [w, -h * 0.6],
        [w, d],
        [w * 0.5, d + 8],
      ],
      '#505b50'
    );
    line([
      [-30, -38],
      [-12, -30],
      [-19, -14],
    ]);
    line(
      [
        [18, -53],
        [34, -46],
        [40, -40],
      ],
      '#c0bda0'
    );
    polygon(
      [
        [-58, -46],
        [-40, -58],
        [-12, -53],
        [-20, -44],
        [-43, -40],
      ],
      '#6a8052'
    );
  } else if (type === 'hut') {
    polygon(
      [
        [-w, -d],
        [-w, d],
        [w, d],
        [w, -d],
      ],
      '#615b47'
    );
    polygon(
      [
        [-w, -d - h],
        [-w, d - h],
        [-w, d],
        [w, d],
        [w, d - h],
        [w, -d - h],
      ],
      '#a0916c'
    );
    polygon(
      [
        [w, -d - h],
        [w, d - h],
        [w, d],
        [w - 25, d - 12],
        [w - 25, -d - h],
      ],
      '#756a50'
    );
    polygon(
      [
        [-w - 5, -d - h],
        [w + 5, -d - h],
        [w + 5, d - h],
        [-w - 5, d - h],
      ],
      '#b2a47b'
    );
    for (let i = 0; i < 5; i++)
      line(
        [
          [-w + 5, -d - h + 7 + i * 12],
          [w - 4, -d - h + 7 + i * 12],
        ],
        '#887e60',
        1
      );
    polygon(
      [
        [-25, d],
        [-25, d - 49],
        [8, d - 49],
        [8, d],
      ],
      '#3e4335'
    );
    line(
      [
        [-8, d - 43],
        [-8, d - 3],
      ],
      '#746443'
    );
    for (let y = d - 18; y > d - h + 6; y -= 20)
      line(
        [
          [-w + 5, y],
          [-30, y],
        ],
        '#766d53'
      );
    polygon(
      [
        [34, d - 48],
        [59, d - 48],
        [59, d - 28],
        [34, d - 28],
      ],
      '#3f5148'
    );
    line(
      [
        [46, d - 46],
        [46, d - 30],
      ],
      '#c0b18a'
    );
    polygon(
      [
        [-w - 5, -d - h],
        [-w - 5, -d - h - 8],
        [w + 5, -d - h - 8],
        [w + 5, -d - h],
      ],
      '#7d8259'
    );
  } else {
    polygon(
      [
        [-25, 5],
        [-13, -95],
        [-31, -155],
        [-10, -163],
        [4, -115],
        [20, -178],
        [35, -170],
        [18, -95],
        [24, 5],
        [2, -3],
      ],
      '#7b684b'
    );
    line(
      [
        [-3, -9],
        [3, -84],
        [-8, -132],
      ],
      '#b19b6c',
      3
    );
    polygon(
      [
        [-93, -137],
        [-112, -177],
        [-79, -207],
        [-58, -239],
        [-12, -232],
        [25, -265],
        [67, -242],
        [72, -211],
        [111, -187],
        [100, -150],
        [58, -129],
        [13, -142],
        [-28, -121],
      ],
      '#384f39'
    );
    polygon(
      [
        [-103, -177],
        [-77, -207],
        [-55, -232],
        [-12, -225],
        [26, -255],
        [62, -238],
        [47, -204],
        [7, -190],
        [-15, -157],
        [-52, -168],
      ],
      '#63774c'
    );
    polygon(
      [
        [6, -192],
        [47, -204],
        [83, -189],
        [94, -163],
        [54, -145],
        [21, -157],
      ],
      '#4c6641'
    );
    line(
      [
        [-77, -181],
        [-56, -193],
        [-32, -185],
      ],
      '#899263',
      3
    );
    line(
      [
        [17, -226],
        [35, -234],
        [49, -225],
      ],
      '#899263',
      3
    );
  }
  // Small grass clumps visually seat every object on the ground.
  for (const x of [-w - 9, w + 7]) {
    line(
      [
        [x - 7, 10],
        [x - 10, -2],
        [x, 8],
        [x + 3, -5],
        [x + 7, 8],
      ],
      '#738457',
      2
    );
  }
  return canvas;
}
