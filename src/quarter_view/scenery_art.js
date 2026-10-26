import { QUARTER_PROJECTION } from './camera.js';
import { SCENERY_TYPES } from './environment.js';

// Fixed-size cached illustrations: the same dark ink, flat shadows and muted palette as the actors.
export function createScenerySprite(type, createSurface = () => document.createElement('canvas'), variant = 0) {
  const canvas = createSurface();
  canvas.width = 300;
  canvas.height = 360;
  const c = canvas.getContext('2d');
  c.translate(150, 300);
  c.lineJoin = 'round';
  const o = SCENERY_TYPES[type],
    w = o.w / 2,
    d = (o.d * QUARTER_PROJECTION.slope) / 2,
    h = o.height;
  function poly(points, fill, stroke = '#17231e', width = 3) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
  }
  function line(points, color = '#414d3c', width = 2) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }
  c.fillStyle = '#0e191c55';
  c.beginPath();
  c.ellipse(14, 9, type === 'tree' ? 88 : w + 20, d + 18, 0, 0, Math.PI * 2);
  c.fill();
  if (type === 'rock') {
    poly(
      [
        [-w, 4],
        [-w, -26],
        [-36, -h - d],
        [24, -h - d - 3],
        [w, -34],
        [w, 13],
        [12, 23],
        [-33, 18],
      ],
      '#687468'
    );
    poly(
      [
        [-w, -26],
        [-36, -h - d],
        [24, -h - d - 3],
        [w, -34],
        [13, -22],
        [-28, -20],
      ],
      '#a0a28a'
    );
    poly(
      [
        [13, -22],
        [w, -34],
        [w, 13],
        [12, 23],
      ],
      '#4d6057'
    );
    poly(
      [
        [-48, -39],
        [-34, -h - d + 3],
        [-8, -h - d + 2],
        [3, -44],
        [-20, -29],
        [-39, -30],
      ],
      '#61784e'
    );
    line(
      [
        [-24, -21],
        [-10, -12],
        [-16, 3],
        [-5, 16],
      ],
      '#35483f'
    );
    line(
      [
        [23, -55],
        [38, -44],
        [27, -37],
      ],
      '#c3bea0'
    );
    for (let i = 0; i < 4; i++)
      line(
        [
          [-43 + i * 9, -40 - (i % 2) * 4],
          [-38 + i * 9, -44 - (i % 2) * 4],
        ],
        '#8b9b66'
      );
  } else if (type === 'hut') {
    // A low ruined watch-house retains a flat, jumpable stone roof.
    poly(
      [
        [-w, d - h],
        [-w, d],
        [w, d],
        [w, d - h],
      ],
      '#818775'
    );
    poly(
      [
        [w - 27, d - h + 8],
        [w, -d - h],
        [w, d],
        [w - 27, d + 4],
      ],
      '#596b61'
    );
    poly(
      [
        [-w, -d - h],
        [w, -d - h],
        [w, d - h],
        [-w, d - h],
      ],
      '#aaa58a'
    );
    for (let row = 0; row < 3; row++) {
      const y = d - 20 - row * 22;
      line(
        [
          [-w + 3, y],
          [w - 30, y],
        ],
        '#505d50'
      );
      for (let x = -w + 15 + (row % 2) * 20; x < w - 35; x += 40)
        line(
          [
            [x, y],
            [x, y + 20],
          ],
          '#5a6453',
          1.5
        );
    }
    poly(
      [
        [-24, d],
        [-24, d - 37],
        [-16, d - 48],
        [4, d - 48],
        [14, d - 37],
        [14, d],
      ],
      '#20342f'
    );
    line(
      [
        [-24, d - 37],
        [-16, d - 48],
        [4, d - 48],
        [14, d - 37],
      ],
      '#c1b89a',
      4
    );
    // Broken rear wall and exposed masonry give the silhouette its ruin character.
    poly(
      [
        [-w, -d - h],
        [-w, -d - h - 37],
        [-63, -d - h - 37],
        [-63, -d - h - 22],
        [-43, -d - h - 25],
        [-43, -d - h - 9],
        [-18, -d - h - 9],
        [-18, -d - h],
      ],
      '#8d947d'
    );
    poly(
      [
        [36, -d - h],
        [36, -d - h - 14],
        [56, -d - h - 14],
        [56, -d - h - 30],
        [w, -d - h - 30],
        [w, -d - h],
      ],
      '#738371'
    );
    line(
      [
        [-79, -d - h - 16],
        [-65, -d - h - 16],
      ],
      '#c3bda0'
    );
    for (let j = 0; j < 3; j++)
      line(
        [
          [-70, d - h - 8 - j * 14],
          [66, d - h - 8 - j * 14],
        ],
        '#7c8872',
        1
      );
    poly(
      [
        [-w, d - h],
        [-50, d - h],
        [-46, d - h + 15],
        [-57, d - h + 19],
        [-62, d - h + 38],
        [-73, d - h + 27],
      ],
      '#405e43'
    );
    for (let i = 0; i < 5; i++)
      line(
        [
          [-70 + i * 4, d - h + 4],
          [-67 + i * 4, d - h + 15 + i * 3],
        ],
        '#80945b',
        2
      );
    poly(
      [
        [26, d - h - 15],
        [43, d - h - 23],
        [56, d - h - 14],
        [46, d - h - 6],
      ],
      '#8a8f79'
    );
    line(
      [
        [37, d - 59],
        [45, d - 43],
        [35, d - 29],
        [44, d - 19],
      ],
      '#46584c'
    );
    poly(
      [
        [-w - 7, d],
        [-w - 16, d - 7],
        [-w - 27, d],
        [-w - 18, d + 10],
      ],
      '#7b8672'
    );
  } else {
    const palette = [
      ['#304b3c', '#516e48', '#738351'],
      ['#29463a', '#476844', '#647e4b'],
      ['#354a3b', '#5d7047', '#86915b'],
    ][variant % 3];
    poly(
      [
        [-25, 9],
        [-13, -68],
        [-16, -145],
        [4, -179],
        [22, -165],
        [14, -95],
        [21, -14],
        [34, 9],
        [8, 2],
        [-5, 11],
      ],
      '#685e45'
    );
    poly(
      [
        [-12, -91],
        [-53, -130],
        [-68, -172],
        [-53, -175],
        [-32, -139],
        [1, -124],
      ],
      '#6f694d'
    );
    poly(
      [
        [9, -98],
        [49, -139],
        [64, -168],
        [52, -178],
        [30, -140],
        [8, -132],
      ],
      '#716a4c'
    );
    line(
      [
        [-7, -4],
        [-1, -51],
        [-4, -103],
        [7, -148],
      ],
      '#a39668',
      3
    );
    line(
      [
        [12, -23],
        [6, -47],
        [13, -76],
      ],
      '#3e4b3b',
      2
    );
    const crown = (cx, cy, rx, ry, fill) =>
      poly(
        [
          [cx - rx, cy + ry * 0.25],
          [cx - rx * 0.92, cy - ry * 0.4],
          [cx - rx * 0.5, cy - ry * 0.65],
          [cx - rx * 0.15, cy - ry],
          [cx + rx * 0.25, cy - ry * 0.87],
          [cx + rx * 0.58, cy - ry * 0.6],
          [cx + rx, cy - ry * 0.35],
          [cx + rx * 0.92, cy + ry * 0.35],
          [cx + rx * 0.4, cy + ry * 0.62],
          [cx, cy + ry * 0.45],
          [cx - rx * 0.45, cy + ry * 0.65],
        ],
        fill
      );
    crown(-45, -174, 72, 57, palette[0]);
    crown(47, -177, 74, 62, palette[0]);
    crown(-18 + variant * 5, -222, 86, 61, palette[1]);
    poly(
      [
        [-90, -229],
        [-63, -253],
        [-33, -256],
        [-14, -278],
        [12, -272],
        [36, -256],
        [4, -250],
        [-10, -231],
        [-47, -220],
      ],
      palette[2],
      null
    );
    crown(40, -184, 61, 40, palette[1]);
    line(
      [
        [-68, -239],
        [-50, -245],
        [-34, -241],
      ],
      '#a0a572',
      2
    );
    line(
      [
        [26, -198],
        [46, -204],
        [65, -195],
      ],
      '#8c9a61',
      2
    );
    line(
      [
        [-87, -174],
        [-67, -182],
        [-49, -175],
      ],
      '#617a52',
      2
    );
    // Ivy and roots anchor trunks to the forest floor.
    line(
      [
        [-13, -26],
        [-26, -9],
        [-44, 6],
      ],
      '#637449',
      4
    );
    line(
      [
        [14, -20],
        [31, -6],
        [48, 5],
      ],
      '#596d43',
      4
    );
  }
  for (const x of [-w - 9, w + 7]) {
    line(
      [
        [x - 10, 10],
        [x - 13, -5],
        [x - 3, 7],
        [x + 2, -8],
        [x + 6, 6],
        [x + 13, -2],
      ],
      '#718654',
      2
    );
    poly(
      [
        [x + 13, 6],
        [x + 19, 2],
        [x + 24, 6],
        [x + 18, 9],
      ],
      '#99936a',
      null
    );
  }
  return canvas;
}
