const FULL_STAGE_VIEW_HEIGHT = 960;
const FULL_STAGE_FLOOR_OFFSET = 110;

export function syncCanvasToLayout({ canvas, world, actors = [], isFullStage, adjustActors = false }) {
  if (!isFullStage) {
    world.viewW = canvas.width;
    world.viewH = canvas.height;
    return;
  }

  const { cssWidth, cssHeight, worldWidth, worldHeight } = measureFullStageLayoutSize(canvas, world);
  const automaticFloorY = worldHeight - FULL_STAGE_FLOOR_OFFSET;
  const previousFloorY = Number.isFinite(world.floorY) ? world.floorY : automaticFloorY;
  const nextFloorY = Number.isFinite(world.floorY) ? world.floorY : automaticFloorY;

  if (canvas.width !== worldWidth) canvas.width = worldWidth;
  if (canvas.height !== worldHeight) canvas.height = worldHeight;
  canvas.style.setProperty('--stage-canvas-width', `${cssWidth}px`);
  canvas.style.setProperty('--stage-canvas-height', `${cssHeight}px`);
  world.viewW = worldWidth;
  world.viewH = worldHeight;
  world.floorY = nextFloorY;

  if (!adjustActors) return;

  const floorDelta = nextFloorY - previousFloorY;
  actors.forEach((actor) => {
    if (actor.player.onGround || actor.player.y >= previousFloorY - 1) actor.player.y = nextFloorY;
    else actor.player.y += floorDelta;
  });
}

function measureFullStageLayoutSize(canvas, world) {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width || window.innerWidth || world.viewW || 960));
  const cssHeight = Math.max(1, Math.round(rect.height || window.innerHeight || world.viewH || FULL_STAGE_VIEW_HEIGHT));
  const aspect = cssWidth / cssHeight;

  return {
    cssWidth,
    cssHeight,
    worldWidth: Math.max(1, Math.round(FULL_STAGE_VIEW_HEIGHT * aspect)),
    worldHeight: FULL_STAGE_VIEW_HEIGHT,
  };
}
