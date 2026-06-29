# 12_EDITOR_FLOW.md

이 문서는 사용자 행동이 어떤 JS를 거쳐 어디에 저장되는지만 설명한다.

Transform 기준:

```text
After Effects Transform model
→ translate(x, y)
→ rotate(rot)
→ drawRect(-ax, -ay, w, h)
```

## Setup Part 편집

```text
Selection Palette click
→ tuningPanelPartController.selectPickerPart('part', partKey)
→ tuningPanelSelectionState / tuningPanel local editing state
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

## Setup fallback interaction object 편집

```text
Selection Palette fallback interaction object click
→ tuningPanelPartController.selectPickerPart('part', boxKey)
→ tuningParts.partEditSources(tuning)
→ tuning.rig[boxKey]
```

Handle 생성:

```text
drawPuppetImagePart(parent)
→ drawPuppetImageLessChildParts()
→ drawPuppetImageLessRectPart()
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
→ interactionRegionRuntime
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

Action object interaction state:

```text
Action object select
→ property active 0/1
→ poseTimeline.writeFrameValue(partKey, 'active', value)
→ poseTimeline.writeFrameValue(partKey, interaction setting, value)
→ tuning.poseOffsets[poseKey][partKey]
→ animationFrames / puppetPlayerGeometry stepped frame value
→ actor.player.getPartOffset(partKey)
```

Runtime attack:

```text
combatSystem
→ attacker.player.attackInteractionRegions
→ interactionRegionRuntime.createActiveInteractionRegions(player, 'attack')
→ active + attack object의 recorded region
→ Runtime attack regions
→ combatGeometry.interactionRegionsOverlap()
→ attackInteractionRegion.reaction
→ combatSystem.applyHitReaction()
```

Runtime collision / guard:

```text
active + collision object
→ player.collisionInteractionRegions
→ combatSystem resolveCollisionInteractions()
```

```text
active + guard object
→ player.guardInteractionRegions
→ attack region overlap 시 guard block
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

Effect interaction:

```text
tuning.effectOffsets[effectKey].active / attack / hurt / collision / guard
→ actorRenderer.drawAttackTrail()
→ player.hitRegions[effect:effectKey].interaction
→ interactionRegionRuntime.createActiveInteractionRegions()
→ combatSystem
```

## Action Object Interaction 편집

```text
Action select
→ Timeline frame select
→ editable object select
→ canvas/property edit
→ poseTimeline.writeFrameValue(partKey, prop, value)
→ tuning.poseOffsets[poseKey][partKey]
```

연결 지점:

- `gameConfig.POSE_PART_KEYS`
- `tuningNormalize.normalizePoseOffsets()`
- `poseTimelineAdapter.source(part)`
- `timelineKeyframeMutations`
- `tuningFieldGroups.posePropertyGroups()`
- `tuningEditHandleGeometry`

## Fallback Attack Region Preview

```text
activeAttackSettingsKey()
→ tuningPanelDebugView.drawTuningPanelDebugBoxes()
→ settingsDebugRenderer.drawFallbackAttackRegionPreview()
→ player.editHandles.attackInteractionObject.target
→ actor.player.getPartOffset('attackInteractionObject').active
```

주의:

- 공통 Action object 판정 설정은 `poseOffsets`에 저장한다.
- Runtime combat reaction은 `attackInteractionRegion.reaction`을 사용한다.
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
- Setup fallback interaction object: `tuning.rig[boxKey]`
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
