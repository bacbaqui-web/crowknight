# 10_SRC_MAP.md

이 문서는 어느 파일을 수정해야 하는지 찾기 위한 지도다.

## 가장 자주 수정하는 파일

★★★★★

- `src/tuningPanel.js`: Tool shell과 apply/save bridge.
- `src/tuningParts.js`: editable part source와 InteractionBox limits.
- `src/tuningPanelPartController.js`: Setup/Action selection과 property write.
- `src/canvasVisualValues.js`: canvas/property 표시값을 저장값으로 변환.
- `src/tuningNormalize.js`: tuning schema normalize.
- `src/tuningPanelCanvasController.js`: canvas pointer/edit/apply flow.

## App / Runtime Entry

- `src/main.js`: 게임 루프 조립. 수정: Runtime flow 변경. 같이: `actorFactory.js`, `worldRenderer.js`, `combatSystem.js`. 위험: 높음.
- `src/mainDomElements.js`: Runtime DOM 조회. 수정: `index.html` id 변경. 같이: `main.js`. 위험: 낮음.
- `src/gameConfig.js`: key/constant/path 정의. 수정: action/part/tuning field 추가. 같이: normalize, timeline, save. 위험: 높음.
- `src/inputControls.js`: Runtime input state. 수정: 조작키 변경. 같이: `main.js`, `puppetPlayerActions.js`. 위험: 중간.
- `src/utils.js`: 공통 helper. 수정: 작은 순수 helper 추가. 같이: 호출 파일. 위험: 중간.

## Actor / Runtime State

- `src/actorFactory.js`: actor 생성. 수정: actor 초기화/apply 변경. 같이: `actorState.js`, `tuningNormalize.js`. 위험: 높음.
- `src/actorState.js`: actor collection state. 수정: actor 목록/선택 구조 변경. 같이: `actorFactory.js`. 위험: 중간.
- `src/actorTuning.js`: actor tuning helper. 수정: tuning 복제/초기화 변경. 같이: `playerDefaultTuning.js`, `tuningNormalize.js`. 위험: 중간.
- `src/actorFrameState.js`: frame별 actor state. 수정: Runtime frame 계산 변경. 같이: `actorRenderer.js`. 위험: 중간.
- `src/actorPlacement.js`: actor 위치 배치. 수정: spawn/preview 위치 변경. 같이: `actorFactory.js`. 위험: 중간.
- `src/actorRenderer.js`: actor render 조립. 수정: actor draw 순서 변경. 같이: `puppetPlayerRenderer.js`, `actorHudRenderer.js`. 위험: 중간.

## Puppet Player / Runtime Geometry

- `src/puppetPlayer.js`: player Runtime state. 수정: tuning 적용, Runtime action state. 같이: `combatSystem.js`, `puppetPlayerPose.js`, `interactionBoxRuntime.js`. 위험: 높음.
- `src/interactionBoxRuntime.js`: InteractionBox Runtime region 계산. 수정: 판정 geometry 계산, role별 region 확장. 같이: `puppetPlayer.js`, `combatSystem.js`. 위험: 높음.
- `src/tuningInteractionBoxes.js`: InteractionBox key/role/parent helper. 수정: Editor/Runtime box source 경계. 같이: `tuningNormalize.js`, `interactionBoxRuntime.js`. 위험: 높음.
- `src/puppetPlayerActions.js`: action 전환. 수정: Runtime action rules. 같이: `inputControls.js`, `gameConfig.js`. 위험: 중간.
- `src/puppetPlayerPose.js`: pose transform 계산. 수정: Setup base + Action keyframe 합성. 같이: `poseTimelineAdapter.js`, `animationFrames.js`. 위험: 높음.
- `src/puppetPlayerRenderer.js`: rig part 렌더와 edit region 기록. 수정: part/InteractionBox render/edit region. 같이: `puppetPlayerGeometry.js`, `puppetPlayerEditRegions.js`. 위험: 높음.
- `src/puppetPlayerGeometry.js`: part geometry 계산. 수정: 좌표계/anchor/quad 계산. 같이: `puppetPlayerRenderer.js`, `editHandleGeometry.js`. 위험: 높음.
- `src/puppetPlayerEditRegions.js`: editor hit region 기록. 수정: image-less part region 추가. 같이: `puppetPlayerRenderer.js`, `tuningEditHandleGeometry.js`. 위험: 높음.
- `src/puppetPlayerDebug.js`: player debug helper. 수정: debug 표시. 같이: `settingsDebugRenderer.js`. 위험: 낮음.

