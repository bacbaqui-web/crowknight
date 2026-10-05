import { attractPickup } from './pickup_magnet_helper.js';
import { progressionChoices } from './skill_progression_data.js';
export function createExperienceController({ getPlayer, clearInput, view }) {
  let active = false,
    level = 1,
    xp = 0,
    pending = 0,
    offered = null,
    orbs = [];
  let pathId = null;
  const ranks = {};
  const threshold = () => (40 + (level - 1) * 20) * 10;
  function render() {
    getPlayer().experience = { level, xp, threshold: threshold() };
    view.render({ level, xp, threshold: threshold(), ranks: { ...ranks } });
  }
  function offer() {
    if (!active || !pending || offered) return;
    offered = progressionChoices(pathId);
    clearInput();
    view.show(offered, ranks, choose, pathId);
  }
  function choose(id, offerToken = offered) {
    if (!active || !offered || offerToken !== offered || !offered.some((skill) => skill.id === id)) return false;
    if (!pathId) pathId = offered.find((skill) => skill.id === id).pathId;
    ranks[id] = (ranks[id] || 0) + 1;
    getPlayer().player.runSkills = { ...ranks };
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
      xp = pending = 0;
      offered = null;
      orbs = [];
      for (const key of Object.keys(ranks)) delete ranks[key];
      const p = getPlayer().player;
      p.runSkills = {};
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
      delete getPlayer().player.runSkills;
      getPlayer().player.runCharge = null;
      delete getPlayer().experience;
      view.hide();
      view.setVisible(false);
    },
    recordKill(actor) {
      if (!active) return;
      const fragment = actor.player.deathRagdoll?.parts?.[0];
      orbs.push({
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
        if (orb.age < 60 && attractPickup(orb, player, dt, 140, 420)) {
          addExperience(orb.value);
          orb.age = 60;
        }
      }
      orbs = orbs.filter((orb) => orb.age < 60);
      offer();
    },
    draw(ctx) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      for (const orb of orbs) {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    addExperience,
    choose,
    isPaused: () => Boolean(pending || offered),
    orbSnapshot: () => orbs.map((orb) => ({ ...orb })),
    snapshot: () => ({ level, xp, pending, pathId, ranks: { ...ranks } }),
  };
}
