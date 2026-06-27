# Crow Knight 제작툴 Architecture

## 1. 문서 역할

이 문서는 Crow Knight 제작툴의 공식 Architecture 문서다.

유지하는 내용:

- 프로젝트 목표
- 개발 원칙
- 현재 Milestone
- 현재 구조
- 현재 우선순위
- 현재 위험 요소
- 다음 Sprint 목표

기록하지 않는 내용:

- 과거 Sprint 기록
- 리팩토링 과정
- 완료 과정
- 장문의 변경 이력

변경 이력은 Git이 관리한다. 이번 Sprint의 작업 보고는 `docs/CURRENT_SPRINT.md`만 사용한다.

## 2. 프로젝트 목표

`setting.html`은 단순 설정 화면이 아니라 횡스크롤 액션 로그라이트를 제작하는 툴이다.

최종 구성:

- `setting.html`: 캐릭터, 동작, 시각 효과, 스테이지를 제작하는 툴 화면
- `index.html`: 제작툴에서 만든 데이터를 실행하는 플레이 화면
- `src`: 현재는 툴 런타임, 게임 런타임, 공통 엔진 코드가 함께 존재
- `assets`: 캐릭터, 시각 효과, 배경 등 제작 리소스

장기 목표:

- 제작툴 안정성을 게임 기능 추가보다 우선한다.
- 툴 전용 코드, 게임 실행 코드, 공통 엔진 코드를 점진적으로 분리한다.
- 파츠 애니메이션, 시각 효과, 히트박스, 배경 이벤트는 모두 타임라인 트랙으로 다룰 수 있어야 한다.
- 설정 상태는 저장/마이그레이션 가능해야 하며, 파일 에셋은 Firebase Storage 참조를 기준으로 한다.

## 3. 핵심 개발 원칙

- 현재 동작 보존을 우선한다.
- 큰 이동보다 작은 owner, adapter, controller 분리로 경계를 넓힌다.
- 같은 UI 패턴은 같은 내부 시스템을 사용한다.
- 새 기능은 기존 거대 컨트롤러에 덧붙이기보다 적절한 도메인 모듈에 추가한다.
- HTML 대규모 이동과 Tool/Game/Engine 폴더 이동은 별도 Sprint에서만 진행한다.
- 공식 Architecture 문서는 현재 상태만 기록한다.

## 4. 제작 Workflow

현재 Milestone은 `Milestone 3: Workflow Editor`다.

제작 흐름:

1. Setup
2. Animation
3. Effect
4. Stage
5. Save/Play Check

### 4.1 Session별 패널

| Session   | 현재 패널                    | `data-section`               | 역할                                             |
| --------- | ---------------------------- | ---------------------------- | ------------------------------------------------ |
| Setup     | 전체, 파츠 위치, 레이어 순서 | `collision`, `part`, `layer` | 캐릭터 정체성, PSD/rig, 크기, 기준점, HP, hitbox |
| Animation | 동작                         | `pose`                       | 동작/스킬별 파츠 키프레임과 motion setting       |
| Effect    | 효과                         | `effect`                     | 시각 효과 이미지, 효과 키프레임, 타이밍          |
| Stage     | 배경                         | `scene`                      | 배경 PSD/clip, background layer list             |
| Common    | 저장 액션, 캔버스 preview    | header, `#game`              | 저장/다운로드, 현재 편집 결과 확인               |

현재 Stage는 배경 패널만 가진다. 진행 규칙, 적 성장, 카드 보상, 점수 규칙 패널은 아직 없다.

### 4.2 Workflow 구현 상태

관련 파일:

- `src/tuningPanelWorkflow.js`
- `src/tuningPanelWorkflowSessionState.js`
- `src/tuningPanelWorkflowNavigation.js`
- `src/tuningPanelSync.js`
- `src/tuningPanel.js`

현재 상태:

- Workflow Session은 `setup`, `animation`, `effect`, `stage` 중 하나다.
- Active Session은 `createTuningPanelWorkflowSessionState()`가 값 저장만 담당한다.
- Navigation은 `createTuningPanelWorkflowNavigation()`이 동적으로 만든다.
- Panel에는 `data-workflow-session`, `data-workflow-active-session`, `data-workflow-session-active`, `data-workflow-session-visible` metadata가 반영된다.
- Filtering mode는 `metadata`, `hidden`, `disabled`로 확장 가능하다.
- 현재 기본은 `metadata` 모드이며, 실제 숨김/비활성 UI 정책은 다음 Sprint에서 결정한다.
- Session 변경 시 `panelSync.syncSession(activeSession)`으로 필요한 패널만 sync할 수 있다.

