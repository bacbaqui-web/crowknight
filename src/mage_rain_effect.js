export const MAGE_RAIN = Object.freeze({ charge: 1.4, launch: 0.6, firstDrop: 2, duration: 6.7 });
export function mageRainIntensity(actor) {
  const s=actor.bossPattern;
  if(actor.id!=='fire_mage' || actor.player.dead || actor.respawning || s?.phase!=='cast' || s.mode!=='rain') return 0;
  return Math.max(0,Math.min(1,s.time/0.45,(MAGE_RAIN.duration-s.time)/0.7));
}

// Draw darkness before hazards/HUD so warnings and flames remain readable.
export function drawMageRainAtmosphere(ctx, actors, world, projectEntity) {
  const casters=actors.filter(a=>mageRainIntensity(a)>0);
  if(!casters.length) return;
  ctx.save();
  ctx.fillStyle=`rgba(12,0,14,${Math.max(...casters.map(mageRainIntensity))*.48})`;
  ctx.fillRect(0,0,world.viewW,world.viewH);
  ctx.restore();
  for(const actor of casters) {
    const p=actor.player,t=actor.bossPattern.time,intensity=mageRainIntensity(actor);
    const restore=projectEntity(actor);
    ctx.save();
    const tint=p.formulaTintColor,opacity=p.formulaTintOpacity,capture=p.captureEditRegions;
    try {
      const pulse=.65+.35*Math.sin(t*17)**2;
      ctx.shadowColor='#ff2518';ctx.shadowBlur=24*intensity;
      p.formulaTintColor='#ff2817';p.formulaTintOpacity=.5+.35*pulse;p.captureEditRegions=false;
      p.draw(ctx);
      ctx.globalCompositeOperation='lighter';
      ctx.translate(p.x,p.y-100*Number(p.transform?.scale||1));
      const radius=70+Math.min(1,t/MAGE_RAIN.charge)*70;
      const glow=ctx.createRadialGradient(0,0,5,0,0,radius);
      glow.addColorStop(0,`rgba(255,70,20,${.4*intensity*pulse})`);glow.addColorStop(1,'rgba(255,0,0,0)');
      ctx.fillStyle=glow;ctx.fillRect(-radius,-radius,radius*2,radius*2);
      if(t<MAGE_RAIN.firstDrop) {
        for(let i=0;i<16;i++) {
          const angle=i*Math.PI/8+t*2, r=radius*(1-((t*.8+i/16)%1));
          ctx.fillStyle='#ffad63';ctx.beginPath();ctx.arc(Math.cos(angle)*r,Math.sin(angle)*r,2,0,Math.PI*2);ctx.fill();
        }
      }
      if(t>=MAGE_RAIN.charge && t<MAGE_RAIN.firstDrop+.35) {
        const progress=(t-MAGE_RAIN.charge)/MAGE_RAIN.launch;
        const length=Math.min(1000,progress*1200),fade=Math.min(1,(MAGE_RAIN.firstDrop+.35-t)/.35);
        ctx.globalAlpha=fade;ctx.strokeStyle='#ff2415';ctx.lineWidth=26;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-length);ctx.stroke();
        ctx.strokeStyle='#fff0bd';ctx.lineWidth=7;ctx.stroke();
      }
    } finally {
      p.formulaTintColor=tint;p.formulaTintOpacity=opacity;p.captureEditRegions=capture;
      ctx.restore();restore();
    }
  }
}
