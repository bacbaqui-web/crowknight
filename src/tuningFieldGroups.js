import { axisProps, isMasterPart } from './tuningLabels.js';
import { isInteractionBoxPartKey } from './tuningInteractionBoxes.js';
import { controlGroupPartKeys, imagePartKeys } from './tuningParts.js';

export function effectPropertyGroups() {
  return [
    { label: '기준', props: axisProps('anchorX', 'anchorY', 'X', 'Y') },
    { label: '위치', props: axisProps('x', 'y') },
    { label: '크기', props: axisProps('w', 'h', 'W', 'H') },
    { label: '회전', props: [{ prop: 'rot', label: 'R' }] },
    { label: '투명', props: [{ prop: 'opacity', label: 'O' }] },
  ];
}

export function groupPosePropertyGroups() {
  return [
    { label: '위치', props: axisProps('x', 'y') },
    { label: '크기', props: [{ prop: 'scale', label: 'S' }] },
    { label: '회전', props: [{ prop: 'rot', label: 'R' }] },
    { label: '투명', props: [{ prop: 'opacity', label: 'O' }] },
  ];
}

export function partPropertyGroups(partKey) {
  if (isMasterPart(partKey)) {
    return [{ label: '기준', props: axisProps('anchorX', 'anchorY', 'X', 'Y') }];
  }

  if (isInteractionBoxPartKey(partKey)) {
    return [
      { label: '기준', props: axisProps('ax', 'ay') },
      { label: '위치', props: axisProps('x', 'y') },
      { label: '크기', props: axisProps('w', 'h', 'W', 'H') },
      { label: '회전', props: [{ prop: 'rot', label: 'R' }] },
      { label: '투명', props: [{ prop: 'opacity', label: 'O' }] },
    ];
  }

  const groups = [];
  if (imagePartKeys().includes(partKey) || controlGroupPartKeys().includes(partKey)) {
    groups.push({ label: '기준', props: axisProps('ax', 'ay') });
  }
  groups.push({ label: '위치', props: axisProps('x', 'y') });
  if (imagePartKeys().includes(partKey) || controlGroupPartKeys().includes(partKey)) {
    groups.push({
      label: imagePartKeys().includes(partKey) ? '크기' : '그룹 크기',
      props: axisProps('w', 'h', 'W', 'H'),
    });
  }
  groups.push({ label: '회전', props: [{ prop: 'rot', label: 'R' }] });
  if (imagePartKeys().includes(partKey) || controlGroupPartKeys().includes(partKey)) {
    groups.push({ label: '투명', props: [{ prop: 'opacity', label: 'O' }] });
  }
  return groups;
}

export function posePropertyGroups(partKey, hasFrameSelection, frameValue = null) {
  const groups = [];
  if (isMasterPart(partKey) && !hasFrameSelection) {
    groups.push({ label: '기준', props: axisProps('anchorX', 'anchorY', 'X', 'Y') });
    return groups;
  }
  if (
    imagePartKeys().includes(partKey) ||
    controlGroupPartKeys().includes(partKey) ||
    isInteractionBoxPartKey(partKey)
  ) {
    groups.push({ label: '기준', props: axisProps('ax', 'ay') });
  }
  groups.push({ label: '위치', props: axisProps('x', 'y') });
  if (
    isMasterPart(partKey) ||
    imagePartKeys().includes(partKey) ||
    controlGroupPartKeys().includes(partKey) ||
    isInteractionBoxPartKey(partKey)
  ) {
    groups.push({
      label:
        isMasterPart(partKey) || imagePartKeys().includes(partKey) || isInteractionBoxPartKey(partKey)
          ? '크기'
          : '그룹 크기',
      props: axisProps('w', 'h', 'W', 'H'),
    });
  }
  groups.push({ label: '회전', props: [{ prop: 'rot', label: 'R' }] });
  if (isMasterPart(partKey) || imagePartKeys().includes(partKey) || controlGroupPartKeys().includes(partKey)) {
    groups.push({ label: '투명', props: [{ prop: 'opacity', label: 'O' }] });
  }
  if (isInteractionBoxPartKey(partKey)) {
    groups.push({ label: '투명', props: [{ prop: 'opacity', label: 'O' }] });
  }
  if (isEditableObjectPart(partKey)) {
    groups.push({ label: '판정', props: [{ prop: 'active', label: 'ON' }] });
  }
  if (!isEditableObjectPart(partKey) || Number(frameValue?.active || 0) < 0.5) return groups;

  groups.push({
    label: '상호작용',
    props: [
      { prop: 'attack', label: 'AT' },
      { prop: 'hurt', label: 'HT' },
      { prop: 'collision', label: 'CL' },
      { prop: 'guard', label: 'GD' },
    ],
  });

  if (Number(frameValue?.attack || 0) >= 0.5) {
    groups.push({
      label: '공격',
      props: [
        { prop: 'stun', label: 'ST' },
        { prop: 'knockbackX', label: 'KX' },
        { prop: 'knockbackY', label: 'KY' },
        { prop: 'deathBurst', label: 'DB' },
      ],
    });
  }
  if (Number(frameValue?.collision || 0) >= 0.5) {
    groups.push({ label: '충돌', props: [{ prop: 'pushPower', label: 'P' }] });
  }
  return groups;
}

function isEditableObjectPart(partKey) {
  return !isMasterPart(partKey);
}
