# CURRENT TASK REPORT

## 1. Sprint 정보

- Sprint 이름
  - Editor Foundation Closing Sprint

- 최종 목표
  - 새 기능 없이 Editor 구조의 파일명, 역할 접미사, SRC MAP, Architecture 용어를 정리한다.
  - 다음 Sprint부터 기능 개발에 집중할 수 있도록 사람이 프로젝트 구조를 빠르게 이해할 수 있는 상태로 만든다.

---

## 2. 직전 완료 Task 보고

- Task 이름
  - Editor Foundation 파일명 / SRC MAP 정리

- Task 목표
  - `src/*.js` 파일명을 `snake_case + 역할 접미사` 규칙으로 맞춘다.
  - `docs/10_SRC_MAP.md`를 사람이 5분 안에 구조를 파악할 수 있는 엔진 중심 인덱스로 정리한다.
  - Architecture / Editor Flow / SRC MAP의 용어와 파일명을 실제 코드와 맞춘다.

- 작업 전 확인 문서
  - `docs/20_IMPLEMENTATION_RULES.md`
  - `docs/00_MANIFEST.md`
  - `docs/03_ARCHITECTURE.md`
  - `docs/10_SRC_MAP.md`

---

## 3. 변경한 파일명

### 역할 접미사 / snake_case 정리

| 이전                            | 이후                                  | 이유                                               |
| ------------------------------- | ------------------------------------- | -------------------------------------------------- |
| `action_edit_session.js`        | `action_edit_state.js`                | Action editor-only 선택 상태를 보관하는 state 역할 |
| `action_timeline_edit_scope.js` | `action_timeline_edit_helper.js`      | Action edit pivot / scope 보조 helper 역할         |
| `actorFrameState.js`            | `actor_frame_state.js`                | actor frame 시작 / pause state helper              |
| `actorPlacement.js`             | `actor_placement_helper.js`           | actor 배치 계산 helper                             |
| `actorState.js`                 | `actor_state.js`                      | actor action runtime state helper                  |
| `actorTuning.js`                | `actor_tuning_helper.js`              | default tuning / HP capacity sync helper           |
| `cameraView.js`                 | `camera_view.js`                      | camera view transform helper                       |
| `canvasDragMath.js`             | `canvas_drag_math_helper.js`          | canvas drag 계산 helper                            |
| `canvasDragState.js`            | `canvas_drag_state.js`                | canvas drag state                                  |
| `canvasLayout.js`               | `canvas_layout_helper.js`             | canvas layout sync helper                          |
| `characterHudLayout.js`         | `character_hud_layout_helper.js`      | character HUD layout helper                        |
| `editor_asset_actions.js`       | `editor_asset_controller.js`          | asset 버튼 입력 / 흐름 controller                  |
| `firebaseConfig.js`             | `firebase_config_data.js`             | Firebase 설정 data                                 |
| `inputControls.js`              | `input_control_controller.js`         | input 상태 갱신 controller                         |
| `mainDomElements.js`            | `main_dom_helper.js`                  | main DOM lookup helper                             |
| `motion_field_rows.js`          | `motion_field_data.js`                | field row definition data                          |
| `panel_action_feedback.js`      | `panel_feedback_view.js`              | panel feedback view                                |
| `part_source_registry.js`       | `part_source_data.js`                 | editable part source registry data                 |
| `particleEffects.js`            | `particle_effects_engine.js`          | particle runtime engine                            |
| `property_field_groups.js`      | `property_field_data.js`              | property field definition data                     |
| `puppetPlayerDebug.js`          | `puppet_player_debug_view.js`         | puppet debug drawing view                          |
| `puppetPlayerEditRegions.js`    | `puppet_player_edit_region_helper.js` | edit region helper                                 |
| `puppetPlayerGeometry.js`       | `puppet_player_geometry_helper.js`    | puppet geometry helper                             |
| `rankingController.js`          | `ranking_controller.js`               | ranking flow controller                            |
| `rankingUi.js`                  | `ranking_view.js`                     | ranking UI view                                    |
| `rollGhosts.js`                 | `roll_ghost_engine.js`                | roll ghost runtime engine                          |
| `runHud.js`                     | `run_hud_view.js`                     | runtime HUD view                                   |
| `scoreFormat.js`                | `score_format_helper.js`              | score format helper                                |
| `selection_palette.js`          | `selection_palette_data.js`           | selection palette definition data                  |
| `stageRulesController.js`       | `stage_rules_controller.js`           | stage rules controller                             |
| `stageRulesPanelController.js`  | `stage_rules_panel_controller.js`     | stage rules panel controller                       |
| `stageRulesPanelRenderer.js`    | `stage_rules_panel_renderer.js`       | stage rules panel renderer                         |
| `stageRulesState.js`            | `stage_rules_state.js`                | stage rules state                                  |

### 접미사 역할 명확화

