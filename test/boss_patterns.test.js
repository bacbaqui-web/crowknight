import { URL } from 'node:url';
import { prepareBossTuning } from '../src/boss_tuning_helper.js';
import { applyInteractionDamage, applyHitReaction } from '../src/combat_reaction_helper.js';
import { stunParriedEnemy } from '../src/parry_skill_helper.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { updateBossPattern, stunTankOnTerrain } from '../src/boss_pattern_runtime.js';
import { makeBossHazard, advanceBossHazard, reflectBarrel } from '../src/boss_hazard_runtime.js';
const data = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
const world = { floorY: 500, gravity: 1800, minX: -10000, maxX: 10000 };
function actor(id = 'powder_chief', x = 0) {
  const player = new PuppetPlayer(x, 500, {});
  const tuning = mergeTuning(DEFAULT_PLAYER_TUNING, data.actors[id].tuning);
  prepareBossTuning(id, tuning);
  player.applyTuning(tuning);
  return { id, player, quarterDepth: 0, hp: 500 };
}
const target = { id: 'player_01', player: { x: 500, y: 500 }, quarterDepth: 0 };
test('rolling bombs bounce, explode on contact, or after three seconds', () => {
  let h = makeBossHazard(actor(), target, world, 'roller');
  advanceBossHazard(h, 0.1, null);
  assert.ok(h.y < 500);
  assert.equal(h.x, 24);
  advanceBossHazard(h, 2.9, null);
  assert.equal(h.phase, 'blast');
  h = makeBossHazard(actor(), target, world, 'roller');
  advanceBossHazard(h, 2, target);
  assert.equal(h.phase, 'blast');
});
test('barrel reflection reverses travel, keeps five-second fuse, assigns player ownership', () => {
  const a = actor(),
    h = makeBossHazard(a, target, world, 'barrel');
  advanceBossHazard(h, 1, null);
  assert.equal(reflectBarrel(h, target), true);
  assert.equal(h.quarterAim.x, -1);
  assert.equal(h.owner, target);
  advanceBossHazard(h, 1, a);
  assert.equal(h.phase, 'blast');
  assert.equal(h.originalOwner, a);
  const timed = makeBossHazard(a, target, world, 'barrel');
  advanceBossHazard(timed, 4.9, null);
  assert.equal(timed.phase, 'flight');
  advanceBossHazard(timed, 0.1, null);
  assert.equal(timed.phase, 'blast');
});
test('giant and rain hold telegraphed target before impact', () => {
  for (const kind of ['giant', 'rain']) {
    const h = makeBossHazard(actor(), target, world, kind);
    advanceBossHazard(h, h.fuse * 0.9, null);
    assert.equal(h.phase, 'flight');
    assert.ok(h.y < 500);
    advanceBossHazard(h, h.fuse * 0.11, null);
    assert.equal(h.phase, 'blast');
    assert.equal(h.x, 500);
  }
});
test('real authored actions cycle through all ranged boss skills', () => {
  for (const [id, expected] of [
    ['powder_chief', ['roller', 'giant', 'barrel']],
    ['fire_mage', ['line', 'fireball', 'rain']],
  ]) {
    const a = actor(id),
      modes = new Set(),
      hazards = [];
    for (let i = 0; i < 2400; i++) {
      updateBossPattern(a, target, world, 1 / 60);
      a.player.updateNpc(1 / 60, target.player, world);
      a.player.x = 0;
      if (a.bossPattern.phase === 'cast') modes.add(a.bossPattern.mode);
      hazards.push(...a.bossPattern.queue.splice(0));
    }
    for (const mode of expected) assert.ok(modes.has(mode), `${id} missing ${mode}: ${[...modes]}`);
    if (id === 'fire_mage') assert.ok(hazards.filter((h) => h.bossHazard === 'rain').length >= 24);
  }
});
test('terrain collision grants tank three seconds of vulnerability', () => {
  const a = actor('ram_tank');
  updateBossPattern(a, target, world, 0);
  a.player.tankCharge = { time: 1.2 };
  stunTankOnTerrain(a);
  assert.equal(a.bossPattern.phase, 'stun');
  assert.equal(a.player.bossStunned, true);
  updateBossPattern(a, target, world, 2.9);
  assert.equal(a.bossPattern.phase, 'stun');
  updateBossPattern(a, target, world, 0.11);
  assert.equal(a.bossPattern.phase, 'walk');
});

test('new bosses use 80 percent scale and near powder chief punches', () => {
  const a = actor();
  assert.ok(Math.abs(a.player.transform.scale - 1.12) < 1e-8);
  const near = { ...target, player: { x: 80, y: 500 } };
  for (let i = 0; i < 120; i++) {
    updateBossPattern(a, near, world, 1 / 60);
    a.player.updateNpc(1 / 60, near.player, world);
  }
  assert.equal(a.bossPattern.mode, 'punch');
  assert.ok(a.player.actionSettings.powderPunch);
});
test('tank charge takes damage without hurt, knockback, or parry cancellation', () => {
  const a = actor('ram_tank'),
    source = actor();
  a.player.customActionKey = 'tankCharge';
  a.player.customActionTime = 2;
  a.player.customActionDuration = 3.4;
  const before = a.hp;
  applyInteractionDamage({ attacker: source, target: a, damage: 20, world });
  applyHitReaction(source, a, {}, 1, null, world);
  stunParriedEnemy(a, 1);
  assert.ok(a.hp < before);
  assert.equal(a.player.actionKey, 'tankCharge');
  assert.ok(!a.player.runParryStun);
});

