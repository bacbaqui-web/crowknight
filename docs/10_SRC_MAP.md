# 10_SRC_MAP.md

목적: AI와 사람이 필요한 JS만 빠르게 찾는 프로젝트 인덱스.

SRC_MAP은 설계 설명서가 아니다. 현재 파일 역할과 위치만 짧게 기록한다.

Runtime Structure Refactor 최종 감사 기준: 실제 `src` JavaScript 242개와 inventory가 일치한다.

## Naming Rules

- `_engine`: 핵심 규칙 / 계산.
- `_helper`: 작은 기능, 변환, 계산 보조.
- `_adapter`: 공통 구조와 도메인 데이터 사이 연결.
- `_controller`: 사용자 입력, 이벤트, 상태 변경 연결.
- `_renderer`: Canvas / 화면 출력.
- `_view`: DOM 조립, 표시 전용 UI.
- `_state`: Editor / Runtime 현재 상태.
- `_data`: 기본값, 설정값, 정의 목록.
- `_factory`: 객체 생성.
- `_reader`: 값 읽기.
- `_registry`: definition 등록 / 조회 / normalize 연결.
- 예외: `main.js`와 `editor_entry.js`는 앱 entry point다. `project_save_queue.js`는 저장 queue 역할이다.

## Entry

- `main.js`: 앱 시작점, runtime update/draw loop, 화면 상태와 Runtime 모듈 연결.

## Runtime Shell / Deployment

- `main_dom_helper.js`: main DOM element lookup helper.
- `deployment_version_controller.js`: 배포 버전 확인, 갱신 보류, Service Worker 등록 controller.
- `update_history_controller.js`: 배포 업데이트 내역 modal controller.
- `mobile_control_layout_helper.js`: 모바일 Action button 원형 배치 helper.

## Selection / EditTarget

- `selection_state.js`: Setup / Action 선택 상태.
- `selection_palette_data.js`: 선택 가능한 part / effect palette 정의.
- `edit_target_helper.js`: `resolveEditTarget(context)` 공통 편집 대상 resolver.
- `panel_edit_state.js`: group edit 임시값과 Action multi-select focus 계산.
- `action_edit_state.js`: Action key별 editor-only 선택 / timeline / group edit 상태.
- `preview_state.js`: Timeline preview 상태.

## Editor Shell

- `editor_panel_controller.js`: 설정 패널 최상위 조립과 외부 API.
- `editor_panel_composition_helper.js`: panel 내부 controller 조립.
- `editor_panel_bootstrap_helper.js`: setting DOM element bootstrap.
- `editor_panel_dom_helper.js`: panel DOM 표시 / 작은 view helper.
- `editor_panel_binding_controller.js`: panel 버튼 / 입력 binding.
- `editor_panel_sync_helper.js`: panel 전체 sync.
- `editor_control_setup_controller.js`: tuning panel control 초기화.
- `editor_control_binding_controller.js`: tuning panel control event binding.
- `editor_lifecycle_controller.js`: actor 변경, panel open/close, lifecycle sync.
- `editor_workflow_controller.js`: Setup / Action / Effect / Stage workflow 전환.
- `editor_workflow_data.js`: workflow 기본 session 값.
- `editor_workflow_navigation_helper.js`: workflow navigation helper.
- `editor_shortcut_helper.js`: editor keyboard shortcut 판별.
- `editor_undo_data.js`: tuning undo snapshot.
- `editor_local_only_helper.js`: local-only 실행 guard.
- `settings_panel_state.js`: settings panel open/close state.
- `encouragement_bubble_view.js`: index 랭킹 메시지 응원 말풍선 DOM / 이동 controller.

## Setup / Action / Effect Authoring

- `part_editor_controller.js`: Setup / Action part 선택과 panel controller 연결.
- `action_authoring_controller.js`: Action 선택 / 생성 / 삭제 / 이름 / trigger UI.
- `action_authoring_data.js`: Action descriptor와 custom action data helper.
- `action_trigger_controller.js`: Action Trigger UI / 녹화 controller.
- `action_trigger_data.js`: Action trigger 저장값 / mode normalize data.
- `action_group_helper.js`: Action group 값과 label helper.
- `action_condition_helper.js`: Action condition 값과 label helper.
- `action_mirror_helper.js`: Action mirror 설정 helper.
- `action_blend_helper.js`: Action blend 설정 helper.
- `action_keyframe_target_helper.js`: Action start/end/custom keyframe target compatibility helper.
- `action_runtime_rule_helper.js`: Action Runtime Rule normalize / frame window helper.
- `action_timeline_edit_helper.js`: Action edit pivot normalize / sync helper.
- `pose_action_authoring_helper.js`: legacy pose/action authoring helper.
- `pose_action_authoring_controller.js`: legacy pose/action authoring controls.

