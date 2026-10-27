import { parryStats } from './parry_skill_helper.js';

export function parryActive(player) {
  return Boolean(player.runSkills?.parry && !player.dead && player.runParryTime > 0 &&
    player.customActionKey === player.runSkillActions?.guard);
}
// Runtime pose overlay leaves authored setting animations untouched.
export function parryPoseOffset(player, key, offset) {
  if (!parryActive(player) || player.actionPreview) return offset;
  if (key === 'shield') return { ...offset, opacity: 0 };
  const rotations = { upperArmR: -65, lowerArmR: -45, weapon: -65, upperArmL: -45, lowerArmL: -35 };
  return key in rotations ? { ...offset, rot: Number(offset.rot || 0) + rotations[key] } : offset;
}
export function drawParryFeedback(ctx, player) {
  const active = parryActive(player), flash = player.runParryFlash || 0;
  if (!active && flash <= 0) return;
  const x=player.x, y=player.y-55, facing=player.facing || 1;
  ctx.save();ctx.translate(x,y);ctx.scale(facing,1);
  if (active && flash <= 0) drawParryWindow(ctx, player);
  ctx.strokeStyle=flash>0?'#fff6bf':'#b7f5ff';ctx.lineWidth=flash>0?5:2;
  ctx.shadowColor='#b7f5ff';ctx.shadowBlur=flash>0?22:10;
  ctx.beginPath();ctx.arc(0,0,45,-1.15,1.15);ctx.stroke();
  if(flash>0) for(let i=0;i<7;i++) {
    const angle=-1.2+i*.4, r=48+(1-flash/.25)*24;
    ctx.beginPath();ctx.moveTo(Math.cos(angle)*r,Math.sin(angle)*r);
    ctx.lineTo(Math.cos(angle)*(r+14),Math.sin(angle)*(r+14));ctx.stroke();
  }
  ctx.restore();
}

function drawParryWindow(ctx, player) {
  const duration = parryStats(player).window;
  const remaining = Math.max(0, Math.min(1, player.runParryTime / duration));
  const elapsed = Math.max(0, duration - player.runParryTime);
  const opening = Math.min(1, elapsed / .16);
  const radius = 28 + 24 * opening;
  const pulse = .5 + .5 * Math.sin(elapsed * 14);
  ctx.save();
  ctx.shadowColor = '#87edff';ctx.shadowBlur = 15 + pulse * 6;
  // A translucent fan unfolds in front of the club, not over the player's silhouette.
  ctx.fillStyle = `rgba(100,220,255,${.10 + pulse * .06})`;
  ctx.beginPath();ctx.moveTo(5,0);ctx.arc(0,0,radius,-1.2,1.2);ctx.closePath();ctx.fill();
  ctx.strokeStyle = 'rgba(140,235,255,.25)';ctx.lineWidth = 4;
  ctx.beginPath();ctx.arc(0,0,radius,-1.2,1.2);ctx.stroke();
  // The bright edge drains with the actual parry window.
  ctx.strokeStyle = '#c8faff';ctx.lineWidth = 3;
  ctx.beginPath();ctx.arc(0,0,radius,-1.2,-1.2+2.4*remaining);ctx.stroke();
  if (elapsed < .24) {
    ctx.globalAlpha *= 1-elapsed/.24;
    ctx.lineWidth = 2;ctx.beginPath();ctx.arc(0,0,35+elapsed*100,-1.5,1.5);ctx.stroke();
  }
  ctx.restore();
}
