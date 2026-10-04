import { UPGRADE_CARDS } from './upgrade_card_data.js';

export function createRunUpgradeState() {
  let counts = { player: {}, enemy: {} };
  const valid = new Set(UPGRADE_CARDS.map((card) => card.id));
  return {
    reset() {
      counts = { player: {}, enemy: {} };
    },
    choose(pair, selectedId) {
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        pair[0] === pair[1] ||
        !pair.every((id) => valid.has(id)) ||
        !pair.includes(selectedId)
      )
        return false;
      const rejectedId = pair.find((id) => id !== selectedId);
      counts.player[selectedId] = (counts.player[selectedId] || 0) + 1;
      counts.enemy[rejectedId] = (counts.enemy[rejectedId] || 0) + 1;
      return true;
    },
    getSnapshot() {
      return { player: { ...counts.player }, enemy: { ...counts.enemy } };
    },
  };
}
