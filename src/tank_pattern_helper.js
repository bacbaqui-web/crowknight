import { requestRuntimeAction } from './action_trigger_engine.js';
import { resetPlayerActionState } from './actor_state.js';

export function updateTankPattern(actor, target, world, dt, emit) {
  const p=actor.player, s=actor.bossPattern;
  if (s.mode==='missiles' && s.phase==='cast') {
    while(s.drops<12 && s.time>=0.25+s.drops*0.14) {
      const i=s.drops++, angle=i*2.399963, radius=i%4===0?0:160+(i*83)%500;
      emit('missile',{x:s.aimX+Math.cos(angle)*radius,z:s.aimZ+Math.sin(angle)*radius});
    }
    if(s.time>=2.6) {s.phase='walk';s.time=0;s.cooldown=5;}
    return;
  }
  if(p.actionKey==='tankCharge') {
    if(p.customActionElapsed<2.2) return;
    resetPlayerActionState(p);requestRuntimeAction(p,'tankDrive',p.facing);
    s.time=0;s.cooldown=4;
  }
  s.dropTime=(s.dropTime||0)+dt;
  if(s.dropTime>=0.9) {emit('mine',{x:p.x,z:actor.quarterDepth||0});s.dropTime=0;}
  if(s.cooldown>0 || p.hurtTime>0) return;
  if(s.index%3===2) {
    resetPlayerActionState(p);
    s.phase='cast';s.mode='missiles';s.time=0;s.drops=0;
    s.aimX=target.player.x;s.aimZ=target.quarterDepth||0;s.index++;
  } else {
    const dx=target.player.x-p.x,dz=(target.quarterDepth||0)-(actor.quarterDepth||0),length=Math.hypot(dx,dz)||1;
    actor.quarterAim={x:dx/length,z:dz/length};p.facing=dx<0?-1:1;
    if(requestRuntimeAction(p,'tankCharge',p.facing)) {s.cooldown=6;s.index++;}
  }
}

export function tankPatrolDirection(actor, target, fallback) {
  if(actor.id!=='ram_tank' || actor.player.actionKey==='tankCharge' || actor.bossPattern?.phase==='cast') return fallback;
  const dx=target.player.x-actor.player.x,dz=(target.quarterDepth||0)-(actor.quarterDepth||0),length=Math.hypot(dx,dz)||1;
  const radial=length>550?0.8:length<230?-0.7:0.1;
  const turn=Math.sin((actor.player.animTime||0)*0.3)>=0?1:-1;
  const x=dx/length*radial-dz/length*turn,z=dz/length*radial+dx/length*turn, norm=Math.hypot(x,z)||1;
  return {x:x/norm,z:z/norm};
}
