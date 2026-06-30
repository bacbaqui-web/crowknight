# 10_SRC_MAP.md

목적: AI와 사람이 필요한 JS만 빠르게 찾는 프로젝트 인덱스.

SRC_MAP은 설명서가 아니다.

목표:

- Codex/GPT가 전체 `src`를 읽지 않고 필요한 그룹만 읽게 한다.
- 사람이 파일명, 기능명, 관련 JS를 빠르게 찾게 한다.
- 토큰을 아낀다.

## 네이밍 규칙

- `_engine`: 핵심 규칙 / 계산.
- `_helper`: 기능 하나 담당.
- `_adapter`: Action / Effect / Part 차이 연결.
- `_controller`: 사용자 입력 연결.
- `_renderer`: 화면 출력.
- `_view`: 화면 구성.
- `_state`: 현재 상태.
- `_data`: 기본 데이터 / 저장 데이터 / 설정 데이터.
- `_factory`: 객체 생성.
- `_reader`: 값 읽기.
- Value Helper: 값 변환 / clamp / base 계산 / write 보조.

## 프로젝트 그룹

```text
Entry
├─ main.js

Editor
├─ editor_panel.js
├─ editor_panel_composition.js
├─ part_editor_controller.js
├─ transform_editor_controller.js
├─ editor_control_setup.js
├─ editor_panel_sync.js
└─ editor_workflow_controller.js

Runtime
├─ actor_factory.js
├─ actor_runtime_engine.js
├─ actor_pose_helper.js
├─ actor_renderer.js
├─ actor_action_helper.js
├─ actor_canvas_renderer.js
├─ combat_engine.js
└─ world_renderer.js

Timeline
├─ Engine
│  ├─ timeline_controller.js
│  └─ timeline_engine.js
├─ Helper
│  ├─ timeline_command_helper.js
│  ├─ timeline_drag_helper.js
│  ├─ timeline_selection_helper.js
│  ├─ timeline_preview_helper.js
│  ├─ timeline_action_helper.js
│  ├─ timeline_control_helper.js
│  ├─ timeline_drag_control_helper.js
│  ├─ timeline_clipboard_helper.js
│  ├─ timeline_settings_helper.js
│  ├─ timeline_panel_sync_helper.js
│  └─ timeline_playback_helper.js
├─ Adapter
│  ├─ timeline_adapter_contract.js
│  ├─ timeline_pose_adapter.js
│  └─ timeline_effect_adapter.js
├─ Controller
│  ├─ timeline_pose_controller.js
│  └─ timeline_effect_controller.js
├─ View
│  ├─ timeline_view.js
│  ├─ timeline_dom_helper.js
│  ├─ timeline_pose_panel_view.js
│  ├─ timeline_effect_panel_view.js
│  └─ timeline_renderer.js
├─ State
│  └─ timeline_state.js
├─ Reader
│  └─ timeline_frame_reader.js
└─ timeline_keyframe_helper.js

Save
├─ project_state_controller.js
├─ project_storage_helper.js
├─ firebase_asset_storage.js
└─ firebase_ranking_storage.js

Assets
├─ asset_loader_helper.js
├─ asset_refresh_helper.js
├─ psd_background_helper.js
└─ background_renderer.js

Data
├─ game_config.js
├─ player_default_rig_data.js
├─ player_default_tuning_data.js
├─ project_data_normalizer.js
├─ animation_frame_data.js
└─ stageRulesState.js
```

## Save / Asset 규칙

- `project_storage_helper.js`: Firestore에 저장할 Project State metadata를 만든다.
- `firebase_asset_storage.js`: actor PNG, actor PSD, effect PNG/PSD, background PSD/WebP/layer asset을 Firebase Storage에 올리고 metadata source URL을 갱신한다.
- Firebase 다운로드는 local file을 덮어쓰지 않고, Firestore metadata의 Storage URL을 Runtime source로 적용한다.

## 기능 그룹

### Selection

- 역할: 현재 편집 대상을 결정.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `selection_palette.js`, `part_editor_controller.js`, `selection_state.js`, `panel_edit_state.js`.
- 주의: Selection과 EditTarget이 달라지면 Handle이 틀어진다.

### Transform Editor (구 Canvas)

- 역할: 화면에서 editable object의 transform drag를 처리.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `transform_editor_controller.js`, `transform_edit_state.js`, `transform_drag_helper.js`, `transform_drag_factory.js`, `transform_refresh_helper.js`, `transform_drag_apply_helper.js`, `transform_value_helper.js`.
- 주의: Property와 같은 저장 규칙을 사용한다.

