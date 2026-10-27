import { actorSoundEvents } from './actor_sound_events.js';
import { createProjectileSoundEvents } from './projectile_sound_events.js';
export function createCombatSoundController(play) {
  let states = new WeakMap();
  const projectiles = createProjectileSoundEvents(play);
  function update(actors, shots = []) {
    for (const actor of actors) {
      const player = actor.player;
      if (!player || actor.respawning) continue;
      let previous = states.get(player) || {};
      if (player.animTime < previous.time) previous = {};
      const next = actorSoundEvents(actor, previous, play);
      if (player.dead) {
        states.set(player, next);
        continue;
      }
      const attacking = (player.attackInteractionRegions?.length || 0) > 0;
      const serial = player.attackSerial;
      if (attacking && (!previous.attacking || previous.serial !== serial)) {
        play(actor.group === 'players' ? 'clubSwing' : actor.group === 'bosses' ? 'bossSwing' : 'swordSwing', player);
      }
      const guarding =
        player.customActionKey === player.runSkillActions?.guard ||
        player.actions?.some((action) => action.key === player.customActionKey && action.name === '방어');
      if (guarding && !previous.guarding && player.isCustomActionActive) play('guardRaise', player);
      states.set(player, { ...next, attacking, serial, guarding: guarding && player.isCustomActionActive });
    }
    projectiles.update(shots);
  }
  function contact(kind, attacker, target, hitSound) {
    play(
      kind === 'hit'
        ? hitSound || (attacker.group === 'players' ? 'clubHit' : attacker.group === 'bosses' ? 'bossHit' : 'swordHit')
        : kind === 'parry'
          ? 'parry'
          : 'block',
      target
    );
  }
  return {
    update,
    contact,
    event: play,
    reset: () => {
      states = new WeakMap();
      projectiles.reset();
    },
  };
}