## 5. 현재 코드 구조

### 5.1 Tool Shell

중심 파일:

- `src/tuningPanel.js`

현재 역할:

- Tool Shell의 최상위 조립
- selected actor bridge
- undo state 생성과 callback 주입
- asset/save action 연결
- keyboard shortcut 연결
- edit handle state 일부 보관

분리된 주변 모듈:

- `src/tuningPanelBootstrap.js`: panel DOM 조회와 shell toggle sync
- `src/tuningPanelComposition.js`: timeline, part, canvas, lifecycle, background controller 조립
- `src/tuningPanelControlBindings.js`: control callback map과 DOM event binding 진입점
- `src/tuningPanelSync.js`: actor/tuning/controller 상태 기반 panel sync
- `src/tuningPanelAssetActions.js`: asset upload/download action 연결
- `src/tuningPanelShortcuts.js`: keyboard shortcut 처리

### 5.2 Panel State Owner

값 저장 전용 owner:

- `src/tuningPanelSelectionState.js`
  - `activePartKey`
  - `activePartKeyGlobal`
  - `activePosePartKey`
  - `editContext`
  - pose part selection API: `clear`, `toggle`, `selectOnly`, `has`, `size`, `values`, `forEach`
- `src/tuningPanelEditingState.js`
  - `editFocusContext`
  - `editFocusPartKey`
- `src/tuningPanelGroupEditState.js`
  - `groupEditValues`
  - `getValues`, `setValues`, `resetValues`, `resetTransformValues`
- `src/tuningPanelWorkflowSessionState.js`
  - active workflow session

아직 `tuningPanel.js`에 남은 상태:

- `selectedActor`
- `editHandleHover`
- `editHandleActiveMode`
- `poseFrameSelectionActive`
- `effectEditHandle`
- shortcut bridge refs
- controller refs

### 5.3 Timeline Core

현재 파츠 애니메이션과 시각 효과는 공통 timeline controller factory 경로를 사용한다.

중심 파일:

- `src/timelineController.js`
- `src/timelineControllerCore.js`
- `src/timelineControllerActions.js`
- `src/timelineControllerSelectionControls.js`
- `src/timelineControllerClipboardControls.js`
- `src/timelineAdapterContract.js`
- `src/poseTimelineAdapter.js`
- `src/effectTimelineAdapter.js`

현재 adapter:

- Pose adapter: 파츠 애니메이션 데이터, pose key, part source, frame copy/paste payload
- Effect adapter: 시각 효과 데이터, effect key, image/effect slot, frame copy/paste payload

아직 controller에 남은 도메인 책임:

- Pose field 렌더링
- Pose group edit 후처리
- Effect field 렌더링
- Effect image preview
- 일부 preview/mutation finish hook

### 5.4 Canvas/Edit Handle

관련 파일:

- `src/tuningPanelCanvasController.js`
- `src/tuningCanvasPointerDrag.js`
- `src/tuningCanvasDragFactory.js`
- `src/canvasDragApply.js`
- `src/tuningEditHandleGeometry.js`
- `src/editHandleGeometry.js`
- `src/editHandleRenderer.js`

현재 상태:

- Part, pose part, group edit, effect handle이 같은 canvas surface에서 편집된다.
- Group edit values는 owner로 분리되었지만, drag 중 같은 객체를 mutation한다.
- Edit handle hover/active/effect handle state는 아직 별도 owner가 없다.

### 5.5 Save/Upload

관련 파일:

- `src/saveStateStorage.js`
- `src/projectStateController.js`
- `src/firebaseProjectState.js`
- `src/firebaseStorageAssets.js`
- `src/characterPsdRuntime.js`
- `src/effectAssetRuntime.js`
- `src/clipBackgroundRuntime.js`

현재 기준:

- 설정 상태는 프로젝트 저장/업로드 대상이다.
- PSD, 이미지, 배경 clip 같은 파일 에셋은 Firebase Storage 참조가 최종 기준이다.
- `Firebase 업로드`, `Firebase 다운로드`는 현재 project state 동기화의 핵심 entry point다.
- 선택 캐릭터 초기화는 저장과 다른 파괴적 편집 작업으로 취급한다.

