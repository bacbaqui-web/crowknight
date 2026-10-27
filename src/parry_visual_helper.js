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
