export function syncCanvasToLayout({ canvas, world, actors = [], isFullStage, adjustActors = false }) {
  if (!isFullStage) {
    world.viewW = canvas.width;
    world.viewH = canvas.height;
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width || window.innerWidth || world.viewW));
  const height = Math.max(320, Math.round(rect.height || window.innerHeight || world.viewH));
  const previousFloorY = world.floorY;
  const nextFloorY = height - 110;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  world.viewW = width;
  world.viewH = height;
  world.floorY = nextFloorY;

  if (!adjustActors) return;

  const floorDelta = nextFloorY - previousFloorY;
  actors.forEach((actor) => {
    if (actor.player.onGround || actor.player.y >= previousFloorY - 1) actor.player.y = nextFloorY;
    else actor.player.y += floorDelta;
  });
}
