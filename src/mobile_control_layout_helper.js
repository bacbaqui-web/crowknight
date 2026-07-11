const Q_HORIZONTAL_OFFSET = 5;
const Q_VERTICAL_OFFSET = 23;
const SPACE_BOTTOM_OFFSET = 10;
const ACTION_BUTTON_GAP = 5;
const SKILL_ANGLE_STEP = Math.PI / 6;

export function layoutMobileActionControls(root) {
  if (!root || root.hidden) return;

  const primary = root.querySelector('.mobile-primary-action');
  const space = root.querySelector('.mobile-skill-space');
  const skillW = root.querySelector('.mobile-skill-w');
  if (!primary || !space || !skillW) return;

  const rootRect = root.getBoundingClientRect();
  const primaryRect = primary.getBoundingClientRect();
  const skillRect = space.getBoundingClientRect();
  if (!rootRect.width || !primaryRect.width || !skillRect.width) return;

  const primaryRadius = primaryRect.width / 2;
  const skillRadius = skillRect.width / 2;
  const orbitRadius = primaryRadius + skillRadius + ACTION_BUTTON_GAP;
  const primaryCenter = {
    x: rootRect.right + Q_HORIZONTAL_OFFSET,
    y: rootRect.bottom - Q_VERTICAL_OFFSET,
  };
  const spaceCenterY = rootRect.bottom - SPACE_BOTTOM_OFFSET - skillRadius;
  const spaceOffsetY = spaceCenterY - primaryCenter.y;
  const spaceOffsetX = -Math.sqrt(Math.max(0, orbitRadius ** 2 - spaceOffsetY ** 2));
  const skillWOffset = rotateTowardTop(spaceOffsetX, spaceOffsetY, SKILL_ANGLE_STEP);

  positionButton(rootRect, space, primaryCenter.x + spaceOffsetX, spaceCenterY, skillRadius);
  positionButton(rootRect, skillW, primaryCenter.x + skillWOffset.x, primaryCenter.y + skillWOffset.y, skillRadius);
}

function rotateTowardTop(x, y, radians) {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  };
}

function positionButton(rootRect, button, centerX, centerY, radius) {
  button.style.right = `${rootRect.right - centerX - radius}px`;
  button.style.bottom = `${rootRect.bottom - centerY - radius}px`;
}
