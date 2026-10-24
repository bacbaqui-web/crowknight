const diagonal = Math.SQRT1_2;
export const EFFECT_DIRECTIONS = Object.freeze(
  [
    { key: 'right', x: 1, z: 0 },
    { key: 'down-right', x: diagonal, z: diagonal },
    { key: 'down', x: 0, z: 1 },
    { key: 'down-left', x: -diagonal, z: diagonal },
    { key: 'left', x: -1, z: 0 },
    { key: 'up-left', x: -diagonal, z: -diagonal },
    { key: 'up', x: 0, z: -1 },
    { key: 'up-right', x: diagonal, z: -diagonal },
  ].map(Object.freeze)
);
export function effectDirection(actor) {
  const aim = actor.quarterAim || { x: actor.player.facing || 1, z: 0 };
  const index = Math.round(Math.atan2(aim.z, aim.x) / (Math.PI / 4));
  return EFFECT_DIRECTIONS[(index + 8) % 8];
}

export const EFFECT_EDIT_DIRECTIONS = Object.freeze(
  ['up', 'up-right', 'right', 'down-right', 'down'].map((key) =>
    EFFECT_DIRECTIONS.find((direction) => direction.key === key)
  )
);
export function effectLayoutKey(direction) {
  return { left: 'right', 'up-left': 'up-right', 'down-left': 'down-right' }[direction] || direction;
}
