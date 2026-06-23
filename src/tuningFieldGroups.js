import { axisProps, isMasterPart } from './tuningLabels.js';
import { controlGroupPartKeys, imagePartKeys } from './tuningParts.js';

export function effectPropertyGroups() {
  return [
    { label: '앵커', props: axisProps('anchorX', 'anchorY', 'X', 'Y') },
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
  const groups = [];
  if (imagePartKeys().includes(partKey) || controlGroupPartKeys().includes(partKey)) {
    groups.push({ label: '기준점', props: axisProps('ax', 'ay') });
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

export function posePropertyGroups(partKey, hasFrameSelection) {
  const groups = [];
  if (isMasterPart(partKey) && !hasFrameSelection) {
    groups.push({ label: '앵커', props: axisProps('anchorX', 'anchorY', 'X', 'Y') });
    return groups;
  }
  groups.push({ label: '위치', props: axisProps('x', 'y') });
  if (isMasterPart(partKey) || imagePartKeys().includes(partKey) || controlGroupPartKeys().includes(partKey)) {
    groups.push({
      label: isMasterPart(partKey) ? '크기' : imagePartKeys().includes(partKey) ? '크기' : '그룹 크기',
      props: axisProps('w', 'h', 'W', 'H'),
    });
  }
  groups.push({ label: '회전', props: [{ prop: 'rot', label: 'R' }] });
  if (isMasterPart(partKey) || imagePartKeys().includes(partKey) || controlGroupPartKeys().includes(partKey)) {
    groups.push({ label: '투명', props: [{ prop: 'opacity', label: 'O' }] });
  }
  return groups;
}
