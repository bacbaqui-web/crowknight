import { loadImages } from './common_helper.js';

export const CHARACTER_ASSET_PATHS = {
  body: 'body.png',
  head: 'head.png',
  cape: 'cape.png',
  shield: 'shield.png',
  upperArmL: 'upper_arm_l.png',
  lowerArmL: 'lower_arm_l.png',
  upperArmR: 'upper_arm_r.png',
  lowerArmR: 'lower_arm_r.png',
  upperLegL: 'upper_leg_l.png',
  lowerLegL: 'lower_leg_l.png',
  upperLegR: 'upper_leg_r.png',
  lowerLegR: 'lower_leg_r.png',
  weapon: 'weapon.png',
};

export const EFFECT_ASSET_PATHS = {
  slash1: './assets/effects/attack/slash_1.png',
  slash2: './assets/effects/attack/slash_2.png',
  slash3: './assets/effects/attack/slash_3.png',
};

export function loadCharacterAssets(folder, version = '', sources = {}) {
  const base = `./assets/characters/${folder}`;
  return loadImages(
    Object.fromEntries(
      Object.entries(CHARACTER_ASSET_PATHS).map(([key, filename]) => [
        key,
        versionedPath(sources?.[key] || `${base}/${filename}`, version),
      ])
    )
  );
}

export function loadEffectAssets(version = '', sources = {}) {
  const entries = {
    ...EFFECT_ASSET_PATHS,
    ...Object.fromEntries(
      Object.keys(sources || {})
        .filter((key) => !key.endsWith('Psd'))
        .map((key) => [key, effectAssetPath(key)])
        .filter(([, path]) => Boolean(path))
    ),
  };
  return loadImages(
    Object.fromEntries(
      Object.entries(entries).map(([key, path]) => [key, versionedPath(sources?.[key] || path, version)])
    )
  );
}

export async function loadEffectAsset(key, version = '', sources = {}) {
  const path = sources?.[key] || effectAssetPath(key);
  if (!path) return null;
  const assets = await loadImages({ [key]: versionedPath(path, version) });
  return assets[key] || null;
}

export function effectAssetPath(key) {
  if (EFFECT_ASSET_PATHS[key]) return EFFECT_ASSET_PATHS[key];
  if (!isDynamicEffectAssetKey(key)) return null;
  return `./assets/effects/custom/${key}.png`;
}

export function isDynamicEffectAssetKey(key) {
  return /^effect_[a-zA-Z0-9_-]+$/.test(String(key || ''));
}

function versionedPath(path, version) {
  if (!version) return path;
  return `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
}
