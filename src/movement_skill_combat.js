import { createBlinkDecoy } from './blink_decoy.js';
import { applyInteractionDamage } from './combat_reaction_helper.js';
import { plungeDamage } from './movement_skill_helper.js';
import { constrainGroundPosition } from './quarter_view/bounds.js';
export function resolveMovementSkills({actors,playerActor,world,...callbacks}) {
  const p=playerActor.player,ranks=p.runSkills;
  if(!ranks || p.dead || playerActor.hp<=0) return;
  if(p.runBlinkPending) {
    p.runBlinkPending=false;
    createBlinkDecoy(playerActor);
    const distance=180+Math.max(0,ranks.blink-1)*20;
    const aim=world?.quarterView ? playerActor.quarterAim || {x:p.facing||1,z:0} : {x:p.facing||1,z:0};
    const length=Math.hypot(aim.x,aim.z)||1;
    p.x+=distance*aim.x/length;
    if(world?.quarterView) {playerActor.quarterDepth=(playerActor.quarterDepth||0)+distance*aim.z/length;constrainGroundPosition(playerActor,world);}
    else p.x=Math.max(world?.minX??-Infinity,Math.min(world?.maxX??Infinity,p.x));
    p.vx=0;p.vxInertia=null;p.customActionTargetMove=null;playerActor.previousAttackRegions=[];
    p.runMovePulse={radius:80,time:.45};
  }
  const rolling=ranks.rollStrike && p.customActionKey===p.runSkillActions?.roll && p.isCustomActionActive;
  const slam=p.runPlunge && p.onGround;
  if(!rolling && !slam) return;
  const origin={x:p.x,y:world?.quarterView ? playerActor.quarterDepth||0 : p.y};
  const previous=rolling ? p.runRollLast||origin : origin;
  const radius=slam ? 120 : 55;
  const damage=slam ? plungeDamage(p.runPlunge.height,ranks.plunge) : 20*(1+Math.max(0,ranks.rollStrike-1)*.2);
  if(slam) {p.runPlunge=null;p.runMovePulse={radius,time:.45};}
  if(rolling) {p.runRollLast=origin;p.runRollHits ||=new Set();}
  for(const target of actors) {
    if(target===playerActor || !['mobs','bosses'].includes(target.group) || target.hp<=0 || target.player.dead || target.respawning || target.invulnTime>0) continue;
    if(rolling && p.runRollHits.has(target)) continue;
    if(world?.quarterView && Math.abs(target.player.y-p.y)>100) continue;
    const point={x:target.player.x,y:world?.quarterView ? target.quarterDepth||0 : target.player.y};
    if(segmentDistance(point,previous,origin)>radius) continue;
    if(rolling) p.runRollHits.add(target);
    applyInteractionDamage({...callbacks,attacker:playerActor,target,playerActor,world,damage});
  }
}
function segmentDistance(point,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,denom=dx*dx+dy*dy;
  const t=denom ? Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/denom)) : 0;
  return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);
}
