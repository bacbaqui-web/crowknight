export const MOVEMENT_SKILLS = [
  {id:'sprint',name:'바람걸음',detail:'Shift 달리기 해금 · 강화마다 달리기 속도 +10%',icon:'crow-footsteps'},
  {id:'rollChain',name:'연속 구르기',detail:'W 연속 사용 +1회 · 강화마다 +1회(최대 4회) · 마지막 동작 이후 1.2초 쉬면 전부 회복',icon:'seamless-finish'},
  {id:'plunge',name:'까마귀 강하',detail:'공중 F로 내려찍기 · 높이 100=45 / 200=80 피해 · 기본 피해 최대100 · 강화마다 피해 +20%',icon:'forceful-strike'},
  {id:'glide',name:'펼쳐진 날개',detail:'하강 중 Space 유지로 활강 · 강화마다 낙하 속도 감소',icon:'leaping-feather'},
  {id:'rollStrike',name:'가시 깃털',detail:'W 구르기 중 적마다 한 번 20 피해 · 강화마다 피해 +20%',icon:'sharp-blade'},
  {id:'blink',name:'순보',detail:'W를 전방 180 거리 순간이동으로 변경 · 연속 구르기 횟수 공유 · 강화마다 거리 +20',icon:'swift-preparation'},
];
export const ROLL_RECOVERY = 1.2;
export function rollCapacity(player) { return Math.min(4, 1 + (player.runSkills?.rollChain || 0)); }
export function rollRemaining(player) { return Math.max(0, rollCapacity(player) - (player.runRollSpent || 0)); }
export function isRollAction(player, key = player.customActionKey) {
  return Boolean(key && [player.runSkillActions?.roll, player.runSkillActions?.blink].includes(key));
}
export function canUseMovementSkill(player, key) {
  if (!player.runSkills) return true;
  const bindings = player.runSkillActions || {}, ranks = player.runSkills;
  for (const id of ['sprint','plunge','glide','blink']) {
    if (bindings[id] !== key) continue;
    if (!ranks[id]) return false;
    if (id === 'plunge' && (player.onGround || player.runPlunge)) return false;
    if (id === 'glide' && (player.onGround || player.runPlunge || player.vy < 0)) return false;
  }
  if (key === bindings.roll && ranks.blink) return false;
  if (isRollAction(player, key) && rollRemaining(player) === 0) return false;
  return true;
}
export function startMovementSkill(player, key) {
  const bindings = player.runSkillActions || {};
  if (key !== bindings.plunge) player.runPlunge = null;
  if (isRollAction(player, key)) {
    player.runRollSpent = (player.runRollSpent || 0) + 1;
    player.runRollRecovery = ROLL_RECOVERY;
    player.runRollHits = new Set();
    player.runRollLast = null;
    if (key === bindings.blink) {
      player.runBlinkPending = true;
      player.runEvadeTime = Math.max(player.runEvadeTime || 0, 0.12);
    }
  }
  if (key === bindings.plunge) player.runPlunge = {height: Math.max(0, (player.floorY ?? player.y) - player.y)};
}
export function updateMovementSkills(player, dt) {
  if (player.runMovePulse) player.runMovePulse.time = Math.max(0, player.runMovePulse.time - dt);
  if (!(isRollAction(player) && player.isCustomActionActive)) {
    player.runRollRecovery = Math.max(0, (player.runRollRecovery || 0) - dt);
    if (!player.runRollRecovery) player.runRollSpent = 0;
    player.runRollLast = null;
  }
  if (player.dead || player.runParryStun > 0) {player.runPlunge = null;player.runBlinkPending = false;}
}
export function applyMovementSkillPhysics(player, keys) {
  if (!player.runSkills) return;
  if (player.runPlunge && !player.onGround) {
    player.vy = 85;player.vx *= 0.5;return;
  }
  if (player.runSkills.glide && !player.onGround && player.vy > 0 && keys?.has('Space')) {
    player.vy = Math.min(player.vy, Math.max(2, 9 / (1 + (player.runSkills.glide - 1) * 0.2)));
  }
}
export function resetMovementSkills(player) {
  player.runRollSpent = 0;player.runRollRecovery = 0;player.runRollHits = null;
  player.runRollLast = null;player.runPlunge = null;player.runBlinkPending = false;player.runMovePulse = null;
}
export function plungeDamage(height, rank) { return Math.min(100, 20 * (1 + Math.max(0, height) / 200) ** 2) * (1 + Math.max(0, rank - 1) * 0.2); }
export function drawMovementStatus(ctx, actor, x, y) {
  const p = actor.player;
  if (!p?.runSkills || p.runSkills.parry) return;
  ctx.save();ctx.fillStyle='#a8efd0';ctx.font='10px sans-serif';ctx.textAlign='center';
  const left = rollRemaining(p);
  ctx.fillText(`${p.runSkills.blink ? '순보' : '구르기'} ${left}/${rollCapacity(p)}${!left ? ` · ${(p.runRollRecovery || 0).toFixed(1)}초` : ''}`,x,y-10);
  const pulse=p.runMovePulse;
  if (pulse?.time>0) {
    ctx.globalAlpha *= Math.min(1,pulse.time*3);ctx.strokeStyle='#a8efd0';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(p.x,p.y, pulse.radius*(1-pulse.time/.45),18,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}

export function prepareMovementPose(player, keys, requestAction) {
  if (!player.runSkills?.glide || player.dead || player.runParryStun > 0 || player.runPlunge) return;
  const key=player.runSkillActions?.glide;
  const gliding=!player.onGround && player.vy>0 && keys.has('Space');
  if(gliding && !player.isCustomActionActive) requestAction(player,key,player.facing,'tap');
  if(!gliding && player.customActionKey===key) {player.customActionKey=null;player.customActionTime=0;}
}