## Timeline

- `timeline_controller.js`: 공통 timeline controller.
- `timeline_engine.js`: timeline frame / playback 핵심 계산.
- `timeline_state.js`: timeline selection state.
- `timeline_action_controller.js`: Action timeline UI controller.
- `timeline_effect_controller.js`: Effect timeline UI controller.
- `editor_timeline_section_controller.js`: settings panel timeline section wiring.
- `timeline_action_adapter.js`: Action timeline data adapter.
- `timeline_effect_adapter.js`: Effect timeline data adapter.
- `timeline_pose_adapter.js`: legacy pose timeline adapter.
- `timeline_pose_controller.js`: legacy pose timeline controller.
- `timeline_action_panel_view.js`: Action timeline DOM view.
- `timeline_effect_panel_view.js`: Effect timeline DOM view.
- `timeline_pose_panel_view.js`: legacy pose timeline DOM view.
- `timeline_view.js`: shared timeline view.
- `timeline_renderer.js`: timeline bar renderer.
- `timeline_keyframe_target_helper.js`: start / end / normal keyframe target compatibility helper.
- `timeline_frame_reader.js`: current frame reader.
- `timeline_keyframe_helper.js`: keyframe write / lookup helper.
- `timeline_action_helper.js`: action timeline small helper.
- `timeline_command_helper.js`: timeline add/delete/copy/paste commands.
- `timeline_selection_helper.js`: timeline selection commands.
- `timeline_drag_helper.js`: keyframe drag helper.
- `timeline_drag_control_helper.js`: timeline drag control helper.
- `timeline_preview_helper.js`: timeline preview play / sync helper.
- `timeline_playback_helper.js`: playback mode helper.
- `timeline_settings_helper.js`: timeline settings normalize / UI helper.
- `timeline_panel_sync_helper.js`: timeline panel sync helper.
- `timeline_clipboard_helper.js`: timeline clipboard helper.
- `timeline_control_helper.js`: timeline toolbar control helper.
- `timeline_dom_helper.js`: timeline DOM helper.
- `timeline_modifier_data.js`: modifier 저장 구조 helper.
- `timeline_adapter_contract_helper.js`: adapter contract validation helper.

## Transform / Property / Handle / Drag

- `transform_editor_controller.js`: Canvas drag controller.
- `transform_edit_state.js`: Canvas edit state factory.
- `transform_drag_factory.js`: drag object factory.
- `transform_drag_helper.js`: pointer drag lifecycle helper.
- `transform_drag_apply_helper.js`: drag 결과 적용 helper.
- `canvas_drag_math_helper.js`: canvas drag geometry math helper.
- `canvas_drag_state.js`: canvas drag state.
- `transform_refresh_helper.js`: drag 후 panel / preview refresh helper.
- `transform_value_helper.js`: Canvas visual value write / clamp helper.
- `transform_handle_geometry_helper.js`: active EditTarget handle geometry.
- `edit_handle_geometry_helper.js`: part / group / pivot handle geometry helper.
- `edit_handle_renderer.js`: handle renderer.
- `edit_handle_drawing_helper.js`: handle drawing helper.
- `editable_object_model_helper.js`: editable transform model helper.
- `editable_property_helper.js`: property 종류 / anchor pair helper.
- `property_value_helper.js`: Property 표시값 / 저장값 변환.
- `property_field_data.js`: Property field group definitions.
- `property_panel_controller.js`: Setup / Action Property panel 렌더/write controller.
- `effect_property_controller.js`: Effect Property card 렌더/write controller.
- `property_group_edit_helper.js`: group edit Property 값 적용 helper.
- `property_numeric_input_helper.js`: numeric input helper.
- `property_scrub_helper.js`: property scrub helper.
- `editor_scrub_helper.js`: shared scrub UI helper.
- `editor_card_panel_view.js`: shared editor card panel view.
- `control_value_transform_helper.js`: control value conversion helper.
- `number_input_helper.js`: number input clamp / sync helper.
- `group_transform_adapter.js`: group EditTarget 결과를 여러 part에 분배.
- `group_edit_state.js`: group 편집 중 임시 transform state.

