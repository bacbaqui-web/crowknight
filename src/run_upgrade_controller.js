import { UPGRADE_CARDS } from './upgrade_card_data.js';
import { createRunUpgradeState } from './run_upgrade_state.js';
import { applyRunUpgradeEffects, clearRunUpgradeEffects } from './run_upgrade_effect_helper.js';
import { createUpgradeHud } from './upgrade_hud_view.js';
import { createUpgradeChoiceView } from './upgrade_choice_view.js';

export function randomUpgradePair(random = Math.random) {
  const first = Math.floor(Math.min(0.999999, Math.max(0, random())) * UPGRADE_CARDS.length);
  let second = Math.floor(Math.min(0.999999, Math.max(0, random())) * (UPGRADE_CARDS.length - 1));
  if (second >= first) second += 1;
  return [UPGRADE_CARDS[first].id, UPGRADE_CARDS[second].id];
}

export function createRunUpgradeController({
  getActors,
  getPlayer,
  clearInput,
  hud = createUpgradeHud(),
  createChoiceView = createUpgradeChoiceView,
  random = Math.random,
}) {
  const state = createRunUpgradeState();
  let queue = 0,
    pair = null,
    active = false;
  const view = createChoiceView({ onChoose: choose });
  function reset() {
    active = true;
    queue = 0;
    pair = null;
    view.hide();
    state.reset();
    clearRunUpgradeEffects(getActors());
    hud.render(state.getSnapshot());
    hud.setVisible(true);
  }
  function stop() {
    active = false;
    queue = 0;
    pair = null;
    view.hide();
    hud.setVisible(false);
    clearRunUpgradeEffects(getActors());
    clearInput();
  }
  function offerNext() {
    if (!active || pair || !queue) return;
    queue -= 1;
    pair = randomUpgradePair(random);
    clearInput();
    view.show(pair);
  }
  function choose(id, offeredPair = pair) {
    if (!active || !pair || offeredPair !== pair || !state.choose(pair, id)) return false;
    pair = null;
    view.hide();
    clearInput();
    applyRunUpgradeEffects(getActors(), getPlayer(), state.getSnapshot());
    hud.render(state.getSnapshot());
    offerNext();
    return true;
  }
  return {
    reset,
    stop,
    choose,
    recordBossKill() {
      if (active) queue += 1;
    },
    update() {
      offerNext();
    },
    isPaused: () => Boolean(pair || queue),
    getSnapshot: state.getSnapshot,
    getPair: () => (pair ? [...pair] : null),
  };
}
