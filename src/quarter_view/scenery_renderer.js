import { groundPoint, QUARTER_PROJECTION, depthOf } from './camera.js';
import { createScenerySprite } from './scenery_art.js';

export function createSceneryRenderer(ctx, world) {
  const sprites = new Map();
  function visible(view) {
    const environment = world.quarterView?.environment;
    if (!environment) return [];
    const objects = environment.nearby(
      view.x,
      view.depth,
      view.width / view.zoom / 2 + 180,
      view.height / (2 * view.zoom * QUARTER_PROJECTION.slope) + 350
    );
    return objects.filter((o) => {
      const p = groundPoint(o.x, o.z, view);
      return p.x > -180 && p.x < view.width + 180 && p.y > -60 && p.y - o.height * view.zoom < view.height;
    });
  }
  function draw(object, view, hero) {
    const variant = object.type === 'tree' ? object.variant || 0 : 0;
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
    ctx.drawImage(sprite, p.x - 150 * view.zoom, p.y - 460 * view.zoom, 300 * view.zoom, 520 * view.zoom);
    ctx.restore();
  }
  return { visible, draw };
}
