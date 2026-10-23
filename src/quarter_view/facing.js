const SLOPE = Math.sin((22 * Math.PI) / 180);
const frontOrder = ['cape', 'rightLeg', 'leftLeg', 'body', 'head', 'leftArm', 'rightArm', 'shield', 'weapon'];
const backOrder = ['weapon', 'shield', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg', 'body', 'head', 'cape'];
const headViews = new WeakMap();

export function facingBasis(aim = { x: 1, z: 0 }, facing = 1) {
  return { x: aim.x / (facing || 1), z: aim.z, depth: Math.abs(aim.z) };
}
export function directionalLayers(layers, aim) {
  if (Math.abs(aim?.z || 0) < 0.55) return layers;
  const order = aim.z < 0 ? backOrder : frontOrder;
  return [...layers].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
export function facingPartMatrix(matrix, rect, key, basis) {
  if (basis.depth < 0.001) return matrix;
  const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const oldX = matrix.a * center.x + matrix.c * center.y + matrix.e;
  const oldY = matrix.b * center.x + matrix.d * center.y + matrix.f;
  const weapon = key === 'weapon' || key === 'effect';
  const width = weapon ? Math.max(0.12, Math.abs(basis.x)) * (basis.x < 0 ? -1 : 1) : 1 - basis.depth * 0.18;
  const side = key.endsWith('L') ? -1 : key.endsWith('R') ? 1 : key === 'shield' ? -1 : 0;
  const spread = side * basis.depth * 18;
  const newX = oldX * (weapon ? basis.x : 1 - basis.depth * 0.6) + spread;
  const newY = oldY + oldX * basis.z * SLOPE * (weapon ? 1 : 0.2);
  const a = matrix.a * width,
    c = matrix.c * width;
  const b = matrix.b + matrix.a * basis.z * SLOPE * (weapon ? 1 : 0.2);
  const d = matrix.d + matrix.c * basis.z * SLOPE * (weapon ? 1 : 0.2);
  return { a, b, c, d, e: newX - a * center.x - c * center.y, f: newY - b * center.x - d * center.y };
}

export function facingEffectMatrix(basis, facing = 1) {
  return { a: basis.x, b: basis.z * SLOPE, c: -basis.z / (facing || 1), d: 1 - basis.depth };
}

function crowHeadView(image, back) {
  let views = headViews.get(image);
  if (!views) {
    views = {};
    headViews.set(image, views);
  }
  const key = back ? 'back' : 'front';
  if (views[key]) return views[key];
  const canvas = document.createElement('canvas');
  const w = image.naturalWidth,
    h = image.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // Reuse the rounded rear half of the helmet on both sides, keeping its ink and colors.
  ctx.drawImage(image, 0, 0, w * 0.32, h, w * 0.22, 0, w * 0.28, h * 0.92);
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, w * 0.32, h, w * 0.22, 0, w * 0.28, h * 0.92);
  ctx.restore();
  ctx.strokeStyle = '#101713';
  ctx.lineWidth = Math.max(1.5, w / 100);
  if (back) {
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.08);
    ctx.lineTo(w / 2, h * 0.88);
    ctx.stroke();
  } else {
    // The same eye texture is paired around a short, downward-facing beak.
    for (const sign of [-1, 1]) {
      ctx.drawImage(
        image,
        w * 0.37,
        h * 0.29,
        w * 0.23,
        h * 0.5,
        w * (0.5 + sign * 0.12) - w * 0.065,
        h * 0.28,
        w * 0.13,
        h * 0.42
      );
    }
    ctx.fillStyle = '#526e65';
    ctx.beginPath();
    ctx.moveTo(w * 0.43, h * 0.54);
    ctx.lineTo(w * 0.57, h * 0.54);
    ctx.lineTo(w * 0.5, h * 0.99);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  views[key] = canvas;
  return canvas;
}

export function createFacingProjection(actor) {
  let root;
  const player = actor.player;
  const aim = () => player.quarterAim || actor.quarterAim || { x: player.facing, z: 0 };
  return {
    begin(ctx) {
      root = ctx.getTransform();
    },
    layers: (layers) => directionalLayers(layers, aim()),
    part(ctx, key, rect, image) {
      const basis = facingBasis(aim(), player.facing);
      if (!root || basis.depth < 0.001) return image;
      const relative = root.inverse().multiply(ctx.getTransform());
      const matrix = facingPartMatrix(relative, rect, key, basis);
      ctx.setTransform(root);
      ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
      if (key === 'head' && actor.group === 'players' && basis.depth > 0.55) {
        const head = crowHeadView(image, basis.z < 0);
        return head;
      }
      return image;
    },
    effect(ctx, _rect, image) {
      // Effects use their own root at chest height rather than a cached puppet draw root.
      const basis = facingBasis(aim(), player.facing);
      if (basis.depth > 0.001) {
        const matrix = facingEffectMatrix(basis, player.facing);
        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
      }
      return image;
    },
  };
}
