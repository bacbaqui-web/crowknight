const INTERACTION_TOGGLE_PROPS = new Set(['active', 'attack', 'hurt', 'collision', 'guard']);
const INTERACTION_DECIMAL_PROPS = new Set(['stun', 'deathBurst']);
const INTERACTION_KNOCKBACK_PROPS = new Set(['knockbackX', 'knockbackY']);
export const SIZE_PERCENT_MIN = 5;
export const SIZE_PERCENT_MAX = 300;

export function isInteractionToggleProp(prop) {
  return INTERACTION_TOGGLE_PROPS.has(prop);
}

export function isInteractionDecimalProp(prop) {
  return INTERACTION_DECIMAL_PROPS.has(prop);
}

export function isInteractionPropOn(frameValue, prop) {
  return Number(frameValue?.[prop] || 0) >= 0.5;
}

export function isInteractionKnockbackProp(prop) {
  return INTERACTION_KNOCKBACK_PROPS.has(prop);
}

export function isInteractionPushPowerProp(prop) {
  return prop === 'pushPower';
}

export function isSizeProp(prop) {
  return prop === 'w' || prop === 'h';
}

export function isOpacityProp(prop) {
  return prop === 'opacity';
}

export function isRotationProp(prop) {
  return prop === 'rot';
}

export function isAnchorProp(prop) {
  return prop === 'ax' || prop === 'ay';
}

export function isScaleProp(prop) {
  return prop === 'scale';
}

export function isPercentDisplayProp(prop) {
  return isSizeProp(prop) || isScaleProp(prop);
}

export function isToggleProp(prop) {
  return isOpacityProp(prop) || isInteractionToggleProp(prop);
}

export function isTogglePropOff(prop, value) {
  return isToggleProp(prop) && Number(value ?? togglePropFallback(prop)) <= 0;
}

export function togglePropFallback(prop) {
  if (isOpacityProp(prop)) return 1;
  return 0;
}

export function sizeBaseProp(prop) {
  return prop === 'w' ? 'baseW' : 'baseH';
}

export function anchorSizeProp(prop) {
  return prop === 'ax' ? 'w' : 'h';
}

export function anchorBaseProp(prop) {
  return prop === 'ax' ? 'baseW' : 'baseH';
}

export function anchorOffsetProp(prop) {
  return prop === 'ax' ? 'anchorOffsetX' : 'anchorOffsetY';
}