## Interaction / Formula

- `interaction_editor_engine.js`: interaction card editor engine.
- `action_interaction_panel_controller.js`: Action interaction panel 연결 controller.
- `interaction_field_data.js`: collision / hurt / attack / guard option field definitions and defaults.
- `interaction_object_editor_controller.js`: interaction object edit source controller.
- `interaction_region_engine.js`: runtime interaction region 계산.
- `interaction_overlap_helper.js`: rect / polygon SAT / swept Interaction Region 순수 overlap 계산.
- `interaction_swept_region_helper.js`: 이전 / 현재 Interaction Region swept polygon helper.
- `action_modifier_panel_controller.js`: Action Formula panel 연결 controller.
- `formula_registry.js`: Formula module registry / normalize / migration.
- `formula_editor_engine.js`: Formula library / applied Formula card 공통 renderer.
- `formula_runtime_engine.js`: Runtime이 현재 frame의 Formula를 읽는 helper.
- `afterimage_runtime_helper.js`: 잔상 Formula runtime snapshot update / draw helper.
- `color_change_formula_runtime_helper.js`: 색변화 Formula runtime tint helper.
- `shake_formula_runtime_helper.js`: 흔들림 Formula runtime trigger helper.
- `zoom_formula_runtime_helper.js`: 확대 Formula runtime screen zoom resolver.
- `graph_picker_view.js`: Formula / modifier graph 선택 UI view.
- `formulas/cast_formula.js`: 시전 Formula definition.
- `formulas/ai_formula.js`: Enemy AI Action 등록 Formula definition.
- `formulas/cooldown_formula.js`: 쿨타임 Formula definition.
- `formulas/target_move_formula.js`: 목표이동 Formula definition.
- `formulas/velocity_formula.js`: 속도 Formula definition / editor / runtime metadata.
- `formulas/inertia_formula.js`: 관성 Formula definition.
- `formulas/afterimage_formula.js`: 잔상 Formula definition.
- `formulas/color_change_formula.js`: 색변화 Formula definition.
- `formulas/zoom_formula.js`: 화면 확대 Formula definition.
- `formulas/projectile_formula.js`: 포물선 투사체 Formula definition.
- `formulas/shake_formula.js`: 흔들림 Formula definition.
- `formulas/range_formula.js`: 사정거리 Formula definition.
- `formulas/lock_formula.js`: 고정 Formula definition.
- `formulas/blend_formula.js`: 보간 Formula definition.
- `formulas/cancel_formula.js`: 캔슬 Formula definition.
- `formulas/link_formula.js`: 연계 Formula definition.
- `formulas/formula_editor_fields.js`: Formula option field renderer helper.
- `modifier_editor_engine.js`: Effect legacy modifier library / applied modifier card engine.

## Runtime / Actor

- `actor_factory.js`: actor 생성.
- `actor_state.js`: player action runtime state reset / update helper.
- `actor_frame_state.js`: frame start / paused actor update helper.
- `actor_tuning_helper.js`: default tuning과 HP capacity sync.
- `actor_placement_helper.js`: actor placement / line-up helper.
- `actor_action_helper.js`: custom Action runtime advance helper.
- `actor_runtime_engine.js`: actor physics / state runtime update.
- `action_trigger_engine.js`: trigger matching과 custom Action start.
- `input_control_controller.js`: runtime input state controller.
- `run_actor_state.js`: 선택 Player, Runtime Enemy clone, Actor 정렬과 활성 Runtime Actor 목록 state.
- `run_lifecycle_controller.js`: Run 시작·종료·사망·결과·처치·점수 상태 전환 controller.
- `enemy_runtime_engine.js`: Enemy 방향, AI Action, cooldown, 활성 수와 respawn runtime engine.
- `combat_engine.js`: 근접·투사체 hit, guard, collision, damage와 reaction resolve.
- `death_ragdoll_engine.js`: actor 사망 시 파츠별 ragdoll 상태 생성 / 갱신 / 렌더.
- `projectile_runtime_engine.js`: 투사체 Formula runtime pool / 이동 / draw / attack region helper.
- `runtime_debug_state.js`: runtime debug ON/OFF, action snapshot, event buffer state.
- `roll_ghost_engine.js`: roll ghost update / draw.
- `particle_effects_engine.js`: dust / hit spark / death particle engine.
- `actor_pose_helper.js`: neutral pose helper.

