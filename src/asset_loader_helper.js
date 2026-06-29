import { loadImages } from './utils.js';

const EFFECT_ASSET_PATHS = {
  slash1: './assets/effects/attack/slash_1.png',
  slash2: './assets/effects/attack/slash_2.png',
  slash3: './assets/effects/attack/slash_3.png',
};

export function loadCharacterAssets(folder, version = '') {
  const base = `./assets/characters/${folder}`;
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  return loadImages({
    body: `${base}/body.png${suffix}`,
    head: `${base}/head.png${suffix}`,
    cape: `${base}/cape.png${suffix}`,
    shield: `${base}/shield.png${suffix}`,
    upperArmL: `${base}/upper_arm_l.png${suffix}`,
    lowerArmL: `${base}/lower_arm_l.png${suffix}`,
    upperArmR: `${base}/upper_arm_r.png${suffix}`,
    lowerArmR: `${base}/lower_arm_r.png${suffix}`,
    upperLegL: `${base}/upper_leg_l.png${suffix}`,
    lowerLegL: `${base}/lower_leg_l.png${suffix}`,
    upperLegR: `${base}/upper_leg_r.png${suffix}`,
    lowerLegR: `${base}/lower_leg_r.png${suffix}`,
    weapon: `${base}/weapon.png${suffix}`,
  });
}

export function loadEffectAssets(version = '') {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  return loadImages(
    Object.fromEntries(Object.entries(EFFECT_ASSET_PATHS).map(([key, path]) => [key, `${path}${suffix}`]))
  );
}

export async function loadEffectAsset(key, version = '') {
  const path = EFFECT_ASSET_PATHS[key];
  if (!path) return null;
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  const assets = await loadImages({ [key]: `${path}${suffix}` });
  return assets[key] || null;
}
