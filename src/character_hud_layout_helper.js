export const HUD_HP_BASE_Y = -152;
export const HUD_NAME_GAP = 6;
export const DEFAULT_HUD_OFFSET_Y = 0;

export function normalizeCharacterHud(current = {}, fallback = {}, legacyAnchors = {}) {
  return {
    offsetY: Number(legacyHudOffsetY(legacyAnchors) ?? current?.offsetY ?? fallback?.offsetY ?? DEFAULT_HUD_OFFSET_Y),
  };
}

export function actorHudLayout(actor, { useCustomOffset = false } = {}) {
  const fallbackX = actor.player.x;
  const fallbackY = actor.player.hurtInteractionRegion.y - 24;
  if (!useCustomOffset) {
    return {
      name: { x: fallbackX, y: fallbackY - 22 },
      hpBar: { x: fallbackX, y: fallbackY - 16 },
    };
  }

  const scale = Number(actor.player.transform?.scale ?? actor.tuning.transform?.scale ?? 1);
  const offsetY = Number(actor.tuning.hud?.offsetY ?? DEFAULT_HUD_OFFSET_Y);
  const hpY = actor.player.y + HUD_HP_BASE_Y * scale + offsetY;
  return {
    name: { x: actor.player.x, y: hpY - HUD_NAME_GAP },
    hpBar: { x: actor.player.x, y: hpY },
  };
}

function legacyHudOffsetY(legacyAnchors = {}) {
  if (Number.isFinite(Number(legacyAnchors?.hpBar?.y))) return Number(legacyAnchors.hpBar.y) - HUD_HP_BASE_Y;
  if (Number.isFinite(Number(legacyAnchors?.nameLabel?.y))) {
    return Number(legacyAnchors.nameLabel.y) - (HUD_HP_BASE_Y - HUD_NAME_GAP);
  }
  return null;
}