## Rendering / World

- `src/worldRenderer.js`: world draw 조립. 수정: Runtime draw pipeline. 같이: `backgroundRenderer.js`, `actorRenderer.js`. 위험: 중간.
- `src/backgroundRenderer.js`: background draw. 수정: 배경 렌더/transform. 같이: `backgroundPanelController.js`, `psdBackgroundRuntime.js`. 위험: 중간.
- `src/cameraView.js`: camera transform. 수정: screen/world 좌표계. 같이: `worldRenderer.js`. 위험: 중간.
- `src/screenGeometry.js`: screen geometry helper. 수정: 순수 geometry helper. 같이: 호출 파일. 위험: 낮음.
- `src/actorEffectsRenderer.js`: actor effect draw. 수정: Runtime effect 표시. 같이: `effectTimelineAdapter.js`. 위험: 중간.
- `src/actorHudRenderer.js`: actor HUD draw. 수정: 이름/HP 표시. 같이: `characterHudLayout.js`. 위험: 중간.
- `src/runHud.js`: game HUD. 수정: Runtime HUD/score UI. 같이: `scoreFormat.js`. 위험: 낮음.
- `src/runSpeedMotion.js`: speed motion helper. 수정: Runtime speed visual. 같이: `puppetPlayerPose.js`. 위험: 중간.
- `src/rollGhosts.js`: roll ghost visual. 수정: 구르기 잔상. 같이: `puppetPlayerActions.js`. 위험: 낮음.
- `src/particleEffects.js`: particle Runtime. 수정: particle 효과. 같이: `actorEffectsRenderer.js`. 위험: 중간.

## Combat / Ranking

- `src/combatSystem.js`: Runtime combat. 수정: damage/overlap/reaction. 같이: `combatGeometry.js`, `puppetPlayer.js`. 위험: 높음.
- `src/combatGeometry.js`: combat geometry. 수정: box overlap math. 같이: `combatSystem.js`. 위험: 중간.
- `src/scoreFormat.js`: score formatting. 수정: score text. 같이: `runHud.js`, `rankingUi.js`. 위험: 낮음.
- `src/rankingController.js`: ranking flow. 수정: ranking load/save. 같이: `firebaseRankings.js`, `rankingUi.js`. 위험: 중간.
- `src/rankingUi.js`: ranking DOM. 수정: ranking 표시. 같이: `rankingController.js`. 위험: 낮음.
- `src/rankingCanvas.js`: ranking canvas. 수정: result canvas 표시. 같이: `rankingController.js`. 위험: 낮음.

## Assets / Save / Firebase

- `src/assetLoaders.js`: asset load helper. 수정: 이미지/PSD 로딩. 같이: asset runtime files. 위험: 중간.
- `src/characterPsdRuntime.js`: character PSD asset. 수정: 캐릭터 PSD 처리. 같이: `tuningPanelAssetActions.js`. 위험: 중간.
- `src/effectAssetRuntime.js`: effect asset. 수정: 효과 이미지 처리. 같이: `tuningEffectTimelineController.js`. 위험: 중간.
- `src/psdBackgroundRuntime.js`: background PSD asset. 수정: 배경 PSD 처리. 같이: `backgroundPanelController.js`. 위험: 중간.
- `src/saveStateStorage.js`: local save. 수정: local 저장 키/형식. 같이: `projectStateController.js`. 위험: 높음.
- `src/projectStateController.js`: project save/load. 수정: 저장/불러오기 흐름. 같이: Firebase/storage files. 위험: 높음.
- `src/firebaseConfig.js`: Firebase config. 수정: Firebase 설정. 같이: Firebase files. 위험: 중간.
- `src/firebaseProjectState.js`: Firebase project state. 수정: remote project save/load. 같이: `projectStateController.js`. 위험: 높음.
- `src/firebaseStorageAssets.js`: Firebase asset storage. 수정: asset upload/download. 같이: asset runtime files. 위험: 중간.
- `src/firebaseRankings.js`: Firebase rankings. 수정: ranking remote sync. 같이: `rankingController.js`. 위험: 낮음.

