import { groundPoint } from './camera.js';

export function createGroundOverlay(ctx, world) {
  let shade, shadeHeight;
  return (hero, view) => {
    const center = Math.floor(hero.player.x / 100) * 100;
    for (const z of world.quarterView?.unbounded ? [] : [-480, 480]) {
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
