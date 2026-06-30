# Common Editor Refactor Sprint

완료일: 2026-06-30

완료 커밋: `28a1164 Refactor common editor property and group transform flows`

## Sprint 목표

Setup / Action / Effect / InteractionObject가 같은 편집 기능을 가능한 한 같은 내부 시스템으로 사용하게 한다.

핵심 목표:

- Property 입력과 Transform drag의 W/H 기준 크기 계산 공통화.
- Stepper / scrub / 숫자 표시 / clamp 규칙 공통화.
- Action / Effect Timeline glue 공통화.
- InteractionObject를 Part source와 Property / Transform 흐름에 더 흡수.
- Group Edit을 임시 Transform 대상으로 정리.

하지 않은 것:

- Runtime 저장 구조 변경.
- `tuning.rig`, `poseOffsets`, `effectOffsets` 저장 구조 변경.
- Stage / HUD / Background 전체 공통화.
- 새 기능 추가.

## 핵심 변경

### Property / Transform 값 규칙 공통화

주요 파일:

- `src/editable_property_helper.js`
- `src/property_value_helper.js`
- `src/transform_value_helper.js`
- `src/property_field_groups.js`
- `src/property_scrub_helper.js`
- `src/property_numeric_input_helper.js`
- `src/number_input_helper.js`

완료 내용:

- W/H percent 변환 helper 추가.
- Setup Part W/H 기준과 Transform direct drag 기준을 같은 helper로 정리.
- Action Pose W/H offset/percent 변환과 Transform pose drag 기준을 같은 helper로 정리.
- Effect W/H percent 변환도 같은 helper 계열로 정리.
- Size percent min/max를 공통 상수로 정리.
- Property scrub의 toggle / opacity / percent / decimal 표시 규칙을 helper로 분리.
- Number input step 자리수 포맷과 scrub 표시 포맷을 같은 숫자 formatter 계열로 맞춤.
- Background, speed, run motion link의 decimal 표시와 clamp 일부를 공통 helper로 연결.

의미:

- 같은 값이 Property 입력과 Canvas drag에서 서로 다른 기준으로 계산될 위험을 줄였다.
- UI 입력 규칙이 파일마다 흩어지는 것을 줄였다.

### Timeline 공통화

주요 파일:

- `src/timeline_controller.js`
- `src/timeline_engine.js`
- `src/timeline_command_helper.js`
- `src/timeline_drag_helper.js`
- `src/timeline_clipboard_helper.js`
- `src/timeline_playback_helper.js`
- `src/timeline_pose_controller.js`
- `src/timeline_effect_controller.js`
- `src/timeline_pose_adapter.js`
- `src/timeline_effect_adapter.js`

완료 내용:

- Action / Effect Timeline의 command, drag, selection, playback, preview glue를 공통 helper 쪽으로 더 모았다.
- Action / Effect 차이는 adapter와 controller 경계에 남겼다.
- Timeline keyframe 생성 QA에서 Action과 Effect 모두 통과했다.

의미:

- Action Timeline에서 고친 입력/선택/드래그 규칙이 Effect Timeline에도 적용될 가능성이 커졌다.
- Action / Effect를 완전히 합친 것은 아니고, 공통 core와 대상별 adapter 구조로 정리했다.

### InteractionObject 편집 흐름 정착

주요 파일:

- `src/part_source_registry.js`
- `src/interaction_object_editor.js`
- `src/property_field_groups.js`
- `src/property_value_helper.js`
- `src/transform_value_helper.js`

완료 내용:

- InteractionObject가 Part source 쪽에 포함되어 Setup / Action Property와 Transform 흐름을 더 공유한다.
- W/H 저장과 표시가 일반 size percent helper 계열을 사용하게 정리했다.
- 판정 관련 Property는 Editable Property helper와 Property group 흐름을 사용한다.

의미:

- InteractionObject가 별도 박스 편집 시스템으로 남는 것을 줄였다.
- Runtime 계산값을 Editor source처럼 쓰지 않는 방향을 유지했다.

### Group Edit 구조 정리

주요 파일:

- `src/group_transform_adapter.js`
- `src/group_edit_state.js`
- `src/transform_drag_apply_helper.js`
- `src/transform_drag_factory.js`
- `src/transform_drag_helper.js`
- `src/transform_editor_controller.js`
- `src/part_editor_controller.js`
- `src/edit_handle_geometry_helper.js`

완료 내용:

