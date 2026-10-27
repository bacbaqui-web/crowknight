import { BOULDER_PROFILES, BOULDER_SCALE } from './scenery_catalog.js';
import { groundPoint, QUARTER_PROJECTION, depthOf } from './camera.js';
import { createScenerySprite, sceneryVariant, SCENERY_FRAME } from './scenery_art.js';

// Compare projected silhouette/body bounds; elevated heroes and ground decorations stay opaque.
export function sceneryOpacity(object, hero, floorY) {
  if (object.groundDecoration || !['tree', 'hut', 'boulder'].includes(object.type)) return 1;
  if (hero.quarterPlatform?.id === object.id) return 1;
  const depth = depthOf(hero);
  if (depth >= object.z + object.d / 2) return 1;
  const profile = object.type === 'boulder' ? BOULDER_PROFILES[sceneryVariant('boulder', object.variant || 0)] : null;
  const sizeScale = profile ? BOULDER_SCALE : 1;
  const width = (profile?.width || (object.type === 'tree' ? 300 : 270)) * 1.2 * sizeScale;
  const height = (profile?.height || (object.type === 'tree' ? 330 : 140)) * 1.2 * sizeScale;
  if (Math.abs(hero.player.x - object.x) > width / 2 + 20) return 1;
  const feet = (depth - object.z) * QUARTER_PROJECTION.slope - Math.max(0, floorY - hero.player.y);
  return feet >= -height && feet - 90 <= 8 ? 0.48 : 1;
}

export function createSceneryRenderer(ctx, world) {
  const sprites = new Map();
  function visible(view) {
    const environment = world.quarterView?.environment;
    if (!environment) return [];
    const objects = environment.nearby(
      view.x,
      view.depth,
      view.width / view.zoom / 2 + 220,
      view.height / (2 * view.zoom * QUARTER_PROJECTION.slope) + 350,
      true
    );
    return objects.filter((o) => {
      const p = groundPoint(o.x, o.z, view);
      return (
        p.x > -220 && p.x < view.width + 220 && p.y > -60 && p.y - SCENERY_FRAME.anchorY * 1.2 * view.zoom < view.height
      );
    });
  }
  function draw(object, view, hero) {
    const variant = sceneryVariant(object.type, object.variant || 0);
    const key = `${object.type}:${variant}`;
    let sprite = sprites.get(key);
    if (!sprite) {
      sprite = createScenerySprite(object.type, undefined, variant);
      sprites.set(key, sprite);
    }
    const p = groundPoint(object.x, object.z, view);
    ctx.save();
    ctx.globalAlpha = sceneryOpacity(object, hero, world.floorY);
    const scale = view.zoom * 1.2;
    ctx.drawImage(
      sprite,
      p.x - SCENERY_FRAME.anchorX * scale,
      p.y - SCENERY_FRAME.anchorY * scale,
      SCENERY_FRAME.width * scale,
      SCENERY_FRAME.height * scale
    );
    ctx.restore();
  }
  return { visible, draw };
}
