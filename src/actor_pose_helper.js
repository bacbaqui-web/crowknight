export function createPuppetPose() {
  return createBasePose();
}

function createBasePose() {
  return {
    bobY: 0,
    scaleY: 1,
    body: 0,
    head: 0,
    upperArmL: 0,
    lowerArmL: 0,
    upperArmR: 0,
    lowerArmR: 0,
    upperLegL: 0,
    lowerLegL: 0,
    upperLegR: 0,
    lowerLegR: 0,
    weapon: 0,
    root: 0,
  };
}
