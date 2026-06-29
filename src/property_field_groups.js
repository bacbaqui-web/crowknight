import { axisProps, isMasterPart } from './editor_label_helper.js';
import {
  isPartWithAnchor,
  isPartWithOpacity,
  isPartWithPrimarySizeLabel,
  isPartWithSize,
} from './part_source_registry.js';
import { isInteractionPropOn } from './editable_property_helper.js';

export function effectPropertyGroups(frameValue = null) {
  const groups = editableTransformPropertyGroups({
    anchor: true,
    size: true,
    opacity: true,
    active: true,
  });
  appendInteractionPropertyGroups(groups, frameValue);
  return groups;
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

export function posePropertyGroups(partKey, hasFrameSelection, frameValue = null) {
  if (isMasterPart(partKey) && !hasFrameSelection) {
    return [{ label: '기준', props: axisProps('anchorX', 'anchorY', 'X', 'Y') }];
  }

  const isEditableObject = isEditableObjectPart(partKey);
  const groups = editableTransformPropertyGroups({
    anchor: isPartWithAnchor(partKey),
    size: isMasterPart(partKey) || isPartWithSize(partKey),
    sizeLabel: poseSizeGroupLabel(partKey),
    opacity: isMasterPart(partKey) || isPartWithOpacity(partKey),
    active: isEditableObject,
  });
  if (isEditableObject) appendInteractionPropertyGroups(groups, frameValue);
  return groups;
}

function editableTransformPropertyGroups({
  anchor = false,
  position = true,
  size = true,
  sizeLabel = '크기',
  sizeProps = axisProps('w', 'h', 'W', 'H'),
  rotation = true,
  opacity = false,
  active = false,
} = {}) {
  const groups = [];
  if (anchor) groups.push({ label: '기준', props: axisProps('ax', 'ay') });
  if (position) groups.push({ label: '위치', props: axisProps('x', 'y') });
  if (size) groups.push({ label: sizeLabel, props: sizeProps });
  if (rotation) groups.push({ label: '회전', props: [{ prop: 'rot', label: 'R' }] });
  if (opacity) groups.push({ label: '투명', props: [{ prop: 'opacity', label: 'O' }] });
  if (active) groups.push({ label: '판정', props: [{ prop: 'active', label: 'ON' }] });
  return groups;
}

function partSizeGroupLabel(partKey) {
  return isPartWithPrimarySizeLabel(partKey) ? '크기' : '그룹 크기';
}

function poseSizeGroupLabel(partKey) {
  return isMasterPart(partKey) || isPartWithPrimarySizeLabel(partKey) ? '크기' : '그룹 크기';
}

function appendInteractionPropertyGroups(groups, frameValue = null) {
  if (!isInteractionPropOn(frameValue, 'active')) return;
  groups.push({
    label: '상호작용',
    props: [
      { prop: 'attack', label: 'AT' },
      { prop: 'hurt', label: 'HT' },
      { prop: 'collision', label: 'CL' },
      { prop: 'guard', label: 'GD' },
    ],
  });

  if (isInteractionPropOn(frameValue, 'attack')) {
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
  if (isInteractionPropOn(frameValue, 'collision')) {
    groups.push({ label: '충돌', props: [{ prop: 'pushPower', label: 'P' }] });
  }
}

function isEditableObjectPart(partKey) {
  return !isMasterPart(partKey);
}