### Property

- 역할: 선택 대상의 Transform 입력값 표시와 저장.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `editable_property_helper.js`, `property_field_groups.js`, `property_value_helper.js`, `editor_scrub_helper.js`, `property_scrub_helper.js`, `property_numeric_input_helper.js`.
- 주의: Property는 `x/y`, `w/h`, `rot`, `opacity`, anchor 같은 Transform만 담당한다. Interaction/Modifier 코드를 넣지 않는다.

### Editor Data Cards

- 역할: Property / Interaction / Modifiers 패널의 공통 카드 UI.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `editor_card_panel_view.js`, `settingsPanel.css`.
- 주의: 세 패널은 형제 관계다. Property 아래에 보이더라도 Property의 일부가 아니다.

### Interaction Editor Engine

- 역할: Interaction 체크 상태, 세부 설정 row, Timeline frame 값 저장.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `interaction_editor_engine.js`, `interaction_object_editor.js`, `editor_scrub_helper.js`, `part_source_registry.js`.
- 사용처: Action Pose Timeline, Effect Timeline.
- 주의: Runtime Box를 Editor source로 사용하지 않는다.

### Modifiers Editor Engine

- 역할: Modifier 목록, 추가/삭제 기준이 되는 활성화, Modifier별 설정 UI, 저장 정규화.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `modifier_editor_engine.js`, `timeline_modifier_data.js`, `project_data_normalizer.js`, `player_default_tuning_data.js`.
- 사용처: Action Pose Timeline, Effect Timeline.
- 주의: Modifier 해석은 Runtime Task에서 별도 Action Modifier Engine으로 연결한다.

### Handle

- 역할: Move/Resize/Rotate handle 위치와 표시.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `transform_handle_geometry.js`, `edit_handle_geometry_helper.js`, `edit_handle_renderer.js`, `edit_handle_drawing_helper.js`.
- 주의: Handle source와 render source가 같아야 한다.

### Transform

- 역할: x/y, ax/ay, w/h, rot 공통 규칙.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `editable_object_model_helper.js`, `editable_property_helper.js`, `transform_drag_apply_helper.js`, `transform_value_helper.js`, `property_value_helper.js`.
- 주의: 모든 editable object가 같은 transform 의미를 써야 한다.

### Timeline

- 역할: 시간에 따른 값 저장.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `timeline_controller.js`, `timeline_engine.js`, `timeline_state.js`, `timeline_command_helper.js`, `timeline_drag_helper.js`, `timeline_selection_helper.js`, `timeline_preview_helper.js`, `timeline_pose_adapter.js`, `timeline_effect_adapter.js`, `timeline_pose_controller.js`, `timeline_effect_controller.js`, `timeline_view.js`, `timeline_renderer.js`, `timeline_frame_reader.js`, `timeline_keyframe_helper.js`.
- 주의: Action/Effect 모두 영향. 공통 engine에 전용 예외를 넣지 않는다.

### InteractionObject

- 역할: 공격/피격/충돌/방어 같은 상호작용 영역.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `interaction_object_editor.js`, `interaction_region_engine.js`, `combat_engine.js`, `editable_object_model_helper.js`.
- 주의: Runtime 계산값을 Editor source처럼 쓰지 않는다.

### Save

- 역할: 프로젝트 저장/불러오기.
- 공통 여부: 🟦 공통 시스템.
- 관련 JS: `project_state_controller.js`, `project_storage_helper.js`, `firebase_asset_storage.js`, `firebase_ranking_storage.js`.
- 주의: Project save와 asset refresh를 섞지 않는다.

### Runtime

- 역할: Editor 데이터를 게임 실행 결과로 계산.
- 공통 여부: 🟦 공통 경계.
- 관련 JS: `main.js`, `actor_factory.js`, `actor_runtime_engine.js`, `actor_pose_helper.js`, `actor_renderer.js`, `actor_canvas_renderer.js`, `combat_engine.js`.
- 주의: Runtime은 Editor 원본을 직접 수정하지 않는다. `actor_pose_helper.js`는 neutral pose만 반환하며 사전 팔/다리 애니메이션을 만들지 않는다.

### Data

- 역할: 기본값, normalize, schema, frame data.
- 공통 여부: 🟦 공통 경계.
- 관련 JS: `game_config.js`, `player_default_rig_data.js`, `player_default_tuning_data.js`, `project_data_normalizer.js`, `animation_frame_data.js`.
- 주의: 저장 구조 변경은 별도 Sprint에서만 한다.

### Stage

