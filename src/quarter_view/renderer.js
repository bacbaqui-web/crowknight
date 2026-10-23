import { LIMIT, project } from './simulation.js';

export function createRenderer(canvas, templates) {
  const ctx = canvas.getContext('2d');
  let width = 1280,
    height = 760,
    zoom = 1,
    camera = { x: 0, y: 0 };
  const screen = (x, z) => {
    const p = project(x, z);
    return { x: width / 2 + (p.x - camera.x) * zoom, y: height * 0.57 + (p.y - camera.y) * zoom };
  };
  function path(points) {
    ctx.beginPath();
    points.forEach(([x, z], index) => {
      const p = screen(x, z);
      if (index) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
  }
  function ring(body, radius, fill, stroke) {
    const p = screen(body.x, body.z);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, radius * zoom * 1.225, radius * zoom * 0.707, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  function drawBody(body, hero, elapsed) {
    const p = screen(body.x, body.z);
    ring(body, hero ? 23 : 19, '#09100e80', hero ? '#c5e69d' : null);
    if (body.warning > 0) ring(body, 72, '#f0605020', '#ff8067');
    const actor = hero ? templates.hero : templates.enemy;
    const puppet = actor.player;
    const facing = project(body.aim.x, body.aim.z).x;
    puppet.facing = facing < -0.01 ? -1 : facing > 0.01 ? 1 : puppet.facing;
    puppet.x = 0;
    puppet.y = 0;
    puppet.fallbackActionKey = body.swing > 0 ? 'attack1' : body.moving ? 'run' : 'idle';
    puppet.stateTime = body.swing > 0 ? 0.24 - body.swing : elapsed;
    puppet.animTime = elapsed;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(zoom, zoom);
    if (body.flash > 0) ctx.filter = 'brightness(2)';
    if (hero && body.immune > 0) ctx.globalAlpha = 0.65;
    puppet.draw(ctx);
    ctx.restore();
    if (!hero) {
      ctx.fillStyle = '#18211b';
      ctx.fillRect(p.x - 18 * zoom, p.y - 118 * zoom, 36 * zoom, 4);
      ctx.fillStyle = '#d69b79';
      ctx.fillRect(p.x - 18 * zoom, p.y - 118 * zoom, (36 * zoom * body.hp) / 3, 4);
    }
    if (body.swing > 0) {
      const angle = Math.atan2(body.aim.z, body.aim.x);
      const points = [[body.x, body.z]];
      for (let i = 0; i <= 20; i++) {
        const a = angle - 1.3 + (i * 2.6) / 20;
        points.push([body.x + Math.cos(a) * 125, body.z + Math.sin(a) * 125]);
      }
      path(points);
      ctx.fillStyle = hero ? '#d9ef9b50' : '#f8876040';
      ctx.fill();
      ctx.strokeStyle = '#eef9be';
      ctx.stroke();
    }
  }
  return {
    screen,
    draw(state) {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      zoom = Math.min(1.1, Math.max(0.65, width / 1100));
      camera = project(state.hero.x * 0.65, state.hero.z * 0.65);
      ctx.fillStyle = '#17231f';
      ctx.fillRect(0, 0, width, height);
      for (let x = -LIMIT; x < LIMIT; x += 80)
        for (let z = -LIMIT; z < LIMIT; z += 80) {
          path([
            [x, z],
            [Math.min(x + 80, LIMIT), z],
            [Math.min(x + 80, LIMIT), Math.min(z + 80, LIMIT)],
            [x, Math.min(z + 80, LIMIT)],
          ]);
          ctx.fillStyle = ((x + LIMIT) / 80 + (z + LIMIT) / 80) % 2 ? '#293b32' : '#2d4036';
          ctx.fill();
          ctx.strokeStyle = '#43524655';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      path([
        [-LIMIT, -LIMIT],
        [LIMIT, -LIMIT],
        [LIMIT, LIMIT],
        [-LIMIT, LIMIT],
      ]);
      ctx.strokeStyle = '#a5b883';
      ctx.lineWidth = 3;
      ctx.stroke();
      const entities = [...state.enemies.filter((enemy) => enemy.hp > 0), state.hero];
      entities.sort((a, b) => a.x + a.z - (b.x + b.z));
      entities.forEach((body) => drawBody(body, body === state.hero, state.elapsed));
      const p = screen(state.hero.x + state.hero.aim.x * 145, state.hero.z + state.hero.aim.z * 145);
      ctx.strokeStyle = '#e5efb3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - 5, p.y);
      ctx.lineTo(p.x + 5, p.y);
      ctx.moveTo(p.x, p.y - 5);
      ctx.lineTo(p.x, p.y + 5);
      ctx.stroke();
    },
  };
}
