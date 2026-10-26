import { groundPoint, QUARTER_PROJECTION, depthOf } from './camera.js';
import { createScenerySprite, sceneryVariant, SCENERY_FRAME } from './scenery_art.js';

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
    if (
      (object.type === 'tree' || object.type === 'hut') &&
      Math.abs(hero.player.x - object.x) < 120 &&
      depthOf(hero) < object.z &&
      object.z - depthOf(hero) < 700
    )
      ctx.globalAlpha = 0.48;
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