### 5.6 Stage

관련 파일:

- `src/backgroundPanelController.js`
- `src/backgroundPanelView.js`
- `src/backgroundRenderer.js`
- `src/sceneSession.js`
- `src/clipBackgroundRuntime.js`

현재 상태:

- Stage Session은 현재 Background 편집만 제공한다.
- scene session은 background와 world 정보를 저장할 수 있다.
- 진행 규칙, 적 성장, 카드 보상, 점수 규칙 editor는 아직 없다.

## 6. 데이터 기준

현재 저장/편집 데이터는 크게 아래로 나뉜다.

- Actor tuning: rig, scale, anchor, hitbox, HP, pose offsets/settings, effect offsets/settings
- Effect assets: 시각 효과 이미지 에셋과 슬롯
- Scene session: background, world settings
- Project state: actors, active scene session, scene sessions
- Runtime preview state: 현재 툴 화면에서만 쓰는 preview/selection/edit 상태

Session 간 데이터 전달:

- Setup -> Animation: actor identity, rig, layer order, scale, anchor, base hitbox를 사용한다.
- Animation -> Effect: pose key, duration, playback timing, motion setting을 기준으로 effect slot을 맞춘다.
- Effect -> Stage: actor runtime preview가 효과 데이터를 읽는 상태에서 배경과 stage를 검증한다.
- Stage -> Save/Play Check: scene session/background와 stage rule 데이터를 project state로 저장해야 한다.

## 7. 현재 위험 요소

- `docs/tool-architecture.md`는 현재 정리되었지만, 앞으로 다시 Sprint 로그가 누적되지 않도록 운영 규칙을 지켜야 한다.
- `setting.html`은 500줄 이상이며 패널 구조가 계속 커질 수 있다.
- `src/tuningPanel.js`는 줄 수는 줄었지만 아직 shell bridge, selected actor, undo, shortcut, edit handle state를 함께 가진다.
- `src/tuningPoseTimelineController.js`, `src/tuningEffectTimelineController.js`는 아직 도메인별 렌더링/preview hook을 가진다.
- Workflow filtering은 구조만 있고 실제 hidden/disabled 정책은 확정되지 않았다.
- Session 전환 시 preview/playback 정지 정책이 아직 없다.
- Stage Session은 배경만 있으며 게임 진행 규칙 editor가 없다.
- Save 구조는 actor/scene/project state 경계가 더 명확해질 필요가 있다.
- Tool/Game/Engine 폴더 분리는 아직 시작하지 않았다.

## 8. 현재 우선순위

1. Workflow Editor에서 실제 panel filtering 정책 결정: metadata, hidden, disabled 중 선택
2. Workflow Navigation 최소 스타일과 접근성 정리
3. Session 전환 시 preview/playback 정지 정책 확정
4. Stage Session의 다음 패널 설계: 진행 규칙, 적 성장, 카드 보상, 점수 규칙
5. Edit Handle State 분리: `editHandleHover`, `editHandleActiveMode`, `effectEditHandle`
6. Save/Upload/Download action 경계 검토
7. Hitbox timeline adapter 설계 전 Timeline hook 경계 점검
8. Tool/Game/Engine/Shared 폴더 이동 계획 수립

## 9. 다음 Sprint 목표

추천 목표:

- Workflow Panel Filtering 1차 적용

범위:

- 현재 active session에 속하지 않는 panel을 숨길지 비활성화할지 결정한다.
- `tuningPanelWorkflow.js`의 filter mode를 실제 UI 정책에 연결한다.
- Session 전환 시 preview/playback 처리 정책을 최소한으로 정한다.
- HTML 대규모 이동, CSS 개편, Stage 기능 추가, Save 구조 변경은 하지 않는다.

## 10. 문서 운영

프로젝트 문서는 두 개만 사용한다.

- `docs/tool-architecture.md`: 현재 Architecture, 현재 Milestone, 현재 구조, 현재 위험 요소, 현재 우선순위
- `docs/CURRENT_SPRINT.md`: 이번 Sprint 보고서

`docs/CURRENT_SPRINT.md`는 Sprint마다 덮어쓴다. 과거 Sprint 기록은 남기지 않는다.
