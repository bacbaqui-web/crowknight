import { MASTER_PART_KEY } from './gameConfig.js';
import {
  ATTACK_INTERACTION_OBJECT_KEY,
  COLLISION_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
} from './tuningInteractionObjects.js';

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
      master: '기준',
      body: '몸통',
      head: '머리',
      cape: '망토',
      shield: '방패',
      upperArmL: '왼팔 윗팔',
      lowerArmL: '왼팔 아랫팔',
      upperArmR: '오른팔 윗팔',
      lowerArmR: '오른팔 아랫팔',
      upperLegL: '왼다리 윗다리',
      lowerLegL: '왼다리 아랫다리',
      upperLegR: '오른다리 윗다리',
      lowerLegR: '오른다리 아랫다리',
      weapon: '무기',
      neck: '목 위치',
      shoulderL: '왼팔 어깨',
      shoulderR: '오른팔 어깨',
      hipL: '왼다리 골반',
      hipR: '오른다리 골반',
      [COLLISION_INTERACTION_OBJECT_KEY]: '충돌영역',
      [ATTACK_INTERACTION_OBJECT_KEY]: '공격영역',
      [HURT_INTERACTION_OBJECT_KEY]: '피격영역',
      [GUARD_INTERACTION_OBJECT_KEY]: '방어영역',
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
      leftLeg: '왼다리 · 아랫다리 위 / 윗다리 아래',
      body: '몸통',
      head: '머리',
      cape: '망토',
      shield: '방패',
      leftArm: '왼팔 · 아랫팔 위 / 윗팔 아래',
      rightLeg: '오른다리 · 아랫다리 위 / 윗다리 아래',
      rightArm: '오른팔 · 아랫팔 위 / 윗팔 아래',
      weapon: '무기',
    }[key] || key
  );
}
