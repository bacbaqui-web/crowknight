// Fixed-size procedural layers: deterministic simulation time, no growing particle pool.
export function drawFireBurst(ctx, radius, time, slope = .45) {
  const t=Math.max(0,time), fade=Math.max(0,1-t/1.2);
  if(!fade) return;
  ctx.save();ctx.shadowBlur=0;
  for(let i=0;i<7;i++) {
    const angle=i*2.39996, spread=radius*(.18+t*.45);
    const x=Math.cos(angle)*spread, y=-radius*.3-t*radius*.65+Math.sin(angle)*spread*.4;
    const size=radius*(.18+t*.23);
    const smoke=ctx.createRadialGradient(x,y,0,x,y,size);
    smoke.addColorStop(0,`rgba(65,55,53,${fade*.48})`);smoke.addColorStop(1,'rgba(35,30,30,0)');
    ctx.fillStyle=smoke;ctx.fillRect(x-size,y-size,size*2,size*2);
  }
  ctx.globalCompositeOperation='lighter';
  const hot=Math.max(0,1-t/.38), ring=radius*Math.min(1.4,.2+t*4);
  ctx.strokeStyle=`rgba(255,180,85,${hot*.8})`;ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(0,0,ring,ring*slope,0,0,Math.PI*2);ctx.stroke();
  if(hot>0) {
    const size=radius*(.5+Math.min(1,t*8)*.5), glow=ctx.createRadialGradient(0,-radius*.25,0,0,-radius*.25,size);
    glow.addColorStop(0,`rgba(255,248,202,${hot})`);glow.addColorStop(.25,`rgba(255,174,32,${hot})`);glow.addColorStop(.6,`rgba(255,52,8,${hot*.7})`);glow.addColorStop(1,'rgba(180,10,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(-size,-radius*.25-size,size*2,size*2);
  }
  for(let i=0;i<12;i++) {
    const a=i*2.39996, speed=radius*(1+(i%3)*.3), x=Math.cos(a)*speed*t,y=-radius*.2+Math.sin(a)*speed*t*.6-70*t+80*t*t;
    ctx.strokeStyle=`rgba(255,${130+i*8},45,${fade*.8})`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*8*fade,y-Math.sin(a)*5*fade);ctx.stroke();
  }
  ctx.restore();
}

export function drawFlameSmoke(ctx,x,y,width,height,time,seed=0) {
  ctx.save();ctx.shadowBlur=0;
  for(let i=0;i<4;i++) {
    const t=((time*.45+i/4+seed*.17)%1+1)%1;
    const px=x+width*.5+Math.sin(t*5+i)*width*.22,py=y+height*.25-t*height*.8,r=width*(.12+t*.24);
    const g=ctx.createRadialGradient(px,py,0,px,py,r);
    g.addColorStop(0,`rgba(65,58,62,${(1-t)*.27})`);g.addColorStop(1,'rgba(40,30,30,0)');
    ctx.fillStyle=g;ctx.fillRect(px-r,py-r,r*2,r*2);
  }
  ctx.restore();
}