## Runtime Flow Map

```text
Input
→ Trigger
→ Action Runtime
→ Run Lifecycle
→ Run Actor State
→ Enemy Runtime
→ Current Frame
→ Interaction Region
→ Combat
→ Render
→ Debug HUD
```

- Input: `input_control_controller.js` - keyboard/touch input을 `keys` / `pressed`로 모은다.
- Trigger: `action_trigger_engine.js` - Trigger match, Condition, interrupt를 보고 Action start를 결정한다.
- Action Runtime: `actor_action_helper.js`, `actor_runtime_engine.js` - Action 시간, physics, actor 상태를 갱신한다.
- Run Lifecycle: `run_lifecycle_controller.js` - Run 활성·사망·결과 상태와 생존 시간, 처치 수, 최종 점수를 전환한다.
- Run Actor State: `run_actor_state.js` - Preview base Actor와 Battle Player / Runtime Enemy roster를 제공한다.
- Enemy Runtime: `enemy_runtime_engine.js` - 전투 전·후 활성 수와 respawn, Enemy 방향·AI·cooldown을 처리한다.
- Current Frame: `actor_runtime_engine.js` - `actionKey`, `getActionFrameProgress()`, `getPartOffset()`로 현재 frame 값을 읽는다.
- Interaction Region: `interaction_region_engine.js` - 현재 Runtime frame에서 Attack/Hurt/Collision/Guard region을 계산한다.
- Overlap Geometry: `interaction_overlap_helper.js` - Combat 호출 안에서 rect / polygon SAT / swept overlap 결과만 계산한다.
- Combat: `combat_engine.js` - overlap 결과를 사용해 Combat Resolve, damage, guard, collision push를 처리한다.
- Render: `actor_renderer.js`, `actor_canvas_renderer.js` - actor와 edit/debug overlay를 그린다.
- Debug HUD: `runtime_debug_state.js`, `runtime_debug_hud_view.js` - Runtime snapshot과 최근 판정 이벤트를 표시한다.

중요:

- `player.hitRegions`는 Combat source가 아니다.
- `player.hitRegions`는 draw/edit/debug overlay용이다.
- Combat은 `interaction_region_engine.js`가 현재 Runtime frame에서 계산한 InteractionRegion을 읽고, `interaction_overlap_helper.js`에 순수 overlap 계산을 요청한다.

## Rendering / Camera / HUD

- `actor_renderer.js`: runtime actor renderer.
- `actor_canvas_renderer.js`: selected actor overlay renderer.
- `world_renderer.js`: world / background renderer.
- `background_renderer.js`: background layer renderer.
- `camera_view.js`: camera / view transform helper.
- `canvas_layout_helper.js`: canvas layout sync.
- `mobile_control_layout_helper.js`: 모바일 Action button layout 계산.
- `character_hud_layout_helper.js`: actor name / HP layout helper.
- `run_hud_view.js`: run HUD score / text sync.
- `runtime_debug_hud_view.js`: runtime debug HUD DOM view.
- `ranking_view.js`: ranking HUD and ranking DOM view.
- `ranking_controller.js`: ranking flow controller.
- `ranking_message_helper.js`: ranking message length / URL normalize helper.
- `score_format_helper.js`: score / survival time format helper.
- `puppet_player_geometry_helper.js`: puppet geometry / silhouette helper.
- `puppet_player_edit_region_helper.js`: puppet edit region / handle recorder.
- `puppet_player_debug_view.js`: puppet debug drawing.

## Stage / Background / Assets

