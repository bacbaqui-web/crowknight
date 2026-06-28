# 12_EDITOR_FLOW.md

이 문서는 사용자 행동이 어떤 JS를 거쳐 어디에 저장되는지만 설명한다.

## Setup Part 편집

```text
Selection Palette click
→ tuningPanelPartController.selectPickerPart('part', partKey)
→ tuningPanelSelectionState / tuningPanelEditingState
→ tuningPanelPartController.renderPartFields()
→ tuningParts.partEditSources(tuning)
→ canvasVisualValues.updateRigPartValue()
→ tuning.rig[partKey]
→ tuningPanel.applySelected()
→ actor.player.applyTuning(actor.tuning)
→ saveState
```

Canvas drag:

```text
pointerdown
→ tuningPanelCanvasController
→ tuningCanvasPointerDrag
→ tuningCanvasEditState.canvasPartEditState()
→ tuningCanvasDragFactory.createCanvasPartDrag()
→ canvasDragApply.applyCanvasPartDrag()
→ canvasVisualValues.setCanvasVisualValue()
→ tuning.rig[partKey]
→ applySelected
```

## Setup InteractionBox 편집

```text
Selection Palette interaction box click
→ tuningPanelPartController.selectPickerPart('part', boxKey)
→ tuningParts.partEditSources(tuning)
→ tuning.rig[boxKey]
```

Handle 생성:

```text
drawPuppetImagePart(parent)
→ recordPuppetInteractionBoxes()
→ recordPuppetRectPart()
→ player.editHandles[boxKey]
→ tuningEditHandleGeometry()
→ editHandleGeometry.createPartEditHandleGeometry()
→ editHandleRenderer
```

저장/Runtime 계산:

```text
canvas/property edit
→ tuning.rig[boxKey]
→ actor.player.applyTuning(actor.tuning)
→ interactionBoxRuntime
→ saveState
```

## Action Part Keyframe 편집

```text
Action select
→ tuningPanelPartController.handlePoseChange()
→ tuningPoseTimelineController
→ poseTimelineAdapter
```

Frame 선택:

```text
Timeline click
→ timelineController
→ timelineState
→ poseTimelineAdapter.currentFrameValue()
→ timelineFrameRead.currentPoseTimelineFrame()
→ tuning.poseOffsets[poseKey][partKey]
```

Property edit:

```text
property input
→ tuningPoseTimelineController.updateOffset()
→ tuningFieldValues.poseFrameValueFromInput()
→ poseTimelineAdapter.writeFrameValue()
→ timelineKeyframeMutations.writePoseTimelineFrameValue()
→ tuning.poseOffsets[poseKey][partKey]
→ applySelected
```

InteractionBox state:

```text
Action InteractionBox select
→ property active 0/1
→ poseTimeline.writeFrameValue(boxKey, 'active', value)
→ animationFrames / puppetPlayerGeometry stepped frame value
→ actor.player.getPartOffset(boxKey).active
```

Runtime attack:

```text
combatSystem
→ attacker.player.attackInteractionRegion
→ attackInteractionBox.active 확인
→ interactionBoxRuntime.createAttackInteractionRegion()
→ interactionBoxRuntime.createInteractionRegion()
→ weapon parent transform + tuning.rig.attackInteractionBox + pose offset
→ Runtime attack region
→ combatGeometry.interactionRegionsOverlap()
→ combatSystem.attackReaction()
→ tuning.attackEffects[attackKey]
```

Canvas drag:

```text
pointer drag
→ tuningPanelCanvasController
→ tuningCanvasEditState.canvasPartEditState(context: 'pose')
→ canvasDragApply
→ canvasVisualValues.setCanvasVisualValue()
→ poseTimeline.writeFrameValue()
→ tuning.poseOffsets[poseKey][partKey]
```

## Effect Keyframe 편집

```text
Effect select / Timeline click
→ tuningEffectTimelineController
→ effectTimelineAdapter
→ timelineFrameRead.currentEffectTimelineFrame()
→ tuning.effectOffsets[effectKey]
```

Property/canvas edit:

```text
input or pointer drag
→ tuningEffectTimelineController.writeFrameValue()
→ effectTimelineAdapter.writeFrameValue()
→ timelineKeyframeMutations.writeEffectTimelineFrameValue()
→ tuning.effectOffsets[effectKey]
→ applySelected
```

## Action InteractionBox Keyframe 편집

```text
Action select
→ Timeline frame select
→ interaction box select
→ canvas/property edit
→ poseTimeline.writeFrameValue(boxKey, prop, value)
→ tuning.poseOffsets[poseKey][boxKey]
```

연결 지점:

- `gameConfig.POSE_PART_KEYS`
- `tuningNormalize.normalizePoseOffsets()`
- `poseTimelineAdapter.source(part)`
- `timelineKeyframeMutations`
- `tuningFieldGroups.posePropertyGroups()`
- `tuningEditHandleGeometry`

## Attack InteractionBox Preview

```text
activeAttackSettingsKey()
→ tuningPanelDebugView.drawTuningPanelDebugBoxes()
→ settingsDebugRenderer.drawAttackInteractionBoxPreview()
→ player.editHandles.attackInteractionBox.target
→ actor.player.getPartOffset('attackInteractionBox').active
```

주의:

- Runtime combat reaction은 `attackEffects`를 사용한다.
- `active`는 선형 보간하지 않는다.
- `active = 1`이면 강조 표시하고, `0`이면 같은 source를 연하게 표시한다.

## Canvas Handle 공통 저장 경로

```text
pointer event
→ tuningPanelCanvasController
→ tuningCanvasPointerDrag
→ tuningCanvasEditState
→ tuningCanvasDragFactory
→ canvasDragApply
→ canvasVisualValues
→ target data
→ applySelected
→ saveState
```

Target data:

- Setup part: `tuning.rig[partKey]`
- Setup interaction box: `tuning.rig[boxKey]`
- Action part: `tuning.poseOffsets[poseKey][partKey]`
- Effect: `tuning.effectOffsets[effectKey]`

## 공통 편집 흐름

```text
선택
→ 수정
→ 미리보기
→ 저장
```

모든 Editor 작업은 이 흐름을 기준으로 확인한다.