- 역할: Stage 편집.
- 공통 여부: 🟨 전용 구현.
- 관련 JS: `stageRulesController.js`, `stageRulesPanelController.js`, `stageRulesPanelRenderer.js`, `stageRulesState.js`.
- 주의: 아직 Common Editing에 흡수 안 됨.

### HUD

- 역할: Runtime HUD와 이름/HP 표시.
- 공통 여부: 🟨 전용 구현.
- 관련 JS: `characterHudLayout.js`, `runHud.js`, `rankingUi.js`, `rankingController.js`.
- 주의: editable object 규칙과 완전히 통합되지 않았다.

### Background

- 역할: 배경 편집과 렌더.
- 공통 여부: 🟨 전용 구현.
- 관련 JS: `background_panel_controller.js`, `background_panel_view.js`, `background_renderer.js`, `psd_background_helper.js`.
- 주의: Stage/Asset 흐름과 연결되어 있어 공통화 전 설계 필요.

### Group Edit

- 역할: 여러 파츠를 임시 Transform 대상으로 묶고 결과를 각 파츠에 분배.
- 공통 여부: 🟨 전용 구현.
- 관련 JS: `group_transform_adapter.js`, `group_edit_state.js`.
- 주의: Group 전용 차이는 adapter에만 남긴다.

## 큰 파일

| 파일                            | 줄 수 | 중심               | 주의                          |
| ------------------------------- | ----: | ------------------ | ----------------------------- |
| `background_renderer.js`        |   482 | Background render  | 더 흡수 금지                  |
| `project_data_normalizer.js`    |   465 | Normalize          | 저장 구조 변경 주의           |
| `actor_runtime_engine.js`       |   440 | Runtime player     | 더 흡수 금지                  |
| `editor_panel.js`               |   421 | Editor shell       | controller 연결만 유지        |
| `actor_renderer.js`             |   394 | Runtime render     | Editor target 기록 경계 주의  |
| `main.js`                       |   380 | Entry / loop       | 책임 추가 금지                |
| `timeline_effect_controller.js` |   341 | Effect timeline    | 추가 흡수보다 helper 분리     |
| `player_default_rig_data.js`    |   336 | Default rig        | 저장 구조 변경 시 별도 Sprint |
| `part_editor_controller.js`     |   332 | Selection/Property | 무리한 추가 금지              |
| `combat_engine.js`              |   330 | Runtime combat     | Editor source와 분리          |
| `timeline_pose_controller.js`   |   320 | Action timeline    | 추가 흡수보다 helper 분리     |

## 보류 파일

이번 마지막 Rename 정리 Sprint에서 보류한 파일.

- Stage: `stageRulesController.js`, `stageRulesPanelController.js`, `stageRulesPanelRenderer.js`, `stageRulesState.js`
  - 이유: Stage는 사용자 지시에 따라 마지막 단계에서 다룬다.
- HUD/Ranking: `characterHudLayout.js`, `runHud.js`, `rankingUi.js`, `rankingController.js`
  - 이유: HUD는 이번 rename 범위에서 제외.
- Runtime 보조: `actorFrameState.js`, `actorPlacement.js`, `actorState.js`, `actorTuning.js`, `puppetPlayerGeometry.js`, `puppetPlayerEditRegions.js`, `puppetPlayerDebug.js`
  - 이유: 역할 재분류가 필요하다. Runtime 동작 민감 파일은 별도 작은 Sprint에서 검토.
- Canvas/DOM 보조: `canvasDragMath.js`, `canvasDragState.js`, `canvasLayout.js`, `cameraView.js`, `inputControls.js`, `mainDomElements.js`
  - 이유: 이번 Sprint 후보가 아니며 함수/DOM 이름과 같이 검토해야 한다.
- 기타 전용 파일: `particleEffects.js`, `rollGhosts.js`, `scoreFormat.js`, `firebaseConfig.js`
  - 이유: 현재 기능별 전용 구현. 무리하게 suffix를 붙이지 않는다.

## 검색 힌트

- `transform_value_helper`: Transform Editor 저장값 변환.
- `transform_refresh_helper`: Transform Editor drag 후 context별 반영/렌더 갱신.
- `timeline_frame_reader`: 현재 frame 읽기.
- `property_value_helper`: Property 표시값/저장값 변환.
- `editable_property_helper`: editable object property 종류와 anchor 짝 규칙 판별.
- `edit_handle_geometry_helper`: Handle 위치 계산.
- `interaction_region_engine`: Runtime 상호작용 영역 계산.
- `project_data_normalizer`: 저장 데이터 normalize.
