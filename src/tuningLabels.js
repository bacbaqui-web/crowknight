import { MASTER_PART_KEY } from './gameConfig.js';

export const isMasterPart = (partKey) => partKey === MASTER_PART_KEY;

export function axisProps(xProp, yProp, xLabel = 'X', yLabel = 'Y') {
  return [
    { prop: xProp, label: xLabel },
    { prop: yProp, label: yLabel },
  ];
}

export function partLabel(key) {
  return (
    {
      master: '마스터',
      body: '몸통',
      head: '머리',
      cape: '망토',
      shield: '방패',
      upperArmL: '오른쪽 윗팔',
      lowerArmL: '오른쪽 아랫팔',
      upperArmR: '왼쪽 윗팔',
      lowerArmR: '왼쪽 아랫팔',
      upperLegL: '오른쪽 윗다리',
      lowerLegL: '오른쪽 아랫다리',
      upperLegR: '왼쪽 윗다리',
      lowerLegR: '왼쪽 아랫다리',
      weapon: '무기',
      neck: '목 위치',
      shoulderL: '오른쪽 어깨',
      shoulderR: '왼쪽 어깨',
      hipL: '오른쪽 골반',
      hipR: '왼쪽 골반',
    }[key] || key
  );
}

export function poseLabel(key) {
  return (
    {
      idle: '대기',
      run: '이동',
      jump: '점프',
      fall: '낙하',
      glide: '활강',
      roll: '구르기',
      guard: '방어',
      guardBreak: '방어 풀림',
      hurt: '피격',
      death: '사망',
      jumpAttack: '점프 공격',
      attack1: '공격 1타',
      attack2: '공격 2타',
      attack3: '공격 3타',
    }[key] || key
  );
}

export function layerLabel(key) {
  return (
    {
      leftLeg: '왼쪽 다리',
      body: '몸통',
      head: '머리',
      cape: '망토',
      shield: '방패',
      leftArm: '왼쪽 팔',
      rightLeg: '오른쪽 다리',
      rightArm: '오른쪽 팔',
    }[key] || key
  );
}