| 이전                                | 이후                                      | 이유                                                |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| `action_trigger_runtime.js`         | `action_trigger_engine.js`                | trigger matching / Action start runtime 규칙 engine |
| `edit_target_resolver.js`           | `edit_target_helper.js`                   | 공통 EditTarget resolver helper                     |
| `editor_control_bindings.js`        | `editor_control_binding_controller.js`    | editor control event binding controller             |
| `editor_control_setup.js`           | `editor_control_setup_controller.js`      | editor control setup controller                     |
| `editor_layer_order.js`             | `editor_layer_order_helper.js`            | layer order helper                                  |
| `editor_local_only_guard.js`        | `editor_local_only_helper.js`             | local-only guard helper                             |
| `editor_panel.js`                   | `editor_panel_controller.js`              | editor panel top-level controller                   |
| `editor_panel_bindings.js`          | `editor_panel_binding_controller.js`      | panel binding controller                            |
| `editor_panel_bootstrap.js`         | `editor_panel_bootstrap_helper.js`        | panel bootstrap helper                              |
| `editor_panel_composition.js`       | `editor_panel_composition_helper.js`      | panel composition helper                            |
| `editor_panel_dom.js`               | `editor_panel_dom_helper.js`              | panel DOM helper                                    |
| `editor_panel_sync.js`              | `editor_panel_sync_helper.js`             | panel sync helper                                   |
| `editor_timeline_section.js`        | `editor_timeline_section_controller.js`   | timeline section controller                         |
| `editor_workflow_navigation.js`     | `editor_workflow_navigation_helper.js`    | workflow navigation helper                          |
| `firebase_asset_storage.js`         | `firebase_asset_storage_helper.js`        | Firebase asset storage helper                       |
| `firebase_ranking_storage.js`       | `firebase_ranking_storage_helper.js`      | Firebase ranking storage helper                     |
| `game_config.js`                    | `game_config_data.js`                     | game constants / config data                        |
| `interaction_object_editor.js`      | `interaction_object_editor_controller.js` | interaction object editor controller                |
| `local_character_asset_storage.js`  | `local_character_asset_storage_helper.js` | local character asset storage helper                |
| `pose_action_authoring.js`          | `pose_action_authoring_helper.js`         | legacy pose/action authoring helper                 |
| `pose_action_authoring_controls.js` | `pose_action_authoring_controller.js`     | legacy pose/action authoring controller             |
| `project_data_normalizer.js`        | `project_data_normalizer_helper.js`       | project data normalize helper                       |
| `timeline_adapter_contract.js`      | `timeline_adapter_contract_helper.js`     | timeline adapter contract helper                    |
| `transform_handle_geometry.js`      | `transform_handle_geometry_helper.js`     | transform handle geometry helper                    |
| `utils.js`                          | `common_helper.js`                        | shared generic helper                               |

---

## 4. 문서 정리

- `docs/10_SRC_MAP.md`
  - 파일 역할표를 Engine 기준으로 재정렬했다.
  - Selection / EditTarget, Editor Shell, Timeline, Transform / Property / Handle / Drag, Runtime / Actor, Stage / Assets, Save / Data 순서로 정리했다.
  - 각 파일 설명은 한 줄로 줄였다.
  - "역할표 미준수 / 보류"는 `main.js` entry point 예외 외에는 없는 상태로 정리했다.

- `docs/12_EDITOR_FLOW.md`
  - 오래된 `part_source_registry`, `property_field_groups`, `puppetPlayerGeometry`, `transform_handle_geometry` 참조를 현재 파일명으로 맞췄다.

- `docs/src-map.html`
  - 열람용 SRC map에 남아 있던 옛 파일명과 보류 목록을 현재 파일명 기준으로 맞췄다.

---

## 5. 남겨둔 파일

- `src/main.js`
  - 앱 entry point라 역할 접미사를 붙이지 않는 명시 예외로 둔다.

- Historical docs
  - `docs/98_SPRINT_HISTORY.md`, `docs/completed-sprints/*` 안의 과거 파일명 언급은 당시 작업 기록으로 남긴다.

---

## 6. QA

- 완료
  - `src/*.js` camelCase 파일명 없음.
  - `main.js`를 제외한 `src/*.js`가 허용 접미사(`engine`, `helper`, `adapter`, `controller`, `renderer`, `view`, `state`, `data`, `factory`, `reader`)를 사용함.
  - 로컬 JS import 대상 파일 존재 확인.
  - `node --check src/main.js` 통과.
  - `npm run check`
  - `git diff --check`
  - `docs/10_SRC_MAP.md`에 적힌 JS 파일이 실제 `src` 파일과 일치함.

---

## 7. 판단

- Editor Foundation은 파일명 / 문서 인덱스 관점에서 마감 가능한 상태로 판단한다.
- 다음 Sprint부터는 새 기능 개발에 들어가도 된다.