- `background_panel_controller.js`: background panel controller.
- `background_panel_view.js`: background panel view.
- `stage_rules_controller.js`: stage rules controller.
- `stage_ai_panel_controller.js`: Stage 탭 Enemy AI settings panel controller.
- `enemy_ai_settings_helper.js`: Enemy AI action settings normalize / runtime resolver.
- `stage_rules_panel_controller.js`: stage rules panel input controller.
- `stage_rules_panel_renderer.js`: stage rules panel renderer.
- `stage_rules_state.js`: stage rules state / normalize.
- `scene_session_data.js`: scene session data / world physics sync.
- `asset_loader_helper.js`: asset load helper.
- `asset_refresh_helper.js`: local asset refresh helper.
- `editor_asset_controller.js`: Setup / Effect / Background asset button controller.
- `release_panel_controller.js`: 세팅 저장 상태, 베타 플레이와 검증 revision 공개 배포 UI controller.
- `local_api_helper.js`: local API request helper.
- `local_character_asset_storage_helper.js`: local character asset storage helper.
- `psd_background_helper.js`: PSD background helper; 로컬 background export는 `assets/backgrounds/current`만 사용.

## Save / Project / Data

- `project_state_controller.js`: project state controller.
- `project_storage_helper.js`: draft/beta/published 파일 로드, 로컬 저장 debounce/queue/flush helper.
- `deployment_version_controller.js`: 배포 version 확인과 안전한 reload controller.
- `update_history_controller.js`: `changelog.json` update history 표시 controller.
- `firebase_ranking_storage_helper.js`: Firebase ranking storage helper.
- `game_config_data.js`: game constants and config data.
- `character_group_data.js`: character group definitions.
- `player_default_rig_data.js`: default rig data.
- `player_default_tuning_data.js`: default tuning data.
- `animation_frame_data.js`: frame default data.
- `project_data_normalizer_helper.js`: project data normalize helper.
- `part_source_data.js`: part source registry data.
- `motion_field_data.js`: motion field row definitions.
- `firebase_config_data.js`: 공개 랭킹용 Firebase config data.
- `editor_label_helper.js`: editor label helper.
- `editor_debug_view.js`: editor debug view.
- `editor_layer_order_helper.js`: layer order helper.
- `panel_feedback_view.js`: panel feedback view.
- `common_helper.js`: shared generic helpers.

## 보류 파일

- 없음. 현재 entry와 queue 파일을 제외한 `src/*.js`는 snake_case와 역할 접미사를 따른다. `formula_registry.js`는 `_registry` 역할을 사용한다.

## 검색 힌트

- Edit target: `edit_target_helper.js`
- Property 값 변환: `property_value_helper.js`
- Canvas drag: `transform_editor_controller.js`, `transform_drag_helper.js`
- Timeline 현재 frame: `timeline_frame_reader.js`
- Project normalize: `project_data_normalizer_helper.js`
- Runtime trigger: `action_trigger_engine.js`
- Run Actor roster: `run_actor_state.js`
- Run 시작 / 종료 / 사망 / 결과 / 점수 상태: `run_lifecycle_controller.js`
- Overlap geometry: `interaction_overlap_helper.js`
- Enemy direction / AI / active count / respawn: `enemy_runtime_engine.js`
- Combat Resolve / damage / reaction: `combat_engine.js`
- Deployment update: `deployment_version_controller.js`, `update_history_controller.js`

## Local Release Tools

- `tools/release_snapshot.py`: 이미지 hash snapshot, beta 저장과 revision 검증 promotion.
- `tools/release_publisher.py`: 검증한 beta만 Git 커밋/push하는 Pages 배포 경계.
- `tools/migrate_firebase_assets.py`: 기존 Firebase 공개 데이터·이미지의 읽기 전용 초기 이전 도구.
- `tools/backup_firebase_storage.py`: 기존 프로젝트 Storage prefix 전체의 읽기 전용 백업 도구.
- `release.config.json`: 기존 Pages 배포 remote, branch, URL.

## 기능별 리팩토링 모듈

