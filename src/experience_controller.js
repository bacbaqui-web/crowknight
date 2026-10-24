import { resetMovementSkills } from './movement_skill_helper.js';
import { syncProgressionHealth } from './skill_progression_effects.js';
import { attractPickup, PICKUP_ATTRACTION } from './pickup_magnet_helper.js';
import { progressionChoices } from './skill_progression_data.js';
export function createExperienceController({ getPlayer, clearInput, view, onCollect = () => {} }) {
  let active = false,
    level = 1,
    xp = 0,
    pending = 0,
    offered = null,
    orbs = [];
  let pathId = null;
  const ranks = {};
  let route = [];
  const threshold = () => (40 + (level - 1) * 20) * 10;
  function render() {
    getPlayer().experience = { level, xp, threshold: threshold() };
    view.render({ level, xp, threshold: threshold(), ranks: { ...ranks } });
  }
  function offer() {
    if (!active || !pending || offered) return;
    offered = progressionChoices(pathId, route);
    clearInput();
    view.show(offered, ranks, choose, pathId);
  }
  function choose(id, offerToken = offered) {
    if (!active || !offered || offerToken !== offered || !offered.some((skill) => skill.id === id)) return false;
    const choice = offered.find((skill) => skill.id === id);
    if (!pathId) {
      pathId = choice.pathId;
      ranks[choice.effectId] = 1;
      route.push(0);
      getPlayer().player.runSkillPathColor = choice.color;
    } else {
      ranks[choice.effectId] = (ranks[choice.effectId] || 0) + 1;
      if (!choice.reinforce) route.push(choice.direction);
    }
    getPlayer().player.runSkills = { ...ranks };
    syncProgressionHealth(getPlayer(), true);
    pending--;
    offered = null;
    view.hide();
    clearInput();
    render();
    offer();
    return true;
  }
  function addExperience(amount) {
    if (!active || !Number.isFinite(amount) || amount <= 0) return;
    xp += amount;
    while (xp >= threshold()) {
      xp -= threshold();
      level++;
      pending++;
    }
    render();
  }
  return {
    reset() {
      active = true;
      level = 1;
      pathId = null;
      route = [];
      delete getPlayer().player.runSkillPathColor;
      xp = pending = 0;
      offered = null;
      orbs = [];
      for (const key of Object.keys(ranks)) delete ranks[key];
      const p = getPlayer().player;
      p.runSkills = {};
      resetMovementSkills(p);
      p.runParryPoints = 0;
      p.runParryPulse = null;
      syncProgressionHealth(getPlayer());
      p.runSkillActions = getPlayer().tuning.skillActions;
      p.runAirJumpUsed = false;
      p.runCharge = null;
      p.runChargedPower = 1;
      p.runParryTime = p.runEvadeTime = 0;
      view.hide();
      view.setVisible(true);
      render();
    },
    stop() {
      active = false;
      orbs = [];
      pending = 0;
      offered = null;
      resetMovementSkills(getPlayer().player);
      delete getPlayer().player.runSkills;
      getPlayer().player.runParryPoints = 0;
      getPlayer().player.runParryPulse = null;
      delete getPlayer().player.runSkillPathColor;
      syncProgressionHealth(getPlayer());
      getPlayer().player.runCharge = null;
      delete getPlayer().experience;
      view.hide();
      view.setVisible(false);
    },
    recordKill(actor) {
      if (!active) return;
      const fragment = actor.player.deathRagdoll?.parts?.[0];
      orbs.push({
        ...(actor.quarterDepth != null ? { quarterDepth: actor.quarterDepth } : {}),
        x: fragment?.x ?? actor.player.x,
        y: fragment?.y ?? actor.player.y - 30,
        vx: (fragment?.vx < 0 ? -1 : 1) * 240,
        vy: -280,
        value: actor.group === 'bosses' ? 60 : 20,
        age: 0,
        landed: false,
      });
    },
    update(dt, world) {
      offer();
      if (offered || !active) return;
      const player = getPlayer();
      for (const orb of orbs) {
        orb.age += dt;
        let remaining = Math.min(Math.max(0, dt), 60);
        while (remaining > 0 && !orb.magnetized) {
          const step = Math.min(remaining, 1 / 60);
          remaining -= step;
          orb.x += orb.vx * step;
          orb.y += orb.vy * step + Number(world.gravity ?? 980) * 0.82 * step * step * 0.5;
          orb.vy += Number(world.gravity ?? 980) * 0.82 * step;
          if (orb.y >= world.floorY - 5 && orb.vy > 0) {
            orb.y = world.floorY - 5;
            orb.landed = true;
            orb.vy = orb.vy > 45 ? -orb.vy * 0.24 : 0;
            orb.vx *= 0.74;
          }
          orb.vx *= Math.exp(-(orb.landed ? 3 : 0.42) * step);
        }
        if (orb.age < 60 && attractPickup(orb, player, dt, PICKUP_ATTRACTION.radius, PICKUP_ATTRACTION.speed)) {
          addExperience(orb.value);
          orb.age = 60;
          onCollect('experiencePickup');
        }
      }
      orbs = orbs.filter((orb) => orb.age < 60);
      offer();
    },
    draw(ctx, project = null) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      for (const orb of orbs) {
        const drawOrb = () => {
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, 4, 0, Math.PI * 2);
          ctx.fill();
        };
        if (project) project(orb, drawOrb);
        else drawOrb();
      }
      ctx.restore();
    },
    addExperience,
    choose,
    isPaused: () => Boolean(pending || offered),
    orbSnapshot: () => orbs.map((orb) => ({ ...orb })),
    snapshot: () => ({ level, xp, pending, pathId, route: [...route], ranks: { ...ranks } }),
  };
}
