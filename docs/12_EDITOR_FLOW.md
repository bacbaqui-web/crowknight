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
→ part_editor_controller.selectPickerPart('part', partKey)
→ selection_state / editor_panel local editing state
→ part_editor_controller.renderPartFields()
→ part_source_data.partEditSources(tuning)
→ transform_value_helper.updateRigPartValue()
→ tuning.rig[partKey]
→ editor_panel.applySelected()
→ actor.player.applyTuning(actor.tuning)
→ saveState
```

Canvas drag:

```text
pointerdown
→ transform_editor_controller
→ transform_drag_helper
→ transform_edit_state.canvasPartEditState()
→ transform_drag_factory.createCanvasPartDrag()
→ transform_drag_apply_helper.applyCanvasPartDrag()
→ transform_value_helper.setCanvasVisualValue()
→ tuning.rig[partKey]
→ applySelected
```

## Setup fallback interaction object 편집

```text
Selection Palette fallback interaction object click
→ part_editor_controller.selectPickerPart('part', boxKey)
→ part_source_data.partEditSources(tuning)
→ tuning.rig[boxKey]
```

Handle 생성:

```text
drawPuppetImagePart(parent)
→ drawPuppetImageLessChildParts()
→ drawPuppetImageLessRectPart()
→ recordPuppetRectPart()
→ player.editHandles[boxKey]
→ transform_handle_geometry_helper()
→ edit_handle_geometry_helper.createPartEditHandleGeometry()
→ edit_handle_renderer
```

저장/Runtime 계산:

```text
canvas/property edit
→ tuning.rig[boxKey]
→ actor.player.applyTuning(actor.tuning)
→ interaction_region_engine
→ saveState
```

## Action Part Keyframe 편집

```text
Action select
→ part_editor_controller.handlePoseChange()
→ timeline_action_controller
→ timeline_action_adapter
```

Frame 선택:

```text
Timeline click
→ timeline_controller
→ timeline_state
→ timeline_action_adapter.currentFrameValue()
→ timeline_frame_reader.currentActionTimelineFrame()
→ tuning.actionOffsets[actionKey][partKey]
```

Property edit:

```text
property input
→ timeline_action_controller.updateOffset()
→ property_value_helper.poseFrameValueFromInput()
→ timeline_action_adapter.writeFrameValue()
→ timeline_keyframe_helper.writeActionTimelineFrameValue()
→ tuning.actionOffsets[actionKey][partKey]
→ applySelected
```

Action object interaction state:

```text
Action object select
→ property active 0/1
→ actionTimeline.writeFrameValue(partKey, 'active', value)
→ actionTimeline.writeFrameValue(partKey, interaction setting, value)
→ tuning.actionOffsets[actionKey][partKey]
→ animation_frame_data / puppet_player_geometry_helper stepped frame value
→ actor.player.getPartOffset(partKey)
```

Runtime attack:

```text
combat_engine
→ attacker.player.attackInteractionRegions
→ interaction_region_engine.createActiveInteractionRegions(player, 'attack')
→ active + attack object의 recorded region
→ Runtime attack regions
→ combat_engine.interactionRegionsOverlap()
→ attackInteractionRegion.reaction
→ combat_engine.applyHitReaction()
```

Runtime collision / guard:

```text
active + collision object
→ player.collisionInteractionRegions
→ combat_engine resolveCollisionInteractions()
```

```text
active + guard object
→ player.guardInteractionRegions
→ attack region overlap 시 guard block
```

Canvas drag:

```text
pointer drag
→ transform_editor_controller
→ transform_edit_state.canvasPartEditState(context: 'pose')
→ transform_drag_apply_helper
→ transform_value_helper.setCanvasVisualValue()
→ actionTimeline.writeFrameValue()
→ tuning.actionOffsets[actionKey][partKey]
```

## Target Action 제작 흐름

아직 구현하지 않은 목표 흐름이다.

```text
+ Skill
↓
기본 설정
↓
Timeline
↓
Interaction
↓
Modifiers
↓
저장
```

Basic Actions:

```text
Action select
→ actionSelect / actionTimeline 사용
→ tuning.actionOffsets / tuning.actionSettings
```

Skills:

```text
+ Skill
→ action 기본 정보 생성
→ trigger input 설정
→ Timeline keyframe 작성
→ Interaction 체크 ON/OFF
→ 체크한 box를 Transform target으로 편집
→ Modifiers 추가/설정
→ Action 데이터 저장
```

원칙:

- Action 제작 UI는 기존 Timeline / Property / Transform 경로를 재사용한다.
- Interaction Box도 editable object Transform 모델을 따른다.
- Group Edit은 임시 Transform Target으로만 사용하고 저장 source가 되지 않는다.
- Runtime 계산값은 Editor source처럼 편집하지 않는다.

### Common EditTarget Resolver

Setup / Action / Effect 편집은 먼저 공통 EditTarget Resolver를 통과한다. Property, Canvas Handle, Drag, Save는 선택 상태를 다시 계산하지 않고 resolver 결과를 사용해야 한다.

```text
Selection / Timeline selection
→ resolveEditTarget(context)
→ EditTarget
→ Property
→ Handle
→ Drag
→ Save
→ Renderer
```

Resolver 반환값은 `context`, `targetType`, `targetKey`, `targetKeys`, `writeTargetKey`, `writeTargetKeys`, `isActionPivot`, `isFrameGroup`, `isGroup`, `isPart`, `isEffect`를 포함한다.

구조 규칙:

- Property는 resolver의 `writeTargetKey`로 값을 읽고 쓴다.
- Canvas Handle은 resolver의 `targetKey`로 handle geometry source를 고른다.
- Drag는 resolver의 `writeTargetKey`로 drag target과 save target을 고른다.
- Save는 resolver 밖에서 active part, selected parts, frameGroup 여부를 다시 판단하지 않는다.
- `group`도 EditTarget의 한 종류다. Property / Handle / Drag는 `targetKeys` / `writeTargetKeys`를 사용하고, `group_transform_adapter.js`는 여러 파츠에 결과를 분배하는 역할만 맡는다.

### Action Timeline Property / Handle Scope

- `actionPivot`: 키프레임 선택 없음 + 파츠 선택 없음. Action 공통 Pivot만 편집한다. Property에는 기준점 X/Y만 보이고, Canvas에는 Pivot handle만 보인다. 저장 위치는 `actionSettings[actionKey].editPivot`이다.
- `frameGroup`: 키프레임 선택 있음 + 파츠 선택 없음. 선택한 Action frame의 `master` Parent Transform을 편집한다. 위치 / 크기 / 회전 / 투명도를 편집하며 기준점은 Action 공통 Pivot을 사용한다.
- `group`: 여러 파츠 선택. 선택한 `targetKeys`를 하나의 임시 Transform target처럼 편집하고, 저장은 각 `writeTargetKeys` 파츠 frame에 분배한다.
- `part`: 파츠 선택 있음. 기존처럼 선택 파츠만 편집한다.

frameGroup은 이전 part 선택 흔적이 남아 있어도 `writeTargetKey = master`를 유지한다.

`frameGroup`은 각 파츠 transform을 재계산해 분배하지 않는다. 저장 대상은 `tuning.actionOffsets[actionKey].master`이며, 렌더 순서는 `Setup → master frameGroup transform → Part Timeline Transform → Render`다. Pivot 변경은 `actionSettings[actionKey].editPivot`과 `master` frame anchor를 동기화한다.

## Effect Keyframe 편집

```text
Effect select / Timeline click
→ timeline_effect_controller
→ timeline_effect_adapter
→ timeline_frame_reader.currentEffectTimelineFrame()
→ tuning.effectOffsets[effectKey]
```

Property/canvas edit:

```text
input or pointer drag
→ timeline_effect_controller.writeFrameValue()
→ timeline_effect_adapter.writeFrameValue()
→ timeline_keyframe_helper.writeEffectTimelineFrameValue()
→ tuning.effectOffsets[effectKey]
→ applySelected
```

Effect interaction:

```text
tuning.effectOffsets[effectKey].active / attack / hurt / collision / guard
→ actor_canvas_renderer.drawAttackTrail()
→ player.hitRegions[effect:effectKey].interaction
→ interaction_region_engine.createActiveInteractionRegions()
→ combat_engine
```

## Action Object Interaction 편집

```text
Action select
→ Timeline frame select
→ editable object select
→ canvas/property edit
→ actionTimeline.writeFrameValue(partKey, prop, value)
→ tuning.actionOffsets[actionKey][partKey]
```

연결 지점:

- `game_config.ACTION_PART_KEYS`
- `project_data_normalizer.normalizeActionOffsets()`
- `timeline_action_adapter.source(part)`
- `timeline_keyframe_helper`
- `property_field_data.posePropertyGroups()`
- `transform_handle_geometry_helper`

## Fallback Attack Region Preview

```text
activeAttackSettingsKey()
→ editor_debug_view.drawTuningPanelDebugBoxes()
→ editor_debug_view.drawFallbackAttackRegionPreview()
→ player.editHandles.attackInteractionObject.target
→ actor.player.getPartOffset('attackInteractionObject').active
```

주의:

- 공통 Action object 판정 설정은 `actionOffsets`에 저장한다.
- Runtime combat reaction은 `attackInteractionRegion.reaction`을 사용한다.
- `active`는 선형 보간하지 않는다.
- `active = 1`이면 강조 표시하고, `0`이면 같은 source를 연하게 표시한다.

## Canvas Handle 공통 저장 경로

```text
pointer event
→ transform_editor_controller
→ transform_drag_helper
→ transform_edit_state
→ transform_drag_factory
→ transform_drag_apply_helper
→ transform_value_helper
→ target data
→ applySelected
→ saveState
```

Target data:

- Setup part: `tuning.rig[partKey]`
- Setup fallback interaction object: `tuning.rig[boxKey]`
- Action part: `tuning.actionOffsets[actionKey][partKey]`
- Action 공통 Pivot: `tuning.actionSettings[actionKey].editPivot`
- Effect: `tuning.effectOffsets[effectKey]`

## 공통 편집 흐름

```text
선택
→ 수정
→ 미리보기
→ 저장
```

모든 Editor 작업은 이 흐름을 기준으로 확인한다.
