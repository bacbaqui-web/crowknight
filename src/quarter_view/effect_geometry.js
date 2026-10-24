import { readAttackEffectFrame } from '../actor_canvas_renderer.js';
import { createEditableTransform, editableTransformDrawRect } from '../editable_object_model_helper.js';
import { chargeAttackScale } from '../charge_attack_helper.js';
import { defaultEffectSize } from '../animation_frame_data.js';
import { resolveEffectAsset } from '../asset_loader_helper.js';
import { isProjectileAttack } from './weapon_contact.js';
import { effectFrameAt } from '../project_data_normalizer_helper.js';
import { effectDirection } from './effect_directions.js';

const boundsCache = new WeakMap();
const full = Object.freeze({ left: 0, top: 0, right: 1, bottom: 1 });
// Read the alpha bounds once for each decoded image, never once per animation frame.
export function effectImageBounds(image) {
  if (!image || typeof document === 'undefined') return full;
  if (boundsCache.has(image)) return boundsCache.get(image);
  const width = image.naturalWidth || image.width,
    height = image.naturalHeight || image.height;
  if (!width || !height) return full;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let bounds = full;
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, width, height).data;
    let left = width,
      top = height,
      right = -1,
      bottom = -1;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (data[(y * width + x) * 4 + 3] > 16) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    bounds =
      right < left
        ? null
        : { left: left / width, top: top / height, right: (right + 1) / width, bottom: (bottom + 1) / height };
  } catch {
    /* Cross-origin assets retain their configured rectangle. */
  }
  boundsCache.set(image, bounds);
  return bounds;
}
export function effectFrameReader(actor, read = effectFrameAt, assets) {
  return (tuning, key, progress) => {
    const config = read(tuning, key, progress);
    if (!config || isProjectileAttack(actor) || !actor.player.attackInteractionRegions?.length) return config;
    let image = config.image;
    if (!image || image === 'none' || (assets && !resolveEffectAsset(assets, image, actor.id))) image = 'slash1';
    return { ...config, image, opacity: Math.max(0.65, Number(config.opacity ?? 1)) };
  };
}
export function effectFrameGeometry(actor, readEffectFrame, assets) {
  if (!actor.tuning) return null;
  const frame = readAttackEffectFrame(actor, effectFrameReader(actor, readEffectFrame, assets));
  if (!frame) return null;
  const { config, effectKey } = frame;
  const asset = resolveEffectAsset(assets, config.image, actor.id);
  if (assets && !asset) return null;
  const bounds = effectImageBounds(asset);
  if (!bounds) return null;
  const size = defaultEffectSize(effectKey);
  const transform = createEditableTransform({
    ...config,
    w: Math.max(1, Number(config.w || size.w)),
    h: Math.max(1, Number(config.h || size.h)),
  });
  const rect = editableTransformDrawRect(transform),
    scale = chargeAttackScale(actor.player),
    facing = actor.player.facing || 1;
  const angle = (transform.rot * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const native = (x, y) => ({
    x: actor.player.x + facing * scale * (transform.x + c * x - s * y),
    y: actor.player.y - 70 + scale * (transform.y + s * x + c * y),
  });
  const left = rect.x + rect.w * bounds.left,
    right = rect.x + rect.w * bounds.right;
  const top = rect.y + rect.h * bounds.top,
    bottom = rect.y + rect.h * bounds.bottom;
  const center = native(rect.x + rect.w / 2, rect.y + rect.h / 2);
  const fullCorners = [
    native(rect.x, rect.y),
    native(rect.x + rect.w, rect.y),
    native(rect.x + rect.w, rect.y + rect.h),
    native(rect.x, rect.y + rect.h),
  ];
  const radius = Math.max(45, ...fullCorners.map((point) => Math.abs(point.x - center.x) + 20));
  return {
    frame,
    asset,
    radius,
    center,
    points: [native(left, top), native(right, top), native(right, bottom), native(left, bottom)],
  };
}
export function alignEffectRegions(actor, regions, readEffectFrame, assets) {
  if (!regions.length || isProjectileAttack(actor)) return regions;
  const direction = effectDirection(actor);
  const key = `${actor.player.attackSerial}:${actor.player.actionKey}:${actor.player.facing}:${direction.key}`;
  if (actor.quarterEffectContactKey !== key) actor.previousAttackRegions = [];
  actor.quarterEffectContactKey = key;
  const geometry = effectFrameGeometry(actor, readEffectFrame, assets);
  if (!geometry) return [];
  const xs = geometry.points.map((p) => p.x),
    ys = geometry.points.map((p) => p.y);
  return regions.map((region) => ({
    ...region,
    quarterEffectContact: true,
    quarterEffectCenter: geometry.center,
    quarterEffectRadius: geometry.radius,
    quarterEffectDirection: direction.key,
    points: geometry.points,
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
    reaction: { ...region.reaction, hitMode: 'box' },
  }));
}