## Defaults / Normalize / Data

- `src/playerDefaultTuning.js`: tuning defaults. 수정: actor 기본 schema. 같이: `tuningNormalize.js`, `playerDefaultRig.js`. 위험: 높음.
- `src/playerDefaultRig.js`: rig defaults. 수정: 기본 part/InteractionBox 배치. 같이: `tuningParts.js`, `tuningNormalize.js`. 위험: 높음.
- `src/tuningNormalize.js`: tuning normalize. 수정: 저장 schema 보정. 같이: defaults, timeline adapters. 위험: 높음.
- `src/animationFrames.js`: frame defaults/interpolation. 수정: pose/effect frame schema. 같이: timeline mutation/read files. 위험: 높음.
- `src/characterHudLayout.js`: HUD layout. 수정: 이름/HP 위치 계산. 같이: `actorHudRenderer.js`, setup controls. 위험: 중간.
- `src/sceneSession.js`: scene session data. 수정: background/stage session schema. 같이: stage/background files. 위험: 중간.

## Setup / Fields / Selection

- `src/tuningParts.js`: editable part source. 수정: part/InteractionBox source/limits. 같이: `tuningInteractionBoxes.js`, field files. 위험: 높음.
- `src/tuningSelectionPalette.js`: Setup palette definitions. 수정: 선택 대상/배치. 같이: labels, part controller. 위험: 중간.
- `src/tuningLabels.js`: UI labels. 수정: 표시명 변경. 같이: palette/field views. 위험: 낮음.
- `src/tuningFieldGroups.js`: property group definitions. 수정: property field 추가/제거. 같이: field values, controllers. 위험: 중간.
- `src/tuningFieldValues.js`: property display/store 변환. 수정: 숫자 표시값/저장값. 같이: `actionBaseTransform.js`, `canvasVisualValues.js`. 위험: 높음.
- `src/tuningControlValueTransforms.js`: control clamp/transform. 수정: scalar 입력 범위. 같이: control setup. 위험: 중간.
- `src/tuningNumberInputs.js`: legacy numeric helper. 수정: 기존 number input. 같이: `tuningNumericInput.js`. 위험: 중간.
- `src/tuningNumericInput.js`: range/number UX. 수정: 공통 numeric input. 같이: setup controls, scrub controls. 위험: 중간.
- `src/tuningMotionFieldRows.js`: motion row definitions. 수정: Action motion fields. 같이: pose controller/settings. 위험: 중간.
- `src/tuningScrubControls.js`: scrub property inputs. 수정: property input UI. 같이: numeric helper, field groups. 위험: 중간.

## Tool Shell / Panel

