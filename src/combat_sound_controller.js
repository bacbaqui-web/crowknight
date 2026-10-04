export function createCombatSoundController(play) {
  let states = new WeakMap();
  function update(actors) {
    for (const actor of actors) {
      const player = actor.player;
      if (!player || player.dead || actor.respawning) continue;
      const previous = states.get(player) || {};
      const attacking = player.attackInteractionRegions.length > 0;
      const serial = player.attackSerial;
      if (attacking && (!previous.attacking || previous.serial !== serial)) {
        play(actor.group === 'players' ? 'clubSwing' : actor.group === 'bosses' ? 'bossSwing' : 'swordSwing', player);
      }
      const guarding = player.customActionKey === player.runSkillActions?.guard ||
        player.actions?.some((action) => action.key === player.customActionKey && action.name === '방어');
      if (guarding && !previous.guarding && player.isCustomActionActive) play('guardRaise', player);
      states.set(player, { attacking, serial, guarding: guarding && player.isCustomActionActive });
    }
  }
  function contact(kind, attacker, target) {
    play(kind === 'hit'
      ? attacker.group === 'players' ? 'clubHit' : attacker.group === 'bosses' ? 'bossHit' : 'swordHit'
      : kind === 'parry' ? 'parry' : 'block', target.player);
  }
  return { update, contact, reset: () => { states = new WeakMap(); } };
}
