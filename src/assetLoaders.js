import { loadImages } from './utils.js';

export function loadCharacterAssets(folder) {
  const base = `./assets/characters/${folder}`;
  return loadImages({
    body: `${base}/body.png`,
    head: `${base}/head.png`,
    cape: `${base}/cape.png`,
    shield: `${base}/shield.png`,
    upperArmL: `${base}/upper_arm_l.png`,
    lowerArmL: `${base}/lower_arm_l.png`,
    upperArmR: `${base}/upper_arm_r.png`,
    lowerArmR: `${base}/lower_arm_r.png`,
    upperLegL: `${base}/upper_leg_l.png`,
    lowerLegL: `${base}/lower_leg_l.png`,
    upperLegR: `${base}/upper_leg_r.png`,
    lowerLegR: `${base}/lower_leg_r.png`,
    weapon: `${base}/weapon.png`,
  });
}

export function loadEffectAssets() {
  return loadImages({
    slash1: './assets/effects/attack/slash_1.png',
    slash2: './assets/effects/attack/slash_2.png',
    slash3: './assets/effects/attack/slash_3.png',
  });
}