- `src/tuningPanel.js`: Tool shell. 수정: 최상위 조립/apply/save bridge. 같이: composition, sync, controllers. 위험: 높음.
- `src/tuningPanelBootstrap.js`: panel bootstrap. 수정: panel open/close. 같이: `tuningPanel.js`. 위험: 낮음.
- `src/tuningPanelComposition.js`: controller composition. 수정: controller 생성/연결. 같이: 각 controller. 위험: 중간.
- `src/tuningPanelDom.js`: panel DOM helpers. 수정: `setting.html` id/class. 같이: views/controllers. 위험: 중간.
- `src/tuningPanelBindings.js`: panel binding wrapper. 수정: high-level event binding. 같이: control bindings. 위험: 중간.
- `src/tuningPanelControlBindings.js`: control events. 수정: 버튼/입력 event 연결. 같이: control setup, controllers. 위험: 중간.
- `src/tuningPanelControlSetup.js`: setup controls. 수정: 캐릭터/HP/scale/HUD controls. 같이: numeric input, field paths. 위험: 중간.
- `src/tuningPanelButtonAction.js`: button helper. 수정: 단순 button action. 같이: bindings. 위험: 낮음.
- `src/tuningPanelAssetActions.js`: asset actions. 수정: upload/download. 같이: asset runtime, project state. 위험: 중간.
- `src/tuningPanelShortcuts.js`: shortcuts. 수정: keyboard shortcut. 같이: timeline/selection controllers. 위험: 중간.
- `src/tuningPanelDebugView.js`: debug view. 수정: setting debug UI. 같이: settings debug renderer. 위험: 낮음.
- `src/settingsDebugRenderer.js`: setting debug draw. 수정: InteractionBox/attack debug 표시. 같이: `tuningInteractionBoxes.js`, `interactionBoxRuntime.js`. 위험: 중간.
- `src/settingsPanelState.js`: panel section state helper. 수정: open section/edit context 판단. 같이: workflow controller. 위험: 중간.

## Panel State / Workflow

- `src/tuningPanelSelectionState.js`: selection state owner. 수정: active selection 값. 같이: part controller. 위험: 중간.
- `src/tuningPanelEditingState.js`: edit focus owner. 수정: edit focus 값. 같이: canvas/part controller. 위험: 중간.
- `src/tuningPanelGroupEditState.js`: group edit state. 수정: multi-part edit values. 같이: group pose edit. 위험: 중간.
- `src/tuningPanelUndoState.js`: undo state. 수정: undo snapshot 경계. 같이: apply/save controllers. 위험: 높음.
- `src/tuningPanelWorkflow.js`: workflow metadata. 수정: session/section mapping. 같이: workflow controller/navigation. 위험: 중간.
- `src/tuningPanelWorkflowSessionState.js`: active session owner. 수정: session state. 같이: workflow controller. 위험: 낮음.
- `src/tuningPanelWorkflowNavigation.js`: session nav. 수정: workflow navigation UI. 같이: workflow metadata. 위험: 중간.
- `src/tuningPanelWorkflowController.js`: workflow lifecycle. 수정: session enter/exit/filter/sync. 같이: panel sync. 위험: 중간.
- `src/tuningPanelSync.js`: panel sync. 수정: actor/tuning UI sync. 같이: controllers/views. 위험: 높음.
- `src/tuningPanelLifecycleController.js`: actor lifecycle. 수정: actor select/add/delete/name. 같이: actor state, apply/save. 위험: 중간.

## Canvas / Edit Handles

