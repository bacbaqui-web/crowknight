import { axisProps, isMasterPart } from './editor_label_helper.js';
import { isPartWithAnchor, isPartWithOpacity, isPartWithSize } from './part_source_registry.js';

export function effectPropertyGroups() {
  return editableTransformPropertyGroups({
    anchor: true,
    size: true,
    opacity: true,
  });
}

export function groupPosePropertyGroups() {
  return editableTransformPropertyGroups({
    sizeProps: [{ prop: 'scale', label: 'S' }],
    opacity: true,
  });
}

export function partPropertyGroups(partKey) {
  if (isMasterPart(partKey)) {
    return [{ label: '기준', props: axisProps('anchorX', 'anchorY', 'X', 'Y') }];
  }

  return editableTransformPropertyGroups({
    anchor: isPartWithAnchor(partKey),
    size: isPartWithSize(partKey),
    sizeLabel: partSizeGroupLabel(partKey),
    opacity: isPartWithOpacity(partKey),
  });
}

export function posePropertyGroups(partKey, hasFrameSelection) {
  if (isMasterPart(partKey) && !hasFrameSelection) {
    return [{ label: '기준', props: axisProps('anchorX', 'anchorY', 'X', 'Y') }];
  }

  return editableTransformPropertyGroups({
    anchor: isPartWithAnchor(partKey),
    size: isMasterPart(partKey) || isPartWithSize(partKey),
    sizeLabel: poseSizeGroupLabel(partKey),
    opacity: isMasterPart(partKey) || isPartWithOpacity(partKey),
  });
}

function editableTransformPropertyGroups({
  anchor = false,
  position = true,
  size = true,
  sizeLabel = '크기',
  sizeProps = axisProps('w', 'h', 'W', 'H'),
  rotation = true,
  opacity = false,
} = {}) {
  const groups = [];
  if (anchor) groups.push({ label: '기준', props: axisProps('ax', 'ay') });
  if (position) groups.push({ label: '위치', props: axisProps('x', 'y') });
  if (size) groups.push({ label: sizeLabel, props: sizeProps });
  if (rotation && opacity) {
    groups.push({
      label: '회전',
      props: [
        { prop: 'rot', label: '' },
        { prop: 'opacity', label: '투명' },
      ],
    });
  } else if (rotation) {
    groups.push({ label: '회전', props: [{ prop: 'rot', label: '회전' }] });
  } else if (opacity) {
    groups.push({ label: '투명', props: [{ prop: 'opacity', label: '투명' }] });
  }
  return groups;
}

function partSizeGroupLabel() {
  return '크기';
}

function poseSizeGroupLabel() {
  return '크기';
}