- `action_movement_formula_helper.js`: 이동 속도·목표 이동 수식과 프레임 누적 계산.
- `action_runtime_data_helper.js`: Action Runtime용 데이터 복사와 키 판별.
- `actor_runtime_pose_helper.js`: 자세 보간·blend·frame 구간 계산.
- `combat_cache_helper.js`: 현재 frame별 판정 region cache.
- `combat_collision_helper.js`: Actor overlap과 충돌 밀어내기.
- `combat_reaction_helper.js`: 피격·방어 반응과 reaction 상태.
- `combat_rule_helper.js`: 데미지·가드·충돌 규칙 계산.
- `editor_character_asset_controller.js`: 캐릭터 생성·PSD 갱신·이동·복사·삭제 처리.
- `editor_character_asset_view.js`: 캐릭터 메뉴와 생성 폼, 이벤트 binding.
- `editor_effect_asset_controller.js`: 이펙트 에셋 선택·업로드·갱신 처리.
- `editor_entry.js`: 로컬 guard 이후 Editor main 시작.
- `interaction_object_model_data.js`: Editor/Runtime 공용 Interaction 모델.
- `panel_button_action_helper.js`: 공통 비동기 버튼 상태와 오류 표시.
- `project_action_normalizer_helper.js`: Action과 frame schema 정규화.
- `project_effect_normalizer_helper.js`: 이펙트 definition과 source 정규화.
- `project_interaction_normalizer_helper.js`: Interaction region과 rule 정규화.
- `project_keys_normalizer_helper.js`: 프로젝트 필드 key 분류.
- `project_object_merge_helper.js`: 객체 merge/replace 공통 연산.
- `project_rig_normalizer_helper.js`: rig와 파츠 schema 정규화.
- `project_runtime_loader.js`: snapshot에서 actor/effect/background 실행 데이터 조립.
- `project_save_queue.js`: 순차 저장, 동시 변경, 실패 재시도와 dirty 관리.

## API / 저장 복구 도구

- `tools/background_asset_api.py`, `tools/character_asset_api.py`, `tools/effect_asset_api.py`: 도메인별 로컬 에셋 API.
- `tools/asset_source_store.py`: 업로드 원본 보관과 변환 결과 교체.
- `tools/file_transaction.py`: 파일 묶음 rollback, Git 상태 확인과 시작 시 복구.

## 강화 아이콘과 현황 UI

- `upgrade_card_data.js`: 카드 10종 metadata와 누적 효과 표시.
- `run_upgrade_state.js`: 선택/미선택 양쪽 횟수와 새 판 reset.
- `upgrade_hud_view.js`: 내/적 아이콘, 횟수와 클릭 상세 UI.
- `upgradeHud.css`: 현황 UI 반응형 스타일.
- `dev/upgrade-icons.html`: 로컬 조작 가능한 미리보기. 아이콘/현황 조작 미리보기. 실제 전투는 main에서 별도 연결.

## 보스 강화 실행

- `run_upgrade_controller.js`: 보스 선택 queue, 랜덤 쌍, pause/reset와 양쪽 적용.
- `run_upgrade_effect_helper.js`: runtime 배율, health/판정/이동과 원본 설정 보호.
- `run_upgrade_timing_helper.js`: 활성 판정 프레임에서 공격 단계 경계와 시간 배율 계산.
- `upgrade_choice_view.js`: 카드 선택 dialog와 키보드 focus.

- `actor_health_helper.js`: 수치 HP, 기존 칸 데이터 호환, 지연 피해 바/10 HP 눈금.

- `health_drop_controller.js`: 잡몹 조각의 확률 하트 변환, 비행/착지/접근 10 HP 회복, 만료와 판 초기화.

- `experience_controller.js`: 흰 구슬/경험치/레벨업 대기와 기술별 판 상태.
- `experience_view.js`: 경험치 표시와 기술 4개 선택.
- `skill_runtime_helper.js`: 세팅용 기술 액션 준비, 해금/공중 점프 제한/패링/회피/4타 강화.

- `pickup_magnet_helper.js`: 착지 후 거리별 유인과 도착 판정.

- `charge_attack_helper.js`: 기술 습득 후 Q 짧은 입력/충전/놓기와 취소.

- `combat_audio_player.js`: 로컬 CC0 WAV 로딩/디코딩, 음량/동시 재생 제한, 제스처 해제/음소거.
- `combat_sound_controller.js`: 공격 판정 시작과 실제 피해/방어/패링에 전투음 연결.

- `game_music_controller.js`: 플레이 OST 반복 재생/정지, 낮은 볼륨/음소거, 배경 탭 재생 제어.