- `src/tuningPanelPartController.js`: part/property controller. 수정: Setup/Action selection/property write. 같이: field groups/values, timeline. 위험: 높음.
- `src/tuningPanelLayerOrder.js`: layer order UI. 수정: layer drag reorder. 같이: rig/layer data. 위험: 중간.
- `src/tuningPanelCanvasController.js`: canvas controller. 수정: pointer/edit/apply flow. 같이: canvas drag files, handle geometry. 위험: 높음.
- `src/tuningCanvasEditState.js`: edit target state. 수정: drag target/base 선택. 같이: part sources, timeline. 위험: 높음.
- `src/tuningCanvasDragFactory.js`: drag object factory. 수정: drag state shape. 같이: pointer drag, drag apply. 위험: 중간.
- `src/tuningCanvasPointerDrag.js`: pointer drag lifecycle. 수정: pointer UX/release. 같이: canvas controller, drag apply. 위험: 높음.
- `src/canvasDragApply.js`: drag delta apply. 수정: move/resize/rotate 계산. 같이: canvas values, drag math. 위험: 높음.
- `src/canvasDragMath.js`: drag math. 수정: 좌표/벡터 math. 같이: drag apply. 위험: 중간.
- `src/canvasDragState.js`: drag start values. 수정: start visual/store pick. 같이: canvas values. 위험: 중간.
- `src/canvasLayout.js`: canvas layout. 수정: canvas size/layout. 같이: main/settings canvas code. 위험: 낮음.
- `src/canvasVisualValues.js`: canvas value write. 수정: visual value → 저장값. 같이: field values, part sources. 위험: 높음.
- `src/editHandleGeometry.js`: handle geometry. 수정: handle 위치/크기/hit test. 같이: tuning handle geometry. 위험: 높음.
- `src/tuningEditHandleGeometry.js`: current handle source. 수정: focus별 handle source 선택. 같이: InteractionBox parts, edit handle geometry. 위험: 높음.
- `src/editHandleDrawing.js`: handle draw style. 수정: cursor/style. 같이: handle renderer. 위험: 낮음.
- `src/editHandleRenderer.js`: handle render. 수정: canvas handle 표시. 같이: handle geometry. 위험: 중간.
- `src/panelEditState.js`: selection helper. 수정: focus transition helper. 같이: part controller. 위험: 낮음.

## Action / Timeline

- `src/actionBaseTransform.js`: Action display transform. 수정: Setup base 대비 Action 표시값. 같이: field values, pose adapter. 위험: 높음.
- `src/tuningPoseTimelineController.js`: Action timeline controller. 수정: Action Timeline UX/property. 같이: pose adapter, timeline core. 위험: 높음.
- `src/poseTimelineAdapter.js`: poseOffsets adapter. 수정: Action data read/write. 같이: timeline mutations/read, game config. 위험: 높음.
- `src/tuningPoseTimelinePanelView.js`: Action timeline view. 수정: toolbar/settings UI. 같이: pose controller. 위험: 중간.
- `src/tuningGroupPoseEdit.js`: group pose edit. 수정: multi-part Action transform. 같이: canvas controller, group state. 위험: 중간.
- `src/tuningPanelTimelineFrameActions.js`: timeline action wiring. 수정: panel-level frame actions. 같이: timeline controllers. 위험: 낮음.
- `src/tuningPanelTimelines.js`: timeline composition. 수정: pose/effect timeline 생성. 같이: timeline controllers. 위험: 중간.
- `src/tuningTimelineAccessors.js`: timeline accessors. 수정: timeline bridge 값. 같이: panel/timeline controllers. 위험: 낮음.
- `src/tuningTimelineDom.js`: timeline DOM helper. 수정: timeline DOM query/render helper. 같이: timeline renderer. 위험: 낮음.
- `src/tuningTimelinePanelSync.js`: timeline panel sync. 수정: timeline UI sync. 같이: timeline controllers. 위험: 중간.
- `src/tuningTimelinePlaybackControls.js`: playback controls. 수정: play/stop controls. 같이: timeline preview. 위험: 중간.
- `src/tuningTimelinePreview.js`: timeline preview. 수정: Action/Effect preview clock. 같이: pose/effect controllers. 위험: 중간.
- `src/tuningTimelineSettings.js`: timeline settings write. 수정: duration/playback settings. 같이: adapters/normalize. 위험: 중간.
- `src/timelineAdapterContract.js`: adapter contract. 수정: common timeline API. 같이: pose/effect adapters. 위험: 높음.
- `src/timelineController.js`: timeline factory. 수정: common timeline behavior. 같이: all timeline files. 위험: 높음.
- `src/timelineControllerCore.js`: timeline core wrapper. 수정: core state/action wrapper. 같이: timeline controller. 위험: 높음.
- `src/timelineControllerActions.js`: timeline mutation actions. 수정: add/delete/move flow. 같이: mutations, undo. 위험: 높음.
- `src/timelineControllerSelectionControls.js`: timeline selection. 수정: frame/keyframe selection. 같이: timeline state/view. 위험: 중간.
- `src/timelineControllerClipboardControls.js`: timeline clipboard controls. 수정: copy/paste flow. 같이: frame clipboard. 위험: 중간.
- `src/timelineControllerContract.js`: controller contract. 수정: controller API 검증. 같이: timeline controller. 위험: 높음.
- `src/timelineControllerView.js`: timeline view binding. 수정: timeline DOM events. 같이: renderer, drag controls. 위험: 중간.
- `src/timelineDragControls.js`: keyframe drag. 수정: timeline keyframe drag UX. 같이: controller view/actions. 위험: 중간.
- `src/timelineFrameClipboard.js`: frame clipboard. 수정: pose/effect copy/paste payload. 같이: mutations/adapters. 위험: 중간.
- `src/timelineFrameRead.js`: frame read. 수정: current/interpolated frame read. 같이: animation frames. 위험: 높음.
- `src/timelineKeyframeMutations.js`: keyframe mutations. 수정: keyframe write/reset schema. 같이: adapters/normalize. 위험: 높음.
- `src/timelineRenderer.js`: timeline render. 수정: track/keyframe DOM. 같이: controller view. 위험: 중간.
- `src/timelineState.js`: timeline state. 수정: selection/playhead state. 같이: timeline core. 위험: 중간.

