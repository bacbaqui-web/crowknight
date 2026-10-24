import { groundPoint } from './camera.js';

// Preserve the existing tile pattern, projecting only columns that can enter the viewport.
export function visibleGroundTiles(view, center) {
  const tiles = [];
  for (let row = -24; row <= 24; row++) {
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
export function createGroundRenderer(ctx, world) {
  let shade, shadeHeight;
  function path(tile) {
    tile.points.forEach((p, index) => (index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  return (hero, view) => {
    ctx.fillStyle = '#17251f';
    ctx.fillRect(0, 0, world.viewW, world.viewH);
    const center = Math.floor(hero.player.x / 100) * 100;
    const tiles = visibleGroundTiles(view, center);
    for (const parity of [false, true]) {
      ctx.beginPath();
      tiles.filter((tile) => tile.parity === parity).forEach(path);
      ctx.fillStyle = parity ? '#293d31' : '#2d4135';
      ctx.fill();
    }
    ctx.beginPath();
    tiles.forEach(path);
    ctx.strokeStyle = '#71826a25';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const z of [-480, 480]) {
      const a = groundPoint(center - 1900, z, view),
        b = groundPoint(center + 1900, z, view);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#b5c38880';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (shadeHeight !== world.viewH) {
      shadeHeight = world.viewH;
      shade = ctx.createLinearGradient(0, 0, 0, shadeHeight);
      shade.addColorStop(0, '#0d1918ee');
      shade.addColorStop(0.48, '#17251f00');
      shade.addColorStop(1, '#07100b44');
    }
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, world.viewW, world.viewH);
  };
}