- `src/group_transform_adapter.js` 추가.
- `src/group_pose_editor.js` 제거.
- Group 전용 move / rotate / scale / opacity 분배 계산을 Adapter로 이동.
- Group Property 입력도 Adapter를 통해 선택된 여러 Part에 분배.
- Group drag는 공통 Transform 진입점에서 감지 후 Adapter로 위임.
- Group drag 시작 시 X/Y/R/S 값을 즉시 0/100으로 리셋하지 않게 변경.
- Group에 W/H Property가 없으므로 W/H axis handle을 제거하고 S scale handle만 남김.

최종 흐름:

```text
여러 파츠 선택
↓
Group Edit 상태
↓
Temporary Transform Target처럼 X/Y/R/S/O 해석
↓
공통 Transform 진입점
↓
Group Adapter
↓
각 선택 Part의 pose offset에 결과 분배
```

의미:

- Group Edit의 책임은 “복수 선택을 임시 Transform 대상으로 만드는 것”으로 좁아졌다.
- Group 전용 계산은 Adapter 경계에 모였다.
- 일반 Part의 Transform 계산 흐름과 Group 전용 분배 계산이 섞이는 정도를 줄였다.

## 변경된 데이터 흐름

### Setup

```text
Property Input
↓
property_value_helper
↓
tuning.rig
↓
Transform / Renderer
```

### Action

```text
Property Input / Canvas Drag
↓
property_value_helper / transform_value_helper
↓
timeline_pose_adapter
↓
tuning.poseOffsets[poseKey][partKey]
```

### Effect

```text
Property Input / Timeline
↓
timeline_effect_adapter
↓
tuning.effectOffsets[effectKey]
```

### Group Edit

```text
selectedPoseParts
↓
group_edit_state
↓
group_transform_adapter
↓
poseOffsets of each selected part
```

## 검증 결과

정적 검증:

- `npm run check`: 통과.
- `git diff --check`: 통과.

자동 QA:

- Setup / Action / Effect W stepper와 scrub drag 통과.
- Action / Effect Timeline keyframe 생성 통과.
- Action Group Edit 자동 QA 통과.

Group Edit 자동 QA 결과:

- 결과 파일: `docs/qa/group-edit-auto/results.json`
- Action 첫프레임에서 `upperArmR + lowerArmR` 다중 선택 시 `선택 그룹 2` 표시.
- Group Property가 `X/Y/S/R/O`로 표시되고 `W/H`는 표시되지 않음.
- Stepper:
  - `X 0 -> 1`
  - `S 100% -> 101%`
  - `R 0x +0° -> 0x +1°`
  - `O 보임 -> 숨김`
- Canvas handle:
  - Move: `X/Y 0/0 -> 45/20`
  - Rotate: `R 0x +0° -> 0x +39.4°`
  - Scale: `S 100% -> 179.7%`
- 조작 후 선택 그룹 유지.

사용자 QA:

- Setup / Action Canvas resize 정상 확인.

참고:

- `/runtime/project-default-state.json` 404는 optional fallback으로 확인되어 QA 실패로 세지 않는다.

## 남은 예외와 위험

- Stage / HUD는 Common Editing 밖에 남아 있다.
- Background는 일부 numeric helper만 공유하며, 전체 편집 흐름 공통화는 보류했다.
- Group Edit은 Action 전용이다.
- Group 결과 분배는 여러 Part pose offset에 나눠 쓰는 특수 동작이라 Adapter 경계에 남아 있다.
- `sizeValueToPercent(value, baseValue)`는 raw `0` size를 의미 있는 값으로 허용할 경우 재검토가 필요하다.
- QA 스크린샷이 많이 커밋됐다. 다음 Sprint부터 QA 산출물 보관 정책을 정하면 좋다.

## 의도적으로 건드리지 않은 부분

- Runtime mirror.
- Combat runtime.
- Stage / HUD.
- Background 전체 편집 구조.
- 저장 데이터 구조.
- Firebase / Save 동작.

## 다음 Sprint 후보

우선순위 1:

- QA 산출물 보관 정책 정리.
- `docs/qa`에 모든 스크린샷을 남길지, 핵심 스크린샷과 `results.json`만 남길지 결정.

우선순위 2:

- Stage / HUD를 제외한 잔여 공통화 점검.
- 특히 Background numeric UI가 어디까지 공통 helper를 쓰고 어디부터 전용인지 정리.

우선순위 3:

- Group Edit을 사용자 화면에서 눈검사.
- 자동 QA는 통과했으므로 커밋 후 확인용이다.

우선순위 4:

- Stage / HUD / Background 공통화 설계.
- 사용자가 말한 대로 Stage와 Background는 나중에 함께 다룬다.

## Sprint 결론

이번 공통화 Sprint는 완료로 본다.

완료 기준:

- 주요 공통화 구현 완료.
- Group Edit 구조 정리 완료.
- 자동 QA 통과.
- 정적 검증 통과.
- 완료 커밋 생성.
