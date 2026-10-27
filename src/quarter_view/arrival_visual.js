import { ARRIVAL_DURATION, ARRIVAL_FLIGHT } from './arrival.js';

export function arrivalPose(time) {
  const landing = Math.max(0, Math.min(1, (time - ARRIVAL_FLIGHT) / (ARRIVAL_DURATION - ARRIVAL_FLIGHT)));
  return { squash: 1 - Math.sin(Math.PI * landing) * 0.1 };
}

export function drawArrival(ctx, world, actor, time) {
  const p = actor.player;
  const pose = arrivalPose(time);
  ctx.save();
  ctx.fillStyle = '#17222255';
  ctx.beginPath();
  ctx.ellipse(p.x, world.floorY + 3, 27, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(p.x, p.y);
  ctx.scale(1, pose.squash);
  ctx.translate(-p.x, -p.y);
  p.draw(ctx);
  ctx.restore();
}