## Effect Editor

- `src/tuningEffectTimelineController.js`: Effect timeline controller. 수정: Effect UX/property. 같이: effect adapter/view/assets. 위험: 높음.
- `src/effectTimelineAdapter.js`: effectOffsets adapter. 수정: Effect data read/write. 같이: mutations/read. 위험: 높음.
- `src/tuningEffectTimelinePanelView.js`: Effect view. 수정: Effect toolbar/settings/image UI. 같이: effect controller. 위험: 중간.
- `src/effectVisualValues.js`: Effect value transform. 수정: Effect display/store values. 같이: effect controller. 위험: 중간.
- `src/settingsEffectPreviewRenderer.js`: setting effect preview. 수정: Effect preview draw. 같이: effect renderer/controller. 위험: 중간.

## Background / Stage

- `src/backgroundPanelController.js`: Background panel. 수정: background edit/upload. 같이: scene session, background view. 위험: 중간.
- `src/backgroundPanelView.js`: Background view. 수정: background DOM. 같이: background controller. 위험: 낮음.
- `src/stageRulesState.js`: StageRules state/schema. 수정: StageRules defaults/normalize. 같이: selectors/controller. 위험: 중간.
- `src/stageRulesSelectors.js`: StageRules selectors. 수정: read-only rule access. 같이: state/controller. 위험: 낮음.
- `src/stageRulesController.js`: StageRules controller. 수정: Editor API for StageRules. 같이: state/selectors/panel controller. 위험: 중간.
- `src/stageRulesPanelDefinitions.js`: Stage panel definitions. 수정: Stage panel/field definitions. 같이: renderer/controller. 위험: 낮음.
- `src/stageRulesPanelRenderer.js`: Stage panel renderer. 수정: definition-based UI render. 같이: definitions. 위험: 중간.
- `src/stageRulesPanelController.js`: Stage panel binding. 수정: rendered panel event binding. 같이: controller/definitions. 위험: 중간.

## Preview / Playback

- `src/previewState.js`: preview object. 수정: preview state shape. 같이: timeline preview. 위험: 낮음.
- `src/previewPlayback.js`: preview timing. 수정: preview playback timing. 같이: timeline preview. 위험: 중간.
- `src/tuningPlayback.js`: tuning playback helper. 수정: tool playback behavior. 같이: timeline preview. 위험: 중간.
- `src/tuningRunMotionLink.js`: run motion link. 수정: tuning motion → Runtime motion bridge. 같이: motion fields, runtime motion. 위험: 중간.
