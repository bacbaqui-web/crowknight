import {
  MOVE_HANDLE_RADIUS,
  drawAnchorHandleDot,
  drawHandleArrow,
  drawHandleCircle,
  drawHandleLine,
  handleColor,
  handleLineStart,
} from './editHandleDrawing.js';

export function renderEditHandles(ctx, geometry, activeMode) {
  if (!geometry) return;

  const { anchor, handles } = geometry;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (handles.width)
    drawHandleArrow(
      ctx,
      handleLineStart(anchor, handles.width.point),
      handles.width.point,
      handleColor('width', activeMode)
    );
  if (handles.height)
    drawHandleArrow(
      ctx,
      handleLineStart(anchor, handles.height.point),
      handles.height.point,
      handleColor('height', activeMode)
    );
  if (handles.size)
    drawHandleArrow(
      ctx,
      handleLineStart(anchor, handles.size.point),
      handles.size.point,
      handleColor('size', activeMode)
    );
  if (handles.rotate)
    drawHandleLine(
      ctx,
      handleLineStart(anchor, handles.rotate.point),
      handles.rotate.point,
      handleColor('rotate', activeMode)
    );
  if (handles.opacity)
    drawHandleLine(
      ctx,
      handleLineStart(anchor, handles.opacity.point),
      handles.opacity.point,
      handleColor('opacity', activeMode)
    );

  if (handles.rotate) drawHandleCircle(ctx, handles.rotate.point, 9, handleColor('rotate', activeMode), true);
  if (handles.opacity) drawHandleCircle(ctx, handles.opacity.point, 8, handleColor('opacity', activeMode), true);

  if (handles.move) drawHandleCircle(ctx, anchor, MOVE_HANDLE_RADIUS, handleColor('move', activeMode), false);
  if (handles.anchor) drawAnchorHandleDot(ctx, anchor, handleColor('anchor', activeMode));
  ctx.restore();
}