test('reflected barrel damages its original boss through projectile combat', async () => {
  const { resolveProjectileCombat } = await import('../src/combat_engine.js');
  const { groundProjectileRegion, combatTargetRegions } = await import('../src/quarter_view/spatial.js');
  const boss = actor(),
    hero = actor('powder_chief', 400);
  hero.id = 'player_01';
  hero.group = 'players';
  boss.group = 'bosses';
  const h = makeBossHazard(boss, hero, world, 'barrel');
  reflectBarrel(h, hero);
  h.phase = 'blast';
  h.x = 0;
  h.targetX = 0;
  h.y = 500;
  const before = boss.hp;
  resolveProjectileCombat({
    projectiles: [h],
    actors: [boss, hero],
    playerActor: hero,
    world: { ...world, quarterView: { projectileRegion: groundProjectileRegion, targetRegions: combatTargetRegions } },
    particleEffects: { triggerHitImpact() {} },
  });
  assert.ok(boss.hp < before);
  assert.equal(h.damageSpent, true);
});
test('actual terrain collision interrupts charge into stun', async () => {
  const { createEnvironment } = await import('../src/quarter_view/environment.js');
  const a = actor('ram_tank', 570),
    env = createEnvironment();
  updateBossPattern(a, target, world, 0);
  env.before(a, world, {});
  a.player.tankCharge = { time: 1.3 };
  a.player.x = 680;
  env.after(a, world);
  assert.equal(a.bossPattern.phase, 'stun');
  assert.equal(a.player.tankCharge, null);
});

test('only a player attack overlapping the barrel reflects it', async () => {
  const { resolveProjectileCombat } = await import('../src/combat_engine.js');
  const { groundProjectileRegion } = await import('../src/quarter_view/spatial.js');
  const boss = actor(),
    hero = actor('powder_chief', 100);
  hero.id = 'player_01';
  hero.group = 'players';
  const h = makeBossHazard(boss, hero, world, 'barrel');
  h.x = h.targetX = 80;
  const w = {
    ...world,
    quarterView: { projectileRegion: groundProjectileRegion, prepareAttackRegions: () => [], attackRegions: () => [] },
  };
  resolveProjectileCombat({ projectiles: [h], actors: [], playerActor: hero, world: w });
  assert.ok(!h.reflected);
  w.quarterView.attackRegions = () => [{ active: true, x: 40, y: -40, w: 80, h: 80, reaction: { hitMode: 'box' } }];
  resolveProjectileCombat({ projectiles: [h], actors: [], playerActor: hero, world: w });
  assert.equal(h.reflected, true);
});

test('tank patrol drops mines then cycles charge and twelve rising missiles', () => {
  const a=actor('ram_tank'), hazards=[], modes=new Set();
  for(let i=0;i<2400;i++) {
    updateBossPattern(a,target,world,1/60);
    a.player.updateNpc(1/60,target.player,world);
    hazards.push(...a.bossPattern.queue.splice(0));
    modes.add(a.player.actionKey);
  }
  assert.ok(modes.has('tankCharge'));
  assert.ok(hazards.some(h=>h.bossHazard==='mine'));
  assert.ok(hazards.filter(h=>h.bossHazard==='missile').length>=12);
});
test('missiles rise first, fall onto fixed marked locations and explode once', () => {
  const h=makeBossHazard(actor('ram_tank'),target,world,'missile',{x:450,z:220});
  advanceBossHazard(h,.5,null);assert.equal(h.x,0);assert.ok(h.y<h.startY);
  advanceBossHazard(h,1,null);assert.ok(h.x>0 && h.x<450);assert.equal(h.phase,'flight');
  advanceBossHazard(h,1,null);assert.equal(h.phase,'blast');assert.equal(h.x,450);assert.equal(h.quarterDepth,220);
  advanceBossHazard(h,.5,null);assert.equal(h.damageSpent,true);assert.equal(h.active,true);
  advanceBossHazard(h,.8,null);assert.equal(h.active,false);
});
test('boss shatter splits each visible part into four independently moving fragments', async () => {
  const {startDeathRagdoll}=await import('../src/death_ragdoll_engine.js');
  const p={x:0,y:500,facing:1,transform:{scale:1},assets:{body:{width:100,height:80}},rig:{body:{w:100,h:80}},getPartOffset:()=>({})};
  startDeathRagdoll(p,{shatter:true},world);
  assert.equal(p.deathRagdoll.parts.length,4);
  assert.deepEqual(p.deathRagdoll.parts[0].crop,[0,0,50,40]);
  assert.ok(new Set(p.deathRagdoll.parts.map(x=>x.vx)).size>1);
});

test('fire rain charges and launches before emitting any hazards, atmosphere ends on death', async () => {
  const {MAGE_RAIN,mageRainIntensity}=await import('../src/mage_rain_effect.js');
  const a=actor('fire_mage');
  updateBossPattern(a,target,world,0);
  a.bossPattern.phase='cast';a.bossPattern.mode='rain';a.bossPattern.time=0;
  updateBossPattern(a,target,world,MAGE_RAIN.firstDrop-.01);
  assert.equal(a.bossPattern.queue.length,0);
  assert.equal(mageRainIntensity(a),1);
  updateBossPattern(a,target,world,.02);
  assert.equal(a.bossPattern.queue[0].bossHazard,'rain');
  a.player.dead=true;assert.equal(mageRainIntensity(a),0);
});
