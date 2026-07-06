# SPRINT HISTORY

이 문서는 `99_TASK_REPORT.md`에 누적되던 작업 내역을 분리해 기록하는 히스토리 문서다.

규칙:

- Task가 끝날 때마다 시간, Task 이름, 목표, 완료 내용, QA 결과, 남은 확인 사항을 추가한다.
- `99_TASK_REPORT.md`에는 현재 Sprint 상태와 직전 완료 Task 요약만 유지한다.
- 오래된 상세 기록은 이 문서에 누적한다.

---

## 2026-07-06 09:40 KST

### Task

Editor Foundation 파일명 / SRC MAP 정리

### 목표

- 새 기능 없이 Editor Foundation의 이름, 파일 역할, SRC MAP을 정리한다.
- `src/*.js` 파일명을 `snake_case + 역할 접미사` 규칙에 맞춘다.
- `docs/10_SRC_MAP.md`만 읽어도 프로젝트 구조를 빠르게 파악할 수 있게 만든다.

### 완료 내용

- 작업 시작 전 `docs/20_IMPLEMENTATION_RULES.md`, `docs/00_MANIFEST.md`, `docs/03_ARCHITECTURE.md`, `docs/10_SRC_MAP.md`를 확인했다.
- camelCase JS 파일명을 snake_case로 정리했다.
- 역할이 애매한 파일명을 `_engine`, `_helper`, `_controller`, `_renderer`, `_view`, `_state`, `_data` 접미사 규칙에 맞췄다.
- 모든 JS import 경로를 새 파일명으로 갱신했다.
- `docs/10_SRC_MAP.md`를 Selection / EditTarget, Editor Shell, Timeline, Transform / Property / Handle / Drag, Runtime / Actor, Stage / Assets, Save / Data 기준으로 재정리했다.
- `docs/12_EDITOR_FLOW.md`와 `docs/src-map.html`에 남아 있던 오래된 파일명 참조를 현재 파일명으로 맞췄다.
- `main.js`는 앱 entry point라 접미사 예외로 명시하고, 그 외 `src/*.js`의 보류 목록은 제거했다.

### 변경한 대표 파일명

- `actorState.js` → `actor_state.js`
- `cameraView.js` → `camera_view.js`
- `canvasDragMath.js` → `canvas_drag_math_helper.js`
- `canvasDragState.js` → `canvas_drag_state.js`
- `part_source_registry.js` → `part_source_data.js`
- `property_field_groups.js` → `property_field_data.js`
- `particleEffects.js` → `particle_effects_engine.js`
- `selection_palette.js` → `selection_palette_data.js`
- `stageRulesController.js` → `stage_rules_controller.js`
- `stageRulesPanelController.js` → `stage_rules_panel_controller.js`
- `stageRulesPanelRenderer.js` → `stage_rules_panel_renderer.js`
- `stageRulesState.js` → `stage_rules_state.js`
- `edit_target_resolver.js` → `edit_target_helper.js`
- `editor_panel.js` → `editor_panel_controller.js`
- `game_config.js` → `game_config_data.js`
- `utils.js` → `common_helper.js`

### 완료된 QA

- `src/*.js` camelCase 파일명 없음.
- `main.js`를 제외한 `src/*.js`가 역할 접미사 규칙을 사용함.
- 로컬 JS import 대상 파일 존재 확인.
- `node --check src/main.js` 통과.
- `npm run check`
- `git diff --check`
- `docs/10_SRC_MAP.md`와 실제 `src` 파일명 일치 확인.

### 남은 확인 사항

- 없음.

---

## 2026-07-06 08:48 KST

### Task

Common Editing 구조 기술부채 제거

### 목표

- Group Edit를 포함한 남아 있는 전용 편집 경로를 공통 `EditTarget` 구조로 흡수한다.
- 다음 기능 개발 전에 공통 편집 구조 때문에 다시 리팩토링해야 하는 기술부채를 제거한다.

### 완료 내용

- 작업 시작 전 `docs/20_IMPLEMENTATION_RULES.md`를 확인했다.
- `resolveEditTarget(context)`에 `group` target을 추가해 여러 파츠 선택도 `EditTarget`의 한 종류로 반환하게 했다.
- `group` target은 `targetKeys` / `writeTargetKeys`를 가지며 Property / Handle / Drag / Save가 같은 대상 목록을 보게 했다.
- Action Group Property 렌더링이 `selectedActionParts.size() > 1`을 직접 판단하지 않고 `editTarget.isGroup`을 사용하게 했다.
- active edit highlight key가 group target의 `targetKeys`를 사용하게 했다.
- Group Handle geometry가 `editTarget.isGroup`과 `editTarget.targetKeys`를 사용하게 했다.
- Group opacity save가 selection set이 아니라 `editTarget.writeTargetKeys`를 사용하게 했다.
- `group_transform_adapter.js`에서 Property 입력 해석을 제거하고 여러 파츠에 결과를 분배하는 역할만 남겼다.
- 사용하지 않는 `activeEditPartKeyForContext()` / `activeEditPartKeysForContext()` helper를 제거했다.
- `docs/10_SRC_MAP.md`, `docs/12_EDITOR_FLOW.md`에 Group Edit가 EditTarget의 한 종류임을 기록했다.

### 제거한 기술부채

- Group Edit가 `selectedActionParts.size() > 1`을 여러 파일에서 직접 판단하던 구조를 `editTarget.isGroup`으로 흡수했다.
- Group Handle / Highlight / Save가 selection set을 직접 보던 경로를 `targetKeys` / `writeTargetKeys`로 바꿨다.
- `group_transform_adapter.js`에 섞여 있던 Property 입력 해석을 제거했다.
- 사용되지 않는 context별 active edit key helper를 제거했다.

### 왜 기술부채였는가

- Group Edit가 EditTarget 밖에 있으면 Property / Handle / Drag / Save가 다시 선택 상태를 해석해야 한다.
- 같은 선택 판단이 여러 파일에 흩어지면 frameGroup 버그처럼 읽기 source와 쓰기 source가 갈라질 수 있다.

### 공통 구조로 흡수한 방식

- Resolver가 `targetType: group`과 `targetKeys` / `writeTargetKeys`를 반환한다.
- Property / Handle / Drag / Save는 group 여부를 selection set에서 직접 계산하지 않고 EditTarget object를 사용한다.
- `group_transform_adapter.js`는 group 결과를 여러 파츠에 분배하는 역할만 남긴다.

### 아직 남은 기술부채

- Renderer는 이번 Sprint 금지 범위인 대규모 Renderer 변경에 해당해 resolver object를 직접 받지 않는다.
- `group_edit_state.js`는 group 편집 중 임시 transform 값을 보관하는 state로 남긴다. 저장 source가 아니라 편집 중 UI state라 EditTarget 구조와 충돌하지 않는다.

### 다음 Sprint부터 기능 개발 가능 여부

- 다음 기능 개발을 막는 공통 편집 구조 기술부채는 0개로 판단한다.

### 완료된 QA

- 변경한 JS 파일 `node --check` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Group Edit Property / Handle / Drag가 기존처럼 동작하는지 확인한다.

---

## 2026-07-06 08:18 KST

### Task

EditTarget 기술부채 마감

### 목표

- Setup / Action / Effect의 Property / Handle / Drag / Save가 모두 공통 `resolveEditTarget(context)` 흐름을 사용하게 한다.
- 남아 있던 EditTarget 직접 판단 경로를 정리하고, 다음 Sprint부터 기능 개발에 집중할 수 있는 상태로 만든다.

### 완료 내용

- 작업 시작 전 `docs/20_IMPLEMENTATION_RULES.md`를 확인했다.
- Effect Timeline controller에 `getEditTarget`을 주입해 Effect Property read/write와 Interaction target이 `EditTarget`의 `targetKey` / `writeTargetKey`를 확인하게 했다.
- Effect Canvas drag state와 refresh가 `effectTimeline.currentFrameValue()`를 직접 넘기지 않고 `effectCanvasEditState()`를 통해 resolver target을 확인하게 했다.
- `currentCanvasActivePart()`에서 setup/action/effect 직접 분기를 제거하고 `getEditTarget(context).writeTargetKey`만 반환하게 했다.
- Handle geometry에서 Effect 전용 fallback과 Setup edit focus fallback을 제거하고 `editTarget.targetKey`를 사용하게 했다.
- active edit highlight key도 `getEditTarget(currentOpenEditContext()).targetKey`를 사용하게 했다.
- `transform_edit_state.js`의 action/effect context 비교를 resolver 상수로 정리했다.
- 공개 EditTarget resolver는 `resolveEditTarget()` 하나만 남도록 검색 확인했다.

### 제거한 기술부채

- Effect Property가 effect target을 암묵적으로 직접 판단하던 경로를 resolver target 확인 경로로 바꿨다.
- `currentCanvasActivePart()`의 setup/action/effect 직접 분기를 제거했다.
- Handle geometry의 Effect 전용 fallback과 Setup edit focus fallback을 제거했다.
- active edit highlight key가 별도 helper로 context를 다시 판단하던 경로를 resolver target으로 바꿨다.

### 아직 남아있는 기술부채

- multi-part group edit는 기존 group transform adapter 경로를 유지한다.
- Renderer는 이미 `master`를 적용하지만 아직 resolver object를 직접 받지는 않는다.

### 남긴 이유

- multi-part group edit 재설계와 Renderer 구조 변경은 이번 Sprint 금지 범위다.
- 두 항목은 현재 EditTarget 기능 개발을 막는 부채가 아니라 별도 구조 개선 후보로 분류한다.

### 다음 기능 개발 차단 여부

- 다음 기능 개발을 막는 EditTarget 기술부채는 0개로 판단한다.

### 완료된 QA

- 변경한 JS 파일 `node --check` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Setup / Action / Effect Property / Handle / Drag가 기존처럼 동작하는지 확인한다.

---

## 2026-07-06 07:48 KST

### Task

Common EditTarget Resolver 1차 정리

### 목표

- Setup / Action / Effect가 각각 별도 resolver를 만들지 않고 `resolveEditTarget(context)` 하나로 같은 `EditTarget` object를 사용하게 한다.
- 새 Engine, 저장 구조 변경, Runtime 변경 없이 편집 대상 판정만 공통화한다.

### 완료 내용

- 작업 시작 전 `docs/20_IMPLEMENTATION_RULES.md`를 확인하고, 새 Engine 없이 기존 Action EditTarget 구조를 일반화했다.
- `src/edit_target_helper.js`를 추가해 `resolveEditTarget({ context })` 하나로 Setup / Action / Effect `EditTarget`을 반환하게 했다.
- Action의 `actionPivot`, `frameGroup`, `part` 판정은 공통 resolver의 action branch로 옮겼다.
- Setup은 `part`, Effect는 `effect` target으로 같은 `context`, `targetType`, `targetKey`, `writeTargetKey` 형식을 사용하게 했다.
- Setup Property read/write가 `getEditTarget('setup')`의 `targetKey` / `writeTargetKey`를 우선 사용하게 했다.
- `editor_panel_controller.js`에서 현재 context별 EditTarget을 한 번 계산하고, Handle / Drag 쪽에 공통 target으로 전달하게 했다.
- `transform_handle_geometry_helper.js`와 `transform_editor_controller.js`가 Action 전용 `actionEditTarget` 이름 대신 공통 `editTarget` / `getEditTarget(context)`를 사용하게 했다.
- `action_timeline_edit_helper.js`는 Action pivot 동기화 helper만 담당하게 줄였다.
- `docs/03_ARCHITECTURE.md`, `docs/10_SRC_MAP.md`, `docs/12_EDITOR_FLOW.md`에 Common EditTarget Resolver 흐름을 기록했다.

### 제거한 중복 로직

- Action 전용 `resolveActionTimelineEditTarget()` 진입점을 제거하고 공통 `resolveEditTarget({ context })`로 합쳤다.
- Handle / Drag 쪽의 Action 전용 `actionEditTarget` 인자명을 공통 `editTarget`으로 바꿨다.
- Setup / Effect target도 resolver object로 표현되므로 target object 형식 중복을 줄였다.

### 새로 공통화된 기능

- Setup / Action / Effect 편집 대상은 모두 `context`, `targetType`, `targetKey`, `writeTargetKey`를 가진다.
- Action의 `actionPivot`, `frameGroup`, `part` 판정과 Setup `part`, Effect `effect` 판정이 하나의 resolver에 들어갔다.
- Handle은 `targetKey`, Drag는 `writeTargetKey`를 공통 target에서 읽는다.

### 앞으로 재사용 가능한 부분

- Effect Property가 현재 `effectTimeline`을 직접 보는 부분도 `getEditTarget('effect')`를 받아 같은 흐름으로 확장할 수 있다.
- Projectile / HUD / Stage가 추가되어도 resolver branch만 늘리고 Property / Handle / Drag는 같은 object를 볼 수 있다.

### 아직 남아있는 중복

- multi-part group edit는 기존 group transform adapter 경로를 유지한다.
- Renderer는 이미 `master`를 적용하지만 아직 resolver object를 직접 받지는 않는다.
- Effect Property write는 이번 Sprint에서 교체하지 않아 기존 `effectTimeline` 직접 참조 경로가 남아 있다.
- `currentCanvasActivePart()`는 공통 target을 사용하지만 내부 context 분기는 일부 남아 있다.

### 완료된 QA

- Node 확인으로 `setup`, `action frameGroup`, `action part`, `effect`가 같은 EditTarget object 형식으로 resolve되는지 확인했다.
- 변경한 JS 파일 `node --check` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Setup / Action / Effect handle과 drag가 기존처럼 동작하는지 확인한다.
- 다음 Sprint에서 Effect Property write가 resolver의 `writeTargetKey`를 사용하도록 이어서 정리한다.
- Renderer가 resolver object를 직접 받아야 하는지 별도 검토한다.

---

## 2026-07-06 07:12 KST

### Task

EditTarget 공통화 리팩토링

### 목표

- Action 편집에서 Property / Handle / Drag / Save가 선택 대상을 각자 다시 판단하지 않고 공통 EditTarget Resolver 결과만 사용하게 한다.
- frameGroup처럼 보이지만 내부 write가 이전 partKey로 새는 문제를 구조적으로 막는다.

### 완료 내용

- 작업 시작 전 `docs/20_IMPLEMENTATION_RULES.md`를 확인하고, 기존 Action Timeline scope helper를 확장하는 방향으로 구현했다.
- `resolveActionTimelineEditTarget()`를 Action 편집 대상의 공통 resolver로 확장해 `actionPivot`, `frameGroup`, `part`의 `targetKey` / `writeTargetKey` / boolean scope 값을 한곳에서 반환하게 했다.
- Property write 경로가 active part fallback을 다시 계산하지 않고 resolver의 `writeTargetKey`를 사용하게 정리했다.
- Canvas Handle geometry가 editor panel에서 계산한 `actionEditTarget`을 전달받아 같은 target을 보게 했다.
- Canvas Drag apply 경로가 Action frameGroup 상태에서 이전 edit focus part로 새지 않고 resolver의 `writeTargetKey`를 사용하게 정리했다.
- frameGroup scope에서는 group transform 분배 경로가 실행되지 않도록 경계를 유지했다.
- `docs/12_EDITOR_FLOW.md`와 `docs/10_SRC_MAP.md`에 Action EditTarget Resolver 흐름과 주의사항을 기록했다.

### 제거한 중복 로직

- Property / Handle / Drag가 Action scope를 각자 계산하던 경로를 `resolveActionTimelineEditTarget()` 중심으로 묶었다.
- frameGroup 상태에서 active part나 edit focus part가 남아 있으면 part write로 새던 fallback 판단을 제거했다.

### 새로 공통화된 기능

- Action 편집 대상 판정은 `actionPivot`, `frameGroup`, `part`를 공통 target object로 반환한다.
- Property는 `writeTargetKey`, Handle은 `targetKey`, Drag는 `writeTargetKey`를 사용한다.

### 앞으로 재사용 가능한 부분

- `targetType`, `targetKey`, `writeTargetKey`, `context` 형태의 EditTarget object는 Setup / Effect에도 확장 가능하다.
- Property / Handle / Drag에 target object를 주입하는 방식은 Action 외 편집 모드에도 재사용 가능하다.

### 아직 남아있는 중복

- multi-part group edit는 기존 group transform adapter 경로를 유지한다.
- Renderer는 이미 `master`를 적용하지만 아직 resolver object를 직접 받지는 않는다.
- Setup / Effect는 이번 Sprint 범위 밖이라 기존 선택 판정 경로가 남아 있다.

### 완료된 QA

- Node 확인으로 `actionPivot`, `frameGroup`, `part` 선택 상태가 각각 의도한 `targetKey` / `writeTargetKey`로 resolve되는지 확인했다.
- 변경한 JS 파일 `node --check` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 frameGroup Property와 Canvas Handle이 같은 master target을 수정하는지 확인한다.
- 실제 브라우저에서 part scope 선택 시 기존처럼 선택 파츠만 수정되는지 확인한다.
- Setup / Effect에도 EditTarget object 형식을 적용할지 별도 Sprint에서 검토한다.

---

## 2026-07-06 06:36 KST

### Task

Implementation Rules 문서 추가

### 목표

- Codex가 앞으로 구현 작업 전에 먼저 확인할 실행 규칙 문서를 추가한다.

### 완료 내용

- `docs/20_IMPLEMENTATION_RULES.md`를 추가했다.
- 구현 전 기존 구조 확인, 같은 UX의 같은 CSS/내부 시스템 사용, 단순 구현 우선, 공통 기능 재사용, Source of Truth 단일화 원칙을 정리했다.
- 구현 전 재사용할 공통 시스템과 영향 범위를 먼저 보고하는 규칙을 명시했다.
- `docs/00_MANIFEST.md`의 AI Development Workflow에 `20_IMPLEMENTATION_RULES.md`를 먼저 확인하라는 참조를 추가했다.

### 완료된 QA

- `npx prettier --check docs/20_IMPLEMENTATION_RULES.md docs/00_MANIFEST.md` 통과.
- `git diff --check -- docs/20_IMPLEMENTATION_RULES.md docs/00_MANIFEST.md` 통과.

### 남은 확인 사항

- 다음 구현 작업 시작 시 Codex가 `docs/20_IMPLEMENTATION_RULES.md`를 먼저 읽고 재사용할 공통 시스템과 영향 범위를 보고하는지 확인한다.

---

## 2026-07-06 06:24 KST

### Task

frameGroup write target 고정 버그 수정

### 목표

- frameGroup 상태에서는 Property / Canvas Handle / Drag / Save가 무조건 공통 edit target인 `MASTER_PART_KEY`만 사용하게 한다.
- frameGroup처럼 보이지만 내부 write가 이전 partKey로 새는 문제를 막는다.

### 완료 내용

- `resolveActionTimelineEditTarget()` 공통 resolver를 추가해 `actionPivot`, `frameGroup`, `part`의 `writeTargetKey`를 한곳에서 결정하게 했다.
- frameGroup scope는 stale `activeActionPartKey`가 남아 있어도 `writeTargetKey: MASTER_PART_KEY`를 반환하게 했다.
- frameGroup Property write가 `updateOffset()`의 active part fallback을 타지 않고 `MASTER_PART_KEY`에 직접 쓰게 했다.
- Canvas Drag active part가 frameGroup scope에서 `getEditFocusPartKey()`를 무시하고 `MASTER_PART_KEY`를 쓰게 했다.
- group transform 분배 함수들이 frameGroup scope에서 호출되지 않도록 Canvas group apply 경계에 guard를 추가했다.
- Renderer 구조는 변경하지 않았다.

### 완료된 QA

- Node 확인으로 `hasFrameTarget=true`, 선택 파츠 없음, stale active part가 있는 상태도 `frameGroup/master`로 resolve되는지 확인했다.
- Node 확인으로 실제 선택 파츠가 있으면 기존처럼 `part/head`로 resolve되는지 확인했다.
- 관련 변경 파일 `node --check` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.
- in-app Browser가 현재 세션에서 발견되지 않아 직접 시각 QA는 수행하지 못했다. 따라서 이번 상태는 코드 연결 완료, 브라우저 QA 미완료다.

### 남은 확인 사항

- 실제 브라우저에서 frameGroup Property 회전 변경 시 `actionOffsets[actionKey].master.rot`만 바뀌고 기존 part rot가 바뀌지 않는지 확인한다.
- 실제 브라우저에서 frameGroup Canvas 회전/크기/이동 drag 시 캐릭터 전체가 하나의 덩어리처럼 움직이는지 확인한다.
- 실제 브라우저에서 part scope 선택 시 기존처럼 선택 파츠만 수정되는지 확인한다.

---

## 2026-07-06 05:57 KST

### Task

Action Timeline 중간 frameGroup 편집 경로 보정

### 목표

- Action Timeline 중간 프레임에서도 Property와 Canvas Handle이 같은 frameGroup scope와 공통 write 경로를 사용하게 한다.

### 완료 내용

- Action 현재 프레임 읽기 경로가 중간 selected slot을 Effect처럼 보간해서 읽도록 보정했다.
- Canvas Handle scope 판단이 Property와 같은 `hasFrameTarget()` 기준을 쓰도록 맞췄다.
- Action opacity handle이 frame 객체를 직접 바꾸지 않고 `writeFrameValue` 공통 경로를 타게 했다.
- 중간 빈 slot에서 Property / Handle 조작 시 필요한 키프레임 생성과 저장이 Action Timeline 공통 경로로 연결되게 했다.

### 완료된 QA

- Node 확인으로 중간 selected slot의 Action frame value가 start/end 사이 값으로 보간되는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.
- in-app Browser가 현재 세션에서 발견되지 않아 직접 시각 QA는 수행하지 못했다. 따라서 이번 상태는 코드 연결 완료, 브라우저 QA 미완료다.

### 남은 확인 사항

- 실제 브라우저에서 Action 중간 slot / 중간 키프레임의 frameGroup Property와 Canvas Handle이 같은 기준으로 위치 / 크기 / 회전 / 투명도를 편집하는지 확인한다.
- 실제 브라우저에서 중간 빈 slot 조작 시 키프레임이 생성되고 값이 저장되는지 확인한다.

---

## 2026-07-06 05:28 KST

### Task

Action Timeline Property / Handle 편집 Scope 정리

### 목표

- 키프레임 선택 여부와 파츠 선택 여부에 따라 Property와 Canvas Handle이 같은 Action edit scope를 보게 한다.

### 완료 내용

- Action Timeline edit scope를 `actionPivot`, `frameGroup`, `part`로 분류하는 helper를 추가했다.
- 현재 구현이 파츠 transform 분배 방식임을 확인했고, frameGroup을 Parent Transform 방식으로 전환했다.
- 저장 구조 대개편 없이 기존 `actionOffsets[actionKey].master`를 Action Frame Group Parent Transform으로 사용하게 했다.
- 키프레임 선택 없음 + 파츠 선택 없음 상태는 Action 공통 Pivot 편집으로 유지했다.
- Pivot Canvas handle drag는 `actionSettings[actionKey].editPivot`에 저장하고 `master` frame anchor와 동기화하게 했다.
- 키프레임 선택 있음 + 파츠 선택 없음 상태의 Property / Canvas Handle / Drag / Save는 모두 `master` frame value를 편집하게 했다.
- frameGroup에서 각 파츠 `x/y/rot/w/h`를 직접 재계산해 분배하던 경로를 제거했다.
- `actionSettings[actionKey].editPivot` 저장 필드와 normalize 기본값을 추가했다.
- `docs/12_EDITOR_FLOW.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 Parent Transform 구조 기준으로 갱신했다.

### 완료된 QA

- 관련 변경 파일 `node --check` 통과.
- scope helper Node 확인으로 `actionPivot`, `frameGroup`, `part` 분류와 `editPivot` normalize가 의도대로 동작하는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.
- in-app Browser가 현재 세션에서 발견되지 않아 직접 시각 QA는 수행하지 못했다. 따라서 이번 상태는 코드 연결 완료, 브라우저 QA 미완료다.

### 남은 확인 사항

- 실제 브라우저에서 `actionPivot` 상태에 기준점 X/Y만 보이고 Pivot handle이 저장되는지 확인한다.
- 실제 브라우저에서 `frameGroup` 상태에 전체 파츠 Property / Canvas Handle이 같은 scope로 동작하는지 확인한다.
- 실제 브라우저에서 `part` 상태의 기존 개별 파츠 편집이 깨지지 않았는지 확인한다.

---

## 2026-07-06 04:19 KST

### Task

Action 타임라인 프로퍼티 회전값 미적용 버그 수정

### 목표

- Action 타임라인 끝프레임 / 빈 프레임 / 전체파츠 편집에서 회전값 같은 프로퍼티가 일관되게 저장되게 한다.

### 완료 내용

- 회전 입력 `2x +0°`는 `720`으로 정상 파싱 / 표시되는 것을 확인했다.
- Action 타임라인에서 빈 슬롯을 선택한 상태로 프로퍼티를 수정할 때 Effect 타임라인처럼 키프레임을 먼저 생성한 뒤 값을 쓰게 했다.
- 전체파츠 편집 UI가 임시 그룹값만 보지 않고 선택된 Action 프레임의 실제 저장값을 읽어 표시하게 했다.
- 전체파츠 위치 / 회전 델타 계산도 실제 프레임 값을 기준으로 하게 보정했다.

### 완료된 QA

- Node 확인으로 `2x +0°` 회전 입력이 `720`으로 파싱되고 `720`이 `2x +0°`로 표시되는지 확인했다.
- `node --check src/timeline_action_controller.js`, `node --check src/part_editor_controller.js` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 끝프레임 `2x +0°` 회전값이 유지되는지 확인한다.
- 실제 브라우저에서 빈 슬롯 프로퍼티 수정 시 키프레임 생성과 값 저장이 되는지 확인한다.
- 실제 브라우저에서 전체파츠 편집 후 Property 패널이 실제 저장값을 표시하는지 확인한다.

---

## 2026-07-06 03:17 KST

### Task

Action 그룹 드롭다운 변경 불가 버그 수정

### 목표

- Action 그룹 드롭다운에서 기본 / 이동 / 공격 / 특수를 선택하면 해당 그룹으로 실제 전환되게 한다.

### 완료 내용

- 그룹 드롭다운 change 처리 중 옵션을 다시 그리며 선택값이 첫 항목으로 되돌아가던 문제를 수정했다.
- 그룹 옵션은 필요한 경우에만 다시 만들고, 현재 선택 그룹 값을 먼저 읽은 뒤 보존하게 했다.

### 완료된 QA

- Node 확인으로 base / movement / attack / special 그룹별 Action 목록이 비어 있지 않고 다르게 필터링되는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Action 그룹 드롭다운 변경 시 Action 목록이 바로 바뀌는지 확인한다.

---

## 2026-07-06 03:06 KST

### Task

Action 선택 / 이름 Row Setup 스타일 정렬

### 목표

- Action의 선택 / 이름 row가 Setup의 선택 / 이름 row와 같은 CSS 기준선을 사용하게 한다.
- Action 이름 row는 오른쪽에 Trigger 카드가 붙는 차이만 유지한다.

### 완료 내용

- Action 선택 row를 Setup과 같은 `select-row` 구조로 바꿨다.
- Action 이름 row label 폭과 gap을 Setup row 기준에 맞췄다.
- Effect 선택 row에 영향이 가지 않도록 Action 섹션에만 선택 row grid 보정을 적용했다.
- `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 이번 UI 보정 내용으로 갱신했다.

### 완료된 QA

- `npx prettier --write setting.html src/settingsPanel.css` 실행.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Setup / Action의 선택 row 기준선이 같은지 확인한다.
- 실제 브라우저에서 Action 이름 input 오른쪽 Trigger 카드가 자연스럽게 들어가는지 확인한다.
- Effect 선택 row가 기존처럼 깨지지 않는지 확인한다.

---

## 2026-07-06 02:58 KST

### Task

Action Group / 기본자세 Fallback MVP

### 목표

- Action을 `base`, `movement`, `attack`, `special` 네 그룹으로 관리한다.
- `idle`을 Runtime 특수 fallback으로 고정하지 않고, base 그룹 + Condition으로 기본자세 Action을 고른다.
- 기존 기본 Action과 신규 기본 Action을 그룹 구조에 맞춰 노출한다.

### 완료 내용

- `actionSettings[actionKey].group` 저장값을 추가하고 `base | movement | attack | special`로 normalize했다.
- 기본 Action 목록에 `doubleJump`, `sprint`, `evade`, `parry`를 추가했다.
- 기본 Action 그룹 기본값을 지정했다. `idle`, `fall`, `death`는 `base`, 이동 계열은 `movement`, 공격 계열은 `attack`, 방어/활강/피격 계열은 `special`이다.
- `idle` 기본 Condition은 `ground`, `fall` 기본 Condition은 `air`로 설정했다.
- Action 선택 UI를 Setup과 같은 그룹 드롭다운 + 그룹별 Action 목록 구조로 바꿨다.
- Action `...` 메뉴를 `새 액션`, `액션 이동`, `액션 삭제` 세 항목으로 정리했다.
- 새 Action은 현재 선택한 그룹에 생성되고, 액션 이동은 `actionSettings[actionKey].group`만 변경한다.
- Runtime fallback은 아무 Trigger Action도 없을 때 base 그룹 Action 중 Condition이 맞는 Action을 선택한다.
- base 후보가 없을 때만 compatibility 안전망으로 `idle` key를 사용한다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 Action Group 기준으로 갱신했다.

### 완료된 QA

- Node 확인으로 이전 Sprint에서 강제 숨김 처리된 기존 기본 Action들이 다시 목록에 포함되는지 확인했다.
- Node 확인으로 그룹별 Action 목록이 `base`, `movement`, `attack`, `special` 기준으로 필터링되는지 확인했다.
- Node 확인으로 새 Action이 지정 그룹에 생성되는지 확인했다.
- Node 확인으로 액션 이동이 `group`만 변경하고 Trigger / Timeline / Modifier 데이터를 유지하는지 확인했다.
- Node Runtime 시뮬레이션으로 `onGround === true`일 때 `idle`, `onGround === false`일 때 `fall`이 fallback으로 선택되는지 확인했다.
- Node Runtime 시뮬레이션으로 Trigger Action이 base fallback보다 우선 실행되는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Action 선택 row가 `선택 - 그룹 드롭다운 - Action 드롭다운 - ...` 구조로 보이는지 확인한다.
- 실제 브라우저에서 기본 / 이동 / 공격 / 특수 전환과 목록 필터링을 확인한다.
- 실제 브라우저에서 새 액션 생성, 액션 이동, 액션 삭제 메뉴 동작을 확인한다.
- 실제 플레이 체감으로 아무 입력이 없을 때 땅에서는 대기, 공중에서는 낙하 Action이 보이는지 확인한다.

---

## 2026-07-06 02:26 KST

### Task

Action Condition MVP

### 목표

- Trigger는 입력, Condition은 현재 실행 가능 여부를 담당하게 분리한다.
- Action 실행 순서를 `Input → Trigger → Condition → Action`으로 정리한다.
- Any / Ground / Air 세 조건을 Action 데이터와 Runtime에 추가한다.

### 완료 내용

- `actionSettings[actionKey].condition` 저장값을 추가하고 기본값을 `any`로 normalize했다.
- Action Timeline 설정 줄에 Condition 버튼을 추가해 `Any → Ground → Air → Any` 순서로 순환하게 했다.
- Condition 버튼의 아이콘, title, aria-label을 현재 조건에 맞게 동기화했다.
- Trigger Runtime에서 Trigger match 이후 World Physics `onGround` 상태로 Condition을 검사하게 했다.
- Ground / Air 판정은 Action 이름이나 좌표값이 아니라 `player.onGround`만 사용한다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 Condition 구조 기준으로 갱신했다.

### 완료된 QA

- Node Runtime 시뮬레이션으로 `any` Action이 `onGround`와 관계없이 실행되는지 확인했다.
- Node Runtime 시뮬레이션으로 `ground` Action이 `onGround === true`에서만 실행되는지 확인했다.
- Node Runtime 시뮬레이션으로 `air` Action이 `onGround === false`에서만 실행되는지 확인했다.
- Node 모듈 확인으로 Condition 순환이 `any → ground → air → any` 순서인지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Condition 버튼이 Action 설정 줄에 보이는지 확인한다.
- 실제 브라우저에서 Any / Ground / Air 아이콘과 tooltip이 의도대로 보이는지 확인한다.
- 실제 브라우저에서 Condition 저장 / 복원을 확인한다.
- 실제 플레이 체감으로 Ground / Air 조건이 World Physics `onGround` 상태와 맞게 동작하는지 확인한다.

---

## 2026-07-06 02:12 KST

### Task

Idle 복귀 Blend 전환 경로 보정

### 목표

- Custom Action 종료 후 `idle`로 복귀할 때도 `actionSettings.idle.blendFrames`를 적용한다.
- Trigger Action 간 전환과 Trigger Action → idle 복귀가 같은 Blend 전환 경로를 사용하게 한다.
- `idle` target도 전환 대상 Action 기준으로 Blend 값을 읽게 한다.

### 완료 내용

- `stopCustomAction()`에서 `customActionKey`를 지우기 전에 `beginCustomActionBlend('idle')`를 호출하게 했다.
- idle 복귀 Blend를 생성한 뒤 바로 `customActionBlend = null`로 지우던 경로를 제거했다.
- custom action이 종료되어 `customActionKey`가 없어도 남은 Blend frame은 계속 진행되도록 `advanceCustomActionRuntime()` early return 순서를 조정했다.
- `docs/13_ACTION_MODEL.md`에 idle 복귀도 공통 Action transition 경로와 target action blendFrames를 따른다고 기록했다.
- `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 이번 idle Blend 보정 기준으로 갱신했다.

### 완료된 QA

- Node Runtime 시뮬레이션으로 `idle.blendFrames = 5`일 때 custom action 종료 후 `customActionBlend.frames = 5`가 남는지 확인했다.
- Node Runtime 시뮬레이션으로 idle 복귀 Blend가 frame 진행 후 정상 종료되는지 확인했다.
- Node Runtime 시뮬레이션으로 `idle.blendFrames = 0`이면 기존처럼 즉시 idle로 전환되는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 idle `blendFrames = 5`일 때 이동 Action 종료 후 idle로 5프레임 동안 자연스럽게 연결되는지 확인한다.
- 실제 브라우저에서 idle `blendFrames = 0`이면 기존처럼 즉시 전환되는지 확인한다.
- 실제 브라우저에서 Action A → Action B Blend 기존 동작이 깨지지 않는지 확인한다.

---

## 2026-07-06 01:55 KST

### Task

World Physics Gravity 단위 정리

### 목표

- World Physics를 Action Timeline frame 기준 단위 체계로 정리한다.
- Gravity는 `px/f²`, Inertia는 `frame`으로 설명하고 UI에 표시한다.
- Velocity `px/f`와 Gravity `px/f²`의 Runtime 관계를 맞춘다.

### 완료 내용

- Stage > World Physics의 Gravity 입력 오른쪽에 `px/f²` 단위를 표시했다.
- Stage > World Physics의 Inertia 입력 오른쪽에 `frame` 단위를 표시했다.
- Gravity / Inertia 단위 tooltip을 추가했다.
- World Physics Runtime이 `timelineFrameDelta(dt)`를 사용해 `vx/vy`를 `px/f`, gravity를 `px/f²`, inertia를 `frame`으로 처리하게 했다.
- Velocity Modifier는 `px/f` 값을 World Physics velocity state에 적용하고, Gravity가 이후 `vy`를 frame 기준으로 누적하게 했다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 World Physics 단위 기준으로 갱신했다.

### 완료된 QA

- Node Runtime 시뮬레이션으로 `X=5 px/f`가 60FPS와 120FPS 모두에서 Action Timeline 1프레임 동안 5px 이동하는지 확인했다.
- Node Runtime 시뮬레이션으로 `Y=-15 px/f`와 `Gravity=1 px/f²`에서 `vy`가 아래 방향으로 증가하는지 확인했다.
- Static search로 World Physics Runtime의 60FPS 기준 `frameScale` 경로가 제거됐는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Stage > World Physics의 Gravity 오른쪽에 `px/f²`가 보이는지 확인한다.
- 실제 브라우저에서 Stage > World Physics의 Inertia 오른쪽에 `frame`이 보이는지 확인한다.
- 실제 브라우저에서 Gravity / Inertia tooltip 문구와 저장/복원을 확인한다.
- 실제 브라우저에서 `Y=-15 px/f`와 `Gravity=1 px/f²` 조합의 점프 체감을 확인한다.

---

## 2026-07-06 01:36 KST

### Task

Velocity Runtime px/f 해석 보정

### 목표

- Velocity를 Runtime 속도가 아니라 Action Timeline frame 기준 `px/f` 이동량으로 해석한다.
- Runtime FPS가 Velocity 의미를 바꾸지 않게 한다.
- Gravity / Inertia World Physics 흐름은 유지한다.

### 완료 내용

- Velocity Runtime에서 `ACTION_FPS / 60` 기반 변환을 제거했다.
- 현재 Action Timeline progress로 이번 tick에 해당하는 Timeline frame 이동량을 계산하게 했다.
- Velocity 이동량을 `player.actionVelocityDelta`로 World Physics 단계에 전달해 최종 위치에 합산하게 했다.
- `5 px/f`는 Runtime FPS와 무관하게 Action Timeline 1프레임 동안 5px 이동하게 했다.
- `Y=-10 px/f`, `startFrame=2`, `endFrame=2`는 해당 Timeline frame에서 총 -10px 위쪽 이동을 만든다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 Velocity Runtime px/f 해석 기준으로 갱신했다.

### 완료된 QA

- Node Runtime 시뮬레이션으로 `X=5 px/f`, `startFrame=1`, `endFrame=1`이 60FPS와 120FPS 모두에서 Timeline 1프레임 동안 5px 이동하는지 확인했다.
- Node Runtime 시뮬레이션으로 `Y=-10 px/f`, `startFrame=2`, `endFrame=2`가 해당 Timeline frame에서 총 -10px 이동하는지 확인했다.
- Static search로 Velocity Runtime의 `ACTION_FPS / 60` 변환 함수가 제거됐는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 X=5 px/f가 Action Timeline 1프레임마다 5px 이동하는지 확인한다.
- 실제 브라우저에서 Y=-10 px/f로 점프성 위쪽 이동이 발생하는지 확인한다.
- 실제 브라우저에서 Gravity / Inertia가 Velocity 이후 기존처럼 적용되는지 확인한다.

---

## 2026-07-06 01:18 KST

### Task

Velocity Modifier UI 단위 단순화

### 목표

- Velocity를 제작자가 이해하기 쉬운 Action Timeline frame 기준 `px/f` 단위로 표현한다.
- Velocity 카드 제목 오른쪽에 현재 `ACTION_FPS` 기반 `1s = {ACTION_FPS}f`를 표시한다.
- X/Y Velocity 입력 오른쪽에 `px/f` 단위를 표시한다.
- 기존 Modifier Mini Timeline 공통 시스템은 그대로 재사용한다.

### 완료 내용

- Velocity 카드 title에 `ACTION_FPS`를 읽은 `1s = 10f` meta 표시를 추가했다.
- Velocity X/Y scrub 입력에 `px/f` 단위 badge와 tooltip을 추가했다.
- Runtime Velocity 값을 `px/f`에서 World Physics velocity 단위로 변환해 적용하게 했다.
- Modifier Mini Timeline은 기존 공통 helper를 그대로 사용하게 유지했다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`에 Velocity 중심 방향과 `px/f` 단위를 기록했다.

### 완료된 QA

- Node 정적 확인으로 Velocity 카드 title meta가 `ACTION_FPS` 기반 `1s = 10f`로 생성되는지 확인했다.
- Node 정적 확인으로 Velocity X/Y 입력에 `px/f` 단위가 붙는지 확인했다.
- Node Runtime 시뮬레이션으로 `5 px/f`가 `ACTION_FPS = 10` 기준 첫 Runtime frame에서 약 `0.833px` 이동하는지 확인했다.
- Node Runtime 시뮬레이션으로 Velocity Add가 기존 velocity에 `px/f` 변환값을 더하는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Velocity 카드 제목 오른쪽에 `1s = 10f`가 보이는지 확인한다.
- 실제 브라우저에서 X/Y Velocity 입력 오른쪽에 `px/f`가 보이는지 확인한다.
- 실제 브라우저에서 기존 Mini Timeline UI가 그대로 동작하는지 확인한다.

---

## 2026-07-06 00:58 KST

### Task

Velocity Modifier + Modifier Mini Timeline MVP

### 목표

- Move를 제거하지 않고 Velocity 기반 Modifier 구조로 전환하기 위한 공통 기반을 만든다.
- Velocity / Accelerate / Decelerate가 같은 Modifier Mini Timeline UI를 사용하게 한다.
- Velocity Modifier가 Runtime `vx/vy`를 `set` 또는 `add` mode로 변경하게 한다.

### 완료 내용

- `velocity` modifier definition과 normalize schema를 추가했다.
- `accelerate` / `decelerate`에 공통 `startFrame`, `endFrame` 구간 필드를 추가하고 기존 `frames` / `strength` 저장값 fallback을 유지했다.
- 일반 Timeline slot 렌더러를 재사용하는 Modifier Mini Timeline helper를 추가했다.
- Modifier Editor에서 Velocity / Accelerate / Decelerate가 같은 Mini Timeline UI를 사용하게 했다.
- Action Duration 변경 시 Mini Timeline block 수가 현재 Action frame 수를 따라가도록 동기화했다.
- Runtime에서 Velocity Set/Add를 현재 Action frame의 `startFrame`~`endFrame` 구간에만 적용하게 했다.
- Velocity가 제어한 축은 해당 frame에서 World Physics Inertia 감속을 건너뛰게 했다.
- Move modifier는 제거하지 않고 기존 Runtime 동작을 유지했다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`를 이번 Velocity / Mini Timeline 기준으로 갱신했다.

### 완료된 QA

- Node 정적 확인으로 `velocity` / `accelerate` / `decelerate` normalize 결과에 `startFrame`, `endFrame`이 들어가는지 확인했다.
- Node 정적 확인으로 legacy `accelerate.frames` / `decelerate.strength`가 `endFrame`으로 호환되는지 확인했다.
- Node Runtime 시뮬레이션으로 Velocity Set이 `vx/vy`를 설정하고 World Physics 위치 반영으로 이어지는지 확인했다.
- Node Runtime 시뮬레이션으로 Velocity Add가 기존 `vx/vy`에 더해지는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Velocity Modifier 추가, X/Y 입력, Set/Add 선택을 확인한다.
- 실제 브라우저에서 Velocity / Accelerate / Decelerate가 같은 Mini Timeline UI를 사용하는지 확인한다.
- 실제 브라우저에서 Action Duration 변경 시 Mini Timeline block 수도 같이 변경되는지 확인한다.
- 실제 브라우저에서 Press Loop 중 Accelerate / Decelerate가 loop마다 재발동하지 않는지 확인한다.

---

## 2026-07-06 00:24 KST

### Task

World Physics MVP 단순화

### 목표

- World Physics를 제작자가 직관적으로 이해할 수 있는 `Gravity`, `Inertia` 두 값으로 단순화한다.
- 기존 `groundFriction`, `airDrag`, `maxFallSpeed` 입력과 저장 shape를 제거한다.
- Inertia는 속도가 0이 될 때까지 걸리는 프레임 수로 동작하게 한다.

### 완료 내용

- `sceneSession.stageRules.worldPhysics`를 `{ gravity, inertia }` 구조로 normalize하게 했다.
- Stage World Physics UI에서 `Gravity`, `Inertia` 입력만 보이게 했다.
- `groundFriction`, `airDrag`, `maxFallSpeed` input query와 controller binding을 제거했다.
- Runtime에서 기존 friction / drag / maxFallSpeed 계산을 제거했다.
- Runtime velocity는 `inertia` 프레임 동안 선형으로 0에 가까워지며, `inertia: 0`이면 즉시 0이 된다.
- Gravity는 기존처럼 공중 velocity에 계속 더해지도록 유지했다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 이번 단순화 기준으로 갱신했다.

### 완료된 QA

- Node 정적 확인으로 World Physics UI가 `Gravity`, `Inertia`만 렌더하는지 확인했다.
- Node 시뮬레이션으로 legacy `groundFriction`, `airDrag`, `maxFallSpeed` 저장값이 normalize 후 제거되는지 확인했다.
- Node 시뮬레이션으로 `inertia: 0`이면 velocity가 즉시 0이 되는지 확인했다.
- Node 시뮬레이션으로 `inertia: 30`이면 velocity가 선형으로 줄어드는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 World Physics에 Gravity / Inertia만 보이는지 확인한다.
- 실제 브라우저에서 Inertia 값 변경 후 저장/복원을 확인한다.

---

## 2026-07-06 00:10 KST

### Task

Stage UI 범위 정리

### 목표

- Stage 탭에서 현재 개발 범위인 배경과 World Physics만 노출한다.
- 진행 / 적 / 보상 / 점수 카드는 나중에 해당 기능 개발 단계에서 다시 만든다.
- World Physics 카드 클릭/입력 동작은 유지한다.

### 완료 내용

- `stageRulesPanelRenderer`에서 진행 / 적 / 보상 / 점수 카드 렌더 정의를 제거했다.
- `editor_workflow_data.js`의 Stage workflow section 목록을 `scene`, `worldPhysics`만 남기도록 정리했다.
- Stage 탭 진입 시 배경과 World Physics만 자동 열림 대상에 포함되게 했다.
- `stageRulesPanelController`를 World Physics UI 전용 controller로 줄였다.
- `editor_panel_dom_helper.js`에서 제거된 Stage 카드 input query를 정리했다.
- 저장 구조와 Runtime World Physics 동작은 변경하지 않았다.

### 완료된 QA

- Node 정적 확인으로 Stage workflow section이 `scene`, `worldPhysics`만 남았는지 확인했다.
- Node 정적 확인으로 Stage Rules renderer가 World Physics 카드만 렌더 대상으로 가지는지 확인했다.
- Node 정적 확인으로 World Physics renderer/controller input id가 일치하는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Stage 탭에 배경과 World Physics만 보이는지 확인한다.
- 실제 브라우저에서 World Physics 카드 클릭/입력/저장 복원을 확인한다.

---

## 2026-07-05 23:56 KST

### Task

Stage World Physics MVP

### 목표

- 중력과 기본 관성을 Action Modifier가 아니라 Stage / World Runtime Rule로 관리한다.
- 모든 Runtime actor가 같은 World Physics 규칙을 받을 수 있는 기반을 만든다.
- 기존 inertia modifier를 제거한다.

### 완료 내용

- `sceneSession.stageRules.worldPhysics` 저장 구조를 추가하고 누락 필드를 기본값으로 normalize하게 했다.
- Stage 탭에 World Physics 카드와 `gravity`, `groundFriction`, `airDrag`, `maxFallSpeed` 입력을 추가했다.
- Stage Rules 변경과 undo 복원 시 Runtime `world.worldPhysics`가 함께 갱신되게 했다.
- `vx`, `vy`, `onGround`, `floorY` 기반 World Physics를 actor update 흐름에 추가했다.
- 기존 매 프레임 velocity 초기화 흐름을 제거하고 gravity / drag / friction / floor collision을 적용하게 했다.
- Action Modifier 라이브러리, normalize, Runtime move 계산에서 inertia modifier를 제거했다.
- `docs/03_ARCHITECTURE.md`, `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 이번 World Physics MVP 기준으로 갱신했다.

### 완료된 QA

- Node 시뮬레이션으로 worldPhysics normalize 기본값과 clamp를 확인했다.
- Node 시뮬레이션으로 기존 inertia 저장 데이터가 normalize 후 modifier 목록에서 제거되는지 확인했다.
- Node 시뮬레이션으로 gravity / maxFallSpeed / groundFriction / airDrag / floor collision 동작을 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Stage 탭에 World Physics 카드가 보이는지 확인한다.
- 실제 브라우저에서 World Physics 입력값이 저장/복원되는지 확인한다.
- 실제 브라우저에서 Action Modifier 라이브러리에서 inertia가 사라졌는지 확인한다.
- 실제 브라우저에서 Blend / Mirror / Cancel / Trigger Mode 회귀 확인을 진행한다.

---

## 2026-07-05 23:32 KST

### Task

Action Blend MVP

### 목표

- Action 전환 시 포즈가 순간이동하지 않도록 짧은 Blend 값을 추가한다.
- Blend는 `0~5` 프레임을 사용하며 `0`은 기존 즉시 전환으로 유지한다.
- Blend가 설정되어 있으면 Blend 구간을 먼저 재생하고, 그 뒤 새 Action Timeline 첫 프레임을 시작한다.

### 완료 내용

- `actionSettings[actionKey].blendFrames` 저장값을 추가하고 normalize 기본값을 `0`으로 설정했다.
- Action Timeline 버튼 줄에 Link 아이콘 + 숫자 badge 형태의 Blend 버튼을 추가했다.
- Blend 버튼은 `0 → 1 → 2 → 3 → 4 → 5 → 0` 순서로 순환한다.
- Tooltip은 `즉시 전환`, `N프레임 연결`로 표시되게 했다.
- Runtime에서 새 Action 시작 직전 표시 포즈를 스냅샷으로 잡고, 새 Action 첫 프레임 포즈까지 `blendFrames` 동안 보간한다.
- Blend 진행 기준을 update tick이 아니라 Action Timeline FPS 기준 시간(`blendFrames / ACTION_FPS`초)으로 맞췄다.
- Blend 구간 동안 새 Action Timeline progress와 Move modifier가 진행되지 않게 했다.
- `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`을 이번 Blend MVP 기준으로 갱신했다.

### 완료된 QA

- Node 시뮬레이션으로 Blend 3에서 표시 offset이 이전 포즈에서 새 Action 첫 프레임까지 3프레임 동안 보간되는지 확인했다.
- Node 시뮬레이션으로 Blend 3이 Action Timeline FPS 기준 시간 동안 먼저 실행되고, 그 뒤 Action Timeline이 시작되는지 확인했다.
- Node 시뮬레이션으로 Blend 순환 값이 `0 → 1 → 2 → 3 → 4 → 5 → 0`인지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Blend 버튼이 Action Timeline 버튼 줄의 Cancel과 Trigger Mode 사이에 보이는지 확인한다.
- 실제 브라우저에서 Link 아이콘과 숫자 badge가 정상 표시되는지 확인한다.
- 실제 브라우저에서 Blend 3 전환이 자연스럽게 보이는지 확인한다.
- 실제 브라우저에서 Blend 중 새 Action Timeline progress와 Move modifier가 먼저 진행되지 않는지 확인한다.

---

## 2026-07-05 23:21 KST

### Task

Trigger Mode Tap / Press / Repeat 아이콘 보정

### 목표

- Trigger Mode 버튼의 Tap / Press / Repeat 아이콘을 손가락이 버튼을 누르는 형태로 정리한다.
- Tap은 한 번 누름, Press는 누른 상태 유지, Repeat는 누른 상태 반복 의미가 보이게 한다.
- 기존 `tap`, `press`, `pressLoop` 저장값과 Runtime 의미는 유지한다.

### 완료 내용

- `setting.html`의 Trigger Mode 기본 아이콘을 손가락 + 눌리는 버튼 + Tap 표시 형태로 교체했다.
- `src/action_authoring_controller.js`와 `src/pose_action_authoring_controller.js`의 동적 Trigger Mode 아이콘 렌더링을 같은 스타일로 맞췄다.
- Tap은 세로 표시, Press는 아래 방향 압력 화살표, Repeat는 작은 loop 화살표가 표시되도록 분리했다.
- Trigger Mode 버튼 SVG 크기를 18px로 조정해 작은 버튼 안에서 손가락/버튼 형태가 더 잘 보이게 했다.
- 저장 key, Trigger Mode enum, Runtime 동작은 변경하지 않았다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 UI 아이콘 보정 기준으로 갱신했다.

### 완료된 QA

- Trigger Mode 버튼의 정적 HTML 아이콘과 동적 JS 아이콘 helper가 새 손가락/버튼 path를 사용하는지 정적 확인을 수행했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Tap / Press / Repeat 아이콘이 의도한 손가락 + 버튼 형태로 읽히는지 확인한다.
- 실제 브라우저에서 Trigger Mode 버튼이 Tap → Press → Repeat → Tap 순서로 순환하는지 확인한다.

---

## 2026-07-05 18:09 KST

### Task

설정창 overflow / Trigger Mode 버튼 UI 복구

### 목표

- 설정창 내부 요소가 좌우로 부모 패널 밖에 삐져나가지 않게 한다.
- Trigger Mode 버튼을 복구한다.
- Trigger Mode 버튼을 Trigger 입력칸 옆이 아니라 Action Timeline 버튼 줄로 옮긴다.

### 완료 내용

- `actionTriggerRepeat` 버튼을 Trigger 입력 카드에서 제거하고 Action Timeline 설정 줄의 Cancel 버튼 다음 위치로 이동했다.
- Action Timeline 설정 줄을 `[frames] [play] [playback] [mirror] [cancel] [trigger mode] [...]` 순서로 정리했다.
- Trigger 입력 카드는 상태 표시 / 녹화 완료 / 녹화 취소 / 녹화 버튼만 담도록 줄였다.
- Action Timeline 설정 grid를 Trigger Mode 버튼까지 포함하도록 6개 icon column으로 조정했다.
- 설정 패널 root / section / row / input / select / button 계층에 `box-sizing`, `min-width: 0`, `max-width: 100%` 보정을 추가했다.
- Action 이름 / Trigger row의 고정 최소폭을 낮춰 작은 패널 폭에서도 내부에서 수축되게 했다.
- `...` 메뉴가 잘리지 않도록 Timeline 설정 row의 `overflow: visible`은 유지했다.
- `docs/13_ACTION_MODEL.md`에 Trigger Mode 버튼 위치와 Repeat 표시명을 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 UI 버그 픽스 기준으로 갱신했다.

### 완료된 QA

- Trigger Mode enum normalize가 `tap → press → pressLoop → tap` 순서로 동작하는지 Node 모듈 확인을 수행했다.
- Legacy `repeatWhileHeld: true`가 `press`로 해석되는지 Node 모듈 확인을 수행했다.
- `npm run check` 통과.
- `git diff --check` 통과.
- `http://127.0.0.1:4176/setting.html` 200 OK 확인.

### 남은 확인 사항

- 실제 브라우저에서 설정창 좌우 overflow가 사라졌는지 확인한다.
- 실제 브라우저에서 Trigger Mode 버튼이 Timeline 버튼 줄에 보이는지 확인한다.
- 실제 브라우저에서 Tap → Press → Repeat → Tap 순환과 tooltip을 확인한다.
- 실제 브라우저에서 `...` 메뉴가 계속 정상적으로 열리는지 확인한다.

---

## 2026-07-05 17:31 KST

### Task

Trigger Mode Tap / Press / Press Loop

### 목표

- 기존 Press ON/OFF를 `Tap → Press → Press Loop` 순환 Trigger Mode로 바꾼다.
- 이동, 점프, 공격, 차지를 같은 Trigger Runtime으로 표현할 수 있게 한다.
- Trigger Mode와 Timeline playback의 책임을 분리한다.
- Press Loop에서 Accelerate / Decelerate가 loop마다 반복 적용되지 않게 한다.

### 완료 내용

- Trigger schema에 `triggerMode: "tap" | "press" | "pressLoop"` enum을 추가했다.
- Legacy `repeatWhileHeld: true`는 compatibility 입력으로 읽고, 명시적 `triggerMode`가 없으면 `press`로 normalize한다.
- 기존 Trigger mode 버튼을 `Tap → Press → Press Loop → Tap` 순환 버튼으로 변경했다.
- Tap / Press / Press Loop 각각의 tooltip과 inline SVG 아이콘을 적용했다.
- Runtime에서 `customActionTriggerMode`를 기록해 Tap / Press / Press Loop 종료 조건을 분리했다.
- `tap`은 release와 무관하게 duration까지 한 번 실행한다.
- `press`는 release 시 즉시 종료하고, duration 끝에 도달해도 종료한다.
- `pressLoop`는 release 시 즉시 종료하고, 입력 유지 중 duration 이후 progress는 Timeline playback을 따른다.
- Press Loop + `playback: loop`의 move delta가 다음 loop로 계속 누적되게 했다.
- Press Loop에서 Accelerate / Decelerate는 첫 loop에만 적용하고 이후 loop에서는 다시 적용하지 않게 했다.
- `docs/11_DATA_MODEL.md`와 `docs/13_ACTION_MODEL.md`에 Trigger Mode enum과 Runtime 의미를 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- Node 시뮬레이션으로 Trigger Mode 버튼 순서가 `tap → press → pressLoop → tap`인지 확인했다.
- Node 시뮬레이션으로 Tap은 release 후에도 100 이동하고 끝까지 실행되는지 확인했다.
- Node 시뮬레이션으로 Press는 5프레임 release 시 50 이동 후 즉시 종료되고, 15프레임 유지 시 100 이동 후 종료되는지 확인했다.
- Node 시뮬레이션으로 Press Loop + `playback: loop`는 15프레임 유지 시 150 이동하고 active 상태를 유지하는지 확인했다.
- Node 시뮬레이션으로 Press Loop + `playback: pingpong`은 15프레임 유지 시 50 위치로 되돌아오는지 확인했다.
- Node 시뮬레이션으로 Press Loop + Accelerate가 2번째 loop에서 다시 적용되지 않는지 확인했다.
- Node 시뮬레이션으로 Press Loop + Mirror + Cancel ON/OFF 방향 전환을 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Trigger Mode 버튼 아이콘과 tooltip이 Tap / Press / Press Loop에 맞게 바뀌는지 확인한다.
- 실제 브라우저에서 Tap / Press / Press Loop를 각각 키 입력으로 확인한다.
- 실제 브라우저에서 Press Loop + Accelerate가 loop마다 재적용되지 않는지 확인한다.

---

## 2026-07-05 17:08 KST

### Task

Press playback 지속 규칙 보정

### 목표

- Press ON Action이 입력 유지 중 duration 끝에 도달했을 때 Timeline playback 값을 따르게 한다.
- Press를 반복 재시작 기능이 아니라 release 시 종료 조건으로 유지한다.
- loop / pingpong / once에 따라 custom Action progress와 move modifier delta가 다르게 진행되게 한다.

### 완료 내용

- Custom Action 실행에 `customActionElapsed`를 추가해 남은 시간이 아니라 누적 elapsed 기준으로 progress를 계산하게 했다.
- Press ON Action은 duration 끝에 도달해도 입력이 유지되는 동안 active 상태를 유지하게 했다.
- Press ON + `playback: loop`에서는 progress가 0으로 순환하고, move modifier delta가 다음 loop로 계속 누적되게 했다.
- Press ON + `playback: pingpong`에서는 왕복 progress 기준으로 move delta가 앞뒤 방향으로 적용되게 했다.
- Press ON + `playback: once`에서는 끝 프레임에서 유지되고 추가 move delta가 발생하지 않게 했다.
- Press OFF Action은 기존처럼 한 번 실행 후 종료되는 흐름을 유지했다.
- `docs/11_DATA_MODEL.md`와 `docs/13_ACTION_MODEL.md`에 Press와 Timeline playback의 책임 분리를 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- Node 시뮬레이션으로 Press ON + `once`에서 15프레임 입력 유지 시 100 이동 후 끝 상태를 유지하는지 확인했다.
- Node 시뮬레이션으로 Press ON + `loop`에서 15프레임 입력 유지 시 150 이동하며 다음 loop delta가 적용되는지 확인했다.
- Node 시뮬레이션으로 Press ON + `pingpong`에서 15프레임 입력 유지 시 100까지 갔다가 50으로 되돌아오는지 확인했다.
- Node 시뮬레이션으로 Press release 시 active Action이 즉시 종료되는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Press ON + playback `loop` / `pingpong` / `once`를 각각 확인한다.
- 실제 브라우저에서 Press release 시 loop / pingpong 중에도 즉시 종료되는지 확인한다.

---

## 2026-07-05 16:58 KST

### Task

Timeline slider / Press Runtime Rule

### 목표

- Timeline playbackRate slider가 어떤 화면 폭에서도 부모 영역 밖으로 삐져나가지 않게 한다.
- Trigger의 Hold UI 의미를 Press로 변경한다.
- Press를 "누르고 있는 동안만 진행되는 Action"의 공통 Runtime Rule로 둔다.
- Press에 맞는 단순 line SVG 아이콘을 적용한다.

### 완료 내용

- Action / Effect playbackRate row와 부모 grid item에 `min-width: 0`, `max-width: 100%`, `box-sizing: border-box` 보정을 추가했다.
- playbackRate row를 `[range: minmax(0, 1fr)] [number: 54px]` 구조로 고정해 slider가 남은 폭만 사용하게 했다.
- Trigger 반복 버튼의 UI 이름과 tooltip을 Press 기준으로 변경했다.
- Press 아이콘을 눌림/압력선/버튼 형태의 단순 line SVG로 교체했다.
- 저장 key는 기존 `repeatWhileHeld`를 그대로 유지했다.
- Press ON으로 시작된 Action은 시작 시 유지해야 하는 input code를 `customActionPressCodes`에 기록하게 했다.
- 매 프레임 Press input이 유지되지 않으면 현재 Custom Action을 즉시 종료하게 했다.
- 기존 held repeat 재시작 경로를 제거해 Press가 반복 기능이 아니라 진행 조건으로 동작하게 했다.
- `docs/11_DATA_MODEL.md`와 `docs/13_ACTION_MODEL.md`에 Press의 저장 key / Runtime 의미를 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- Node 시뮬레이션으로 Press ON / move x=100 / frames=10에서 10프레임 입력 유지 시 100 이동하는지 확인했다.
- Node 시뮬레이션으로 Press ON에서 5프레임만 입력 유지 후 release하면 약 50 이동 후 즉시 종료되고 남은 이동이 수행되지 않는지 확인했다.
- Node 시뮬레이션으로 Press OFF에서는 release 뒤에도 Action이 끝까지 진행되는지 확인했다.
- Node 시뮬레이션으로 Press ON + Mirror ON + Cancel ON 방향 전환이 같은 Action key에서도 반대 facing으로 재시작되는지 확인했다.
- Node 시뮬레이션으로 Press ON + Mirror ON + Cancel OFF 상태에서 기존 입력이 유지되면 반대 방향 입력으로 재시작되지 않는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Action / Effect playbackRate slider가 오른쪽으로 삐져나가지 않는지 확인한다.
- 실제 브라우저에서 `...` 메뉴가 계속 잘 열리는지 확인한다.
- 실제 브라우저에서 Press 아이콘이 다운로드처럼 보이지 않는지 확인한다.
- 실제 브라우저에서 Press ON / Mirror / Cancel 조합을 키 입력으로 확인한다.

---

## 2026-07-05 16:44 KST

### Task

Action Timeline UI / Mirror Cancel 보정

### 목표

- Cancel 버튼 아이콘을 단순 X가 아닌 "재생 중 끊고 전환" 의미로 보이게 한다.
- Trigger Hold 버튼 아이콘을 다운로드처럼 보이지 않는 "누르는 동안 유지" 의미로 보이게 한다.
- Action / Effect Timeline 설정 row와 playbackRate slider row가 부모 폭 밖으로 삐져나가지 않게 한다.
- Mirror ON 상태에서 같은 Action key라도 요청 facing이 바뀌면 Cancel ON일 때 즉시 반대 방향으로 재시작되게 한다.

### 완료 내용

- Cancel 아이콘을 정지 블록 / 정지선 / 전환 화살표 조합으로 교체했다.
- Trigger Hold 아이콘에서 화살표 머리를 제거하고, 눌린 버튼과 접촉선 중심의 press-and-hold 형태로 교체했다.
- Timeline 설정 row에 `width`, `max-width`, `min-width`, `box-sizing` 보정을 추가했다.
- playbackRate slider row는 range / number input이 row 내부에서 shrink되도록 보정하고, 메뉴가 있는 설정 row는 `overflow: visible`을 유지했다.
- Runtime에서 Action 실행 facing을 `customActionFacing`으로 기록하게 했다.
- 같은 Action key라도 새 Trigger matching 결과의 requested facing이 현재 실행 facing과 다르면 Cancel ON에서 재시작 가능하게 했다.
- Cancel OFF에서는 같은 Action의 반대 방향 입력도 현재 실행이 끝날 때까지 유지한다.
- `docs/13_ACTION_MODEL.md`에 같은 Action key + 다른 requested facing 처리 원칙을 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- Node 시뮬레이션으로 Mirror ON / Cancel ON / 저장 Trigger `ArrowRight` 상태에서 실행 중 `ArrowLeft` 입력이 같은 Action을 facing left로 재시작하는지 확인했다.
- Node 시뮬레이션으로 Mirror ON / Cancel OFF 상태에서는 실행 중 반대 방향 입력이 무시되고 현재 Action이 유지되는지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Cancel 아이콘이 재생 중 끊기/정지 의미로 보이는지 확인한다.
- 실제 브라우저에서 Hold 아이콘이 다운로드처럼 보이지 않는지 확인한다.
- 실제 브라우저에서 Action / Effect playbackRate slider가 오른쪽으로 삐져나가지 않는지 확인한다.
- 실제 브라우저에서 Action / Effect Timeline `...` 메뉴가 계속 잘리지 않고 열리는지 확인한다.

---

## 2026-07-05 16:21 KST

### Task

Action Timeline 설정 UI 정리

### 목표

- Action Timeline 설정 줄의 버튼들을 한 줄로 정리한다.
- playbackRate slider를 Timeline 설정 줄에서 빼서 Timeline bar 아래 row로 이동한다.
- Mirror 버튼과 `...` 메뉴 사이에 Cancel 버튼을 추가한다.
- Cancel 버튼은 기존 `actionSettings[actionKey].interruptible` 값을 제어한다.

### 완료 내용

- Action 설정 줄을 `[frames] [play] [playback] [mirror] [cancel] [...]` 순서로 정리했다.
- Action / Effect playbackRate slider를 Timeline bar 아래 full-width row로 이동했다.
- `actionCancel` 버튼을 추가하고 X / 끊기 느낌의 inline SVG 아이콘을 적용했다.
- Cancel ON title은 "다른 액션으로 즉시 전환", Cancel OFF title은 "현재 액션이 끝날 때까지 유지"로 동기화했다.
- Cancel 버튼이 `actionSettings[actionKey].interruptible`을 토글하도록 연결했다.
- Runtime interrupt 구조는 기존 `interruptible` / `interruptPriority`를 그대로 재사용했다.
- `docs/11_DATA_MODEL.md`와 `docs/13_ACTION_MODEL.md`에 Cancel UI가 `interruptible`을 제어한다는 점을 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- Node 모듈 확인으로 Cancel 버튼 토글이 기존 `interruptible` 값을 변경하는지 확인했다.

### 남은 확인 사항

- 실제 브라우저에서 Action 설정 줄이 한 줄로 정렬되는지 확인한다.
- playbackRate slider가 Timeline 아래에서 잘리지 않는지 확인한다.
- Cancel ON/OFF가 실행 중 Action interrupt 동작과 연결되는지 확인한다.

---

## 2026-07-05 16:07 KST

### Task

Mirror Trigger 좌우 대칭 해석

### 목표

- Mirror ON Action의 `ArrowLeft` / `ArrowRight` Trigger를 좌우 대칭으로 해석한다.
- 반대 방향 Trigger를 저장하거나 Action을 복사하지 않는다.
- 반대 방향 입력으로 실행된 경우 runtime `facing`을 실제 입력 방향으로 잡는다.

### 완료 내용

- Trigger Runtime matching에 좌우 대칭 입력 variant를 추가했다.
- Single / Sequence / Hold Combo / Hold repeat Trigger에서 mirror 입력을 해석하게 했다.
- Exact Trigger를 모든 Action에서 먼저 검사하고, 그 다음 mirrored Trigger를 검사해 반대 방향 Action이 먼저 먹히는 일을 피했다.
- mirrored `ArrowLeft` / `ArrowRight` 입력으로 Action이 시작되면 `player.facing`을 실제 입력 방향으로 설정하게 했다.
- `actionTriggers` 저장값은 변경하지 않고 Runtime matching 단계에서만 대칭 입력을 해석한다.
- `docs/11_DATA_MODEL.md`와 `docs/13_ACTION_MODEL.md`에 저장 없는 Runtime mirror Trigger 해석을 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- Node 시뮬레이션으로 Mirror ON 반대 방향 single / sequence / hold repeat Trigger, Mirror OFF 미반응, exact 우선순위를 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Mirror ON Action의 반대 방향 Trigger 입력이 같은 Action을 실행하는지 확인한다.
- 반대 방향 입력으로 실행했을 때 facing과 Move X / Timeline X / rotation mirror 해석이 이어지는지 확인한다.
- Mirror OFF에서 저장된 Trigger 방향에만 반응하는지 확인한다.

---

## 2026-07-05 15:59 KST

### Task

Action Mirror MVP

### 목표

- Action 하나를 현재 바라보는 방향에 따라 좌우 거울상으로 실행한다.
- Mirror는 Modifier가 아니라 Action 자체 설정으로 저장한다.
- 기본값은 Mirror ON이고, 특수 연출에서만 OFF로 끌 수 있게 한다.

### 완료 내용

- `actionSettings[actionKey].mirror`를 추가하고 기본값을 `true`로 normalize했다.
- Action 타임라인 설정 줄에 거울 아이콘 Mirror 버튼을 추가했다.
- Mirror 버튼은 ON일 때 "좌우 자동 거울상", OFF일 때 "거울상 사용 안 함" title / aria 상태를 표시한다.
- Move modifier X 이동량이 Mirror ON + 왼쪽 방향에서 반대로 적용되게 했다.
- Action Timeline X / rotation은 기존 `facing` 렌더 transform을 재사용하고, Mirror OFF일 때 자동 반전을 보정하게 했다.
- `docs/11_DATA_MODEL.md`에 `actionSettings.mirror` 저장 필드를 기록했다.
- `docs/13_ACTION_MODEL.md`에 Mirror가 Modifier가 아닌 Action 실행 속성임을 기록했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- Node 모듈 확인으로 Mirror helper, `actionSettings.mirror` normalize / toggle, Move X 방향 계산, Timeline X / rotation 보정을 확인했다.

### 남은 확인 사항

- 실제 브라우저에서 Action Mirror 버튼 아이콘/title/ON-OFF 상태를 확인한다.
- Mirror ON인 Action 하나로 좌우 이동이 같은 데이터를 공유하는지 확인한다.
- Mirror OFF에서 Move X / Timeline X / rotation 자동 반전이 적용되지 않는지 확인한다.

---

## 2026-07-05 15:48 KST

### Task

Trigger Hold / Timeline playback 의미 분리

### 목표

- Trigger의 반복 버튼을 "누르는 동안 계속 실행"하는 Hold 개념으로 정리한다.
- Timeline 재생 방식 버튼을 `once → loop → pingpong → once` 순환 버튼으로 바꾼다.
- 저장 구조는 최대한 유지하고 `repeatWhileHeld` key와 기존 playback 저장 위치를 재사용한다.

### 완료 내용

- Trigger 반복 아이콘을 Hold 의미의 눌림 유지 아이콘으로 바꾸고 title / aria 문구를 "누르는 동안 계속 실행" 기준으로 정리했다.
- 내부 저장 key는 `repeatWhileHeld` 그대로 유지했다.
- Timeline playback helper에 `once`, `loop`, `pingpong` 정규화 / 다음값 / 진행률 계산을 모았다.
- Action / Effect Timeline 재생 방식 버튼이 현재 모드에 맞는 아이콘과 title을 표시하고 클릭마다 순환하게 했다.
- Action Runtime과 Effect debug preview에서 `loop`는 순환, `pingpong`은 왕복으로 해석하게 했다.
- `docs/11_DATA_MODEL.md`에 playback 허용 값과 Hold 표시 의미를 기록했다.
- `docs/13_ACTION_MODEL.md`에 Trigger Hold와 Timeline playback의 책임을 분리해 설명했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- Node 모듈 확인으로 playback cycle이 `once → loop → pingpong → once` 순서이며 진행률이 `loop` 순환 / `pingpong` 왕복으로 계산되는지 확인했다.

### 남은 확인 사항

- 실제 브라우저에서 Trigger Hold 버튼 아이콘/title이 의도대로 보이는지 확인한다.
- 실제 브라우저에서 Timeline 재생 방식 버튼이 `once → loop → pingpong → once` 순서로 바뀌는지 확인한다.
- Hold 버튼을 켰을 때 key hold 동안 Action이 반복 실행되고, key release 뒤 새 반복이 시작되지 않는지 확인한다.

---

## 2026-07-05 15:36 KST

### Task

Modifier graph SVG 아이콘 선택 UI 적용

### 목표

- `graph` 설정을 select 대신 SVG 아이콘 3개 중 하나를 고르는 UI로 바꾼다.
- 기본 선택은 `linear`로 유지한다.
- 저장값은 기존 `linear`, `easeIn`, `easeOut`을 그대로 사용한다.

### 완료 내용

- `modifier_editor_engine.js`에서 `graph` 설정을 전용 아이콘 버튼 picker로 렌더링하게 했다.
- 아이콘은 `easeOut`, `linear`, `easeIn` 순서로 배치해 가운데 Linear가 기본 선택되게 했다.
- 각 버튼은 SVG 축/곡선 아이콘과 `aria-pressed` 상태를 가진다.
- 기존 select 렌더링은 다른 select 설정을 위해 fallback으로 유지했다.
- `settingsPanel.css`에 그래프 아이콘 버튼 스타일을 추가했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- in-app Browser 연결은 현재 사용 가능한 브라우저 목록이 비어 있어 직접 시각 확인하지 못했다.

### 남은 확인 사항

- 실제 브라우저에서 graph SVG 아이콘 버튼 3개와 Linear 기본 선택 상태를 확인한다.

---

## 2026-07-05 15:29 KST

### Task

Action Modifier 구조 변경 MVP

### 목표

- `move`에 `frames`를 추가해 Action Duration과 Move Duration을 분리한다.
- `accelerate` / `decelerate`는 Move 구간의 앞/뒤 속도 분배만 바꾸게 한다.
- `inertia` modifier를 추가해 Move 종료 후 마지막 Move 속도의 일부로 추가 이동하게 한다.
- 새 중력 / 점프 / 바닥 / 마찰 / 속도 시스템은 추가하지 않는다.

### 완료 내용

- `move` 설정을 `x`, `y`, `frames`로 확장했다.
- `accelerate` / `decelerate` 설정을 `frames`, `graph`로 확장했다.
- `inertia` modifier를 추가하고 `amount`, `frames`, `graph` 설정을 지원했다.
- `graph` MVP 옵션은 `linear`, `easeIn`, `easeOut`만 지원한다.
- Modifier UI에 select 설정 렌더링을 최소 추가했다.
- Runtime 이동 계산을 Action 진행률이 아니라 Move 진행 프레임 기준으로 분리했다.
- `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`에 새 schema와 Runtime 의미를 반영했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- Node 시뮬레이션으로 Move frames 분리, Accelerate / Decelerate graph 분포, Inertia 추가 이동, 기존 `strength` fallback, invalid graph fallback을 확인했다.

### 남은 확인 사항

- 실제 브라우저에서 Move / Accelerate / Decelerate / Inertia UI 문구와 이동 체감을 확인한다.

---

## 2026-07-05 15:06 KST

### Task

가속/감속 수식 프레임 기반 이동 가중치로 변경

### 목표

- 수식 라이브러리의 `가속/감속`을 애매한 `강도`가 아니라 액션 프레임 기준 값으로 바꾼다.
- `이동 X/Y`는 액션 전체 총 이동량 의미를 유지한다.
- 가속/감속을 적용해도 총 이동량이 바뀌지 않도록 Runtime 이동 계산을 정규화한다.

### 완료 내용

- `timeline_modifier_data.js`에서 `accelerate` / `decelerate` 설정을 `frames`로 변경하고 UI label을 `가속 프레임` / `감속 프레임`으로 바꿨다.
- 기존 저장 데이터의 `strength` 값은 `frames` fallback으로 읽어 최소 호환되게 했다.
- `action_trigger_engine.js`에서 가속/감속을 easing exponent가 아니라 프레임별 이동 가중치로 계산하도록 변경했다.
- 가속/감속 가중치 총합을 정규화해 `move.settings.x/y`의 총 이동량은 유지되게 했다.
- `docs/11_DATA_MODEL.md`, `docs/13_ACTION_MODEL.md`, `docs/99_TASK_REPORT.md`, `docs/sprint-dashboard.html`에 새 수식 의미를 반영했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- Node 시뮬레이션으로 총 이동량 유지, 가속 초반 이동량 감소, 감속 후반 이동량 감소, 기존 `strength` 값의 `frames` fallback을 확인했다.

### 남은 확인 사항

- 실제 브라우저에서 수식 라이브러리의 `가속 프레임` / `감속 프레임` 문구와 이동 체감을 확인한다.

---

## 2026-07-05 14:20 KST

### Task

Crow Knight 핵심 문서 책임 분리

### 목표

- `03_ARCHITECTURE.md`, `11_DATA_MODEL.md`, `13_ACTION_MODEL.md` 사이의 Action 관련 중복을 줄인다.
- `03_ARCHITECTURE.md`는 현재 전체 구조, `11_DATA_MODEL.md`는 실제 저장 구조, `13_ACTION_MODEL.md`는 Action 제작 모델만 담당하게 한다.
- 문서 간 상세 설명은 상대 파일명 참조로 연결한다.

### 완료 내용

- `03_ARCHITECTURE.md`에서 Action 세부 규칙 설명을 줄이고 `13_ACTION_MODEL.md` / `11_DATA_MODEL.md` 참조로 정리했다.
- `11_DATA_MODEL.md`에서 이상적 Action 목표 모델 설명을 제거하고 현재 저장 source와 schema 중심으로 재구성했다.
- `13_ACTION_MODEL.md`에서 저장 key 반복을 줄이고 Action block 원칙, migration 목표, Trigger / Interaction / Modifier 설계 원칙을 남겼다.
- `00_MANIFEST.md`는 절대 원칙 역할이 명확해 수정하지 않았다.
- `02_DECISIONS.md`는 장황한 설명을 추가하지 않고, 남아 있던 `POSE_KEYS` 용어를 현재 저장 명칭인 `ACTION_KEYS`로 맞추는 최소 정정만 반영했다.
- 코드와 저장 구조는 변경하지 않았다.

### 완료된 QA

- 문서 Prettier 검사 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 다음 기능 작업 전에 `03/11/13` 문서 역할 분리가 실제 탐색 시간을 줄이는지 확인한다.

---

## 2026-07-04 15:50 KST

### Task

Action Timeline 메뉴 클릭 불가 원인 수정

### 목표

- Action 타임라인 줄 오른쪽 `...` 메뉴가 눌리지 않는 원인을 파악한다.
- 메뉴 버튼 바인딩, DOM, CSS 배치 중 어디에서 문제가 생기는지 확인한다.
- Action / Effect 공통 타임라인 메뉴가 잘리지 않게 최소 수정한다.

### 완료 내용

- `setting.html`의 `actionTimelineMenuToggle` / `actionTimelineMenu` DOM은 존재하는 것을 확인했다.
- `editor_control_setup_controller.js`의 `bindControlMoreMenus()`에서 Action Timeline 메뉴 바인딩이 등록되는 것을 확인했다.
- 실제 원인은 `.timeline-settings { overflow: hidden; }` 때문에 absolute 메뉴 패널이 열려도 부모 줄 밖에서 잘리는 구조였다.
- `src/settingsTimeline.css`에서 `.timeline-settings`의 `overflow`를 `visible`로 변경해 Action / Effect 타임라인 메뉴가 줄 밖으로 펼쳐질 수 있게 했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`의 직전 완료 Task 보고를 이번 수정 내용으로 갱신했다.

### 완료된 QA

- Action Timeline 메뉴 버튼 DOM과 공통 메뉴 바인딩 경로를 코드로 확인.
- CSS상 메뉴 clipping 원인 확인.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Action 타임라인 줄 오른쪽 `...` 버튼을 눌렀을 때 `새 키프레임 / 키프레임 삭제` 메뉴가 보이는지 확인한다.
- 실제 브라우저에서 Effect 타임라인 줄 오른쪽 `...` 버튼도 잘리는 문제 없이 보이는지 확인한다.
- 타임라인 설정 줄의 프레임 수 / 재생 / 왕복 / 재생속도 / `...` 버튼 레이아웃이 이전처럼 한 줄로 유지되는지 확인한다.

---

## 2026-07-04 06:38 KST

### Task

SRC MAP Action 파트 지도 정리

### 목표

- `docs/src-map.html`에 Action 전용 파트를 만든다.
- Action에 엮인 Editor / Timeline / Property / Interaction / Modifier / Runtime JS를 역할별로 정리한다.
- `pose` 명칭이 남아 있는 영역과 Action 명칭으로 정리된 영역의 경계를 문서에서 구분한다.

### 완료 내용

- `docs/src-map.html`에 `Action 파트 지도` 섹션을 추가했다.
- Action 흐름을 `Authoring → Trigger → Timeline → Property / Interaction / Modifier → Runtime` 순서로 표시했다.
- Action 관련 JS를 8개 묶음으로 분류했다.
- 묶음: Action Authoring / Trigger 입력, Editor Shell / DOM 연결, Action별 편집 세션, Action Timeline, Action Property / Transform / Canvas, Interaction / Modifier 공통 패널, Action 저장 / 기본값 / Normalize, Action Runtime.
- 각 묶음마다 역할과 주의사항을 추가했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`의 직전 완료 Task 보고를 이번 문서 정리 내용으로 갱신했다.

### 완료된 QA

- `docs/src-map.html`에서 Action 관련 JS 그룹이 렌더링될 수 있는 구조인지 정적 확인.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 `docs/src-map.html`을 열었을 때 `Action 파트 지도` 섹션이 보이는지 확인한다.
- 기존 `docs/src-map.html` 검색 / 필터 / 접미사 역할표가 그대로 동작하는지 확인한다.
- `docs/sprint-dashboard.html` QA 체크박스 localStorage 저장이 그대로 동작하는지 확인한다.

---

## 2026-07-04 04:58 KST

### Task

Action별 수식 저장 key 분리

### 목표

- Action을 바꿔도 이전 Action의 `move` 수식 값이 다른 Action으로 따라 들어가지 않게 한다.
- 수식 UI가 렌더될 때의 Action key를 저장 함수까지 전달해 Action별 modifier 데이터를 확실히 분리한다.
- Runtime과 Property Engine 책임은 변경하지 않는다.

### 완료 내용

- `modifier_editor_engine`이 수식 태그 클릭과 수식 설정 변경 시 렌더 당시 `targetKey`를 콜백으로 전달하게 했다.
- `part_editor_controller`의 수식 저장 함수가 더 이상 `poseSelect.value`만 다시 읽지 않고, 전달받은 target Action key에 저장하게 했다.
- 낡은 입력 이벤트가 나중에 발생해도 현재 선택 Action이 아니라 해당 UI가 렌더된 Action에만 값을 쓰게 했다.
- 현재 선택 Action과 target Action이 같을 때만 적용 수식 카드를 즉시 교체하게 했다.
- Effect 수식 저장도 같은 방식으로 target key 기준 저장을 적용했다.

### 완료된 QA

- Modifier Editor / Part Controller / Effect Controller 모듈 import 확인.
- 수식 태그 클릭 콜백이 target key를 전달하는 구조 확인.
- Action 수식 저장이 전달받은 target key 기준으로 쓰는 구조 확인.
- 관련 JS 파일 문법 검사 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Action A의 `이동 X/Y` 값이 Action B로 복사되지 않는지 확인한다.
- Action B에서 다른 이동값을 넣은 뒤 다시 Action A로 돌아가면 Action A의 값이 그대로 유지되는지 확인한다.
- Action을 빠르게 바꾼 뒤 수식 태그와 숫자 조절이 현재 Action 상태와 충돌하지 않는지 확인한다.

---

## 2026-07-04 04:30 KST

### Task

Action 변경 시 수식 패널 동기화 정리

### 목표

- Action 드롭다운을 바꾸면 이름 / Trigger / Timeline / Property / Interaction / 수식 UI가 같은 Action key 기준으로 갱신되게 한다.
- 수식 카드와 수식 라이브러리가 이전 Action 상태로 남아 잘못된 Action에 쓰는 일을 막는다.
- Runtime과 Property Engine 책임은 변경하지 않는다.

### 완료 내용

- `poseSelect` 변경 처리를 `pose_action_authoring_controls`의 단일 동기화 흐름으로 묶었다.
- Action 변경 시 이름, 삭제 버튼, Trigger UI, Timeline 선택, Property, Interaction, Modifiers가 한 번에 갱신되게 했다.
- 공통 selection binding은 `onPoseChange`가 있을 때만 `poseSelect` change listener를 붙이게 바꿨다.
- 수식 카드와 수식 라이브러리에 렌더 당시 `targetKey`를 기록했다.
- 수식 태그 클릭을 막던 target key guard를 제거하고, 클릭은 현재 선택 Action 저장 흐름을 타게 정리했다.
- Effect 수식 UI에도 같은 target key 기록 구조를 적용했다.

### 완료된 QA

- Action Authoring / Modifier Editor / Editor Control Setup 모듈 import 확인.
- `poseSelect` change listener가 단일 Action 동기화 흐름을 타는 구조 확인.
- 수식 카드와 라이브러리에 target key를 전달하는 구조 확인.
- 수식 태그 클릭을 막던 guard 제거 후 Modifier Editor 모듈 import 확인.
- 관련 JS 파일 문법 검사 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Action을 바꿀 때 수식 카드와 활성 태그가 해당 Action 기준으로 즉시 바뀌는지 확인한다.
- 수식이 없는 Action을 선택하면 이전 Action의 `이동` 카드가 남지 않는지 확인한다.
- Action을 빠르게 여러 번 바꾼 뒤 수식 태그를 눌러도 현재 Action에만 저장되는지 확인한다.

---

## 2026-07-04 04:17 KST

### Task

수식 라이브러리 태그형 UI 정리

### 목표

- 수식 라이브러리를 체크박스 목록이 아니라 태그형 선택 UI로 정리한다.
- `적용된 수식` 묶음 패널을 없애고, 선택한 수식이 각각 독립 카드로 생기게 한다.
- 수식 설정 숫자 조절 UI를 Property의 숫자 스크럽 컨트롤과 통일한다.

### 완료 내용

- `modifier_editor_engine`의 라이브러리 항목을 체크박스에서 태그형 버튼으로 변경했다.
- 선택된 수식은 `적용된 수식` 제목 아래에 모이지 않고 `이동` / `가속` / `감속` 개별 카드로 표시되게 했다.
- 선택된 태그에는 활성 색상이 들어오고, 다시 누르면 비활성화되며 해당 수식 카드가 제거되게 했다.
- 수식 설정 필드는 기존 Property 숫자 스크럽 컨트롤을 재사용하게 했다.
- 수식 설정 저장 시 내부 modifier 객체가 정규화되면서 UI 읽기 값이 낡아지던 문제를 보정했다.
- 수식 카드의 스크럽 / 스텝퍼 조작 후 화면 값과 저장 값이 같은 값으로 갱신되게 했다.
- Action / Effect 모두 같은 Modifier Editor Engine을 사용하므로 동일한 UI 흐름을 적용했다.
- Runtime 연결과 저장 구조는 변경하지 않았다.

### 완료된 QA

- 수식 태그 클릭 시 기존 modifier enabled 상태를 갱신하는 구조 확인.
- 선택된 수식 카드가 라이브러리 카드 위에 개별 카드로 렌더링되는 구조 확인.
- 수식 설정이 Property 숫자 스크럽 컨트롤을 재사용하는 구조 확인.
- `move` 수식 설정값 쓰기 후 저장 값이 갱신되는 것 확인.
- 관련 JS 파일 문법 검사 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 수식 태그 선택 시 활성 색상과 개별 수식 카드 표시를 확인한다.
- Action과 Effect에서 같은 UI가 깨지지 않는지 확인한다.
- 수식 카드의 숫자 스크럽 조절이 Property와 같은 조작감으로 동작하는지 확인한다.
- `move` 수식 Canvas 핸들 MVP 설계를 확인한다.

---

## 2026-07-04 03:53 KST

### Task

적용된 수식 패널 갱신 복구

### 목표

- 수식 라이브러리에서 수식을 체크하면 위쪽 `적용된 수식` 패널에 즉시 표시되게 한다.
- Action 편집 상태가 전체 파츠 / 그룹 / 프레임 미선택이어도 수식 패널 갱신이 끊기지 않게 한다.
- 수식 저장 구조는 기존 `tuning.modifiers.action[actionKey]`를 유지한다.

### 완료 내용

- `part_editor_controller`의 수식 패널 렌더링을 `renderPoseModifierPanels()` / `renderPoseAppliedModifierPanel()` / `renderPoseModifierLibraryPanel()`로 분리했다.
- 여러 파츠 선택, 프레임 미선택, 전체 파츠 편집 경로에서도 `적용된 수식`과 `수식 라이브러리`가 다시 렌더링되게 했다.
- 수식 체크박스 change 이벤트에서 `적용된 수식` 카드만 즉시 교체하도록 보강했다.
- Effect도 같은 Modifier Editor Engine을 쓰므로 동일한 즉시 갱신 경로를 적용했다.
- 수식 체크 이벤트는 기존처럼 `writeTimelineModifierEnabled()`를 사용하고, 저장 위치도 기존 구조를 유지했다.

### 완료된 QA

- 새 Action에 `move` 수식을 체크하면 `tuning.modifiers.action[actionKey]`에 enabled modifier가 저장되는 것 확인.
- `move` 수식 기본 설정으로 `x`, `y`가 생성되는 것 확인.
- 관련 JS 파일 문법 검사 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 `이동`을 체크하면 위쪽 `적용된 수식`에 즉시 나타나는지 확인한다.
- `가속` / `감속` 체크와 해제도 적용된 수식 패널에 바로 반영되는지 확인한다.
- 전체프레임 / 전체파츠 상태에서도 수식 체크와 적용된 수식 표시가 정상인지 확인한다.

---

## 2026-07-04 03:47 KST

### Task

legacy 사전 동작 전면 비활성화

### 목표

- 대기와 사용자가 직접 만든 custom Action 외의 모든 사전 동작을 비활성화한다.
- 플레이어 / NPC Runtime에서 중력, 속도 적분, AI 이동, 공격, 구르기, 방어, 피격 넉백을 자동으로 만들지 않게 한다.
- Basic Action 기본 Trigger와 legacy motion/tuning 값이 다시 동작으로 이어지지 않게 한다.
- 앞으로 움직임과 동작은 `Timeline + Interaction + Modifiers`로 하나씩 직접 만들 수 있게 빈 바탕을 만든다.

### 완료 내용

- 플레이어 Runtime에서 방향키 이동, 중력 적용, `vx/vy` 위치 적분, 점프, 날개짓, 구르기, 공격, 방어, 상태 기반 자동 포즈를 비활성화했다.
- NPC Runtime에서 AI 이동, 추격, 자동 공격, 자동 구르기, 중력 적용, `vx/vy` 위치 적분을 비활성화했다.
- Combat Runtime에서 충돌 밀어내기, 피격 넉백, 피격 스턴 이동, 구르기 후 무적, 자동 리스폰 이동을 비활성화했다.
- `actor_runtime_engine`이 `attack`, `jump`, `roll`, `hurt`, `death` 같은 state 이름으로 포즈를 자동 선택하지 않고, `idle` 또는 custom Action만 사용하게 했다.
- Basic Action 기본 Trigger를 모두 `null`로 만들어 `attack1 → Q`, `roll → W`, `jump → Space` 같은 재연결 경로를 제거했다.
- legacy motion/tuning 기본값과 저장 정규화 값을 0 또는 빈 object로 정리했다.
- Action 모션 설정 영역의 legacy 슬라이더 목록은 계속 비어 있게 유지했다.

### 완료된 QA

- Action 목록 정규화 결과가 `대기 + 사용자가 만든 custom Action`만 남는 것 확인.
- 기존 자동 생성 `moveRight` Action이 custom Action 목록에서 제거되는 것 확인.
- Basic Action 기본 Trigger가 모두 `null`로 반환되는 것 확인.
- legacy movement scalar와 motion setting이 저장 정규화에서 0 또는 빈 object로 정리되는 것 확인.
- 방향키, Q/W/E/Space 입력이 custom Action 없이 위치 / 속도 / 상태를 바꾸지 않는 것 확인.
- NPC update가 AI 이동 / 공격 / 중력을 만들지 않는 것 확인.
- 관련 JS 파일 문법 검사 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 새 Action 생성 전에는 방향키와 Q/W/E/Space가 아무 동작도 만들지 않는지 확인한다.
- 새 custom Action에 Trigger와 `move` 수식을 붙였을 때만 이동이 발생하는지 확인한다.
- 잡몹 / 보스가 자동 추격, 자동 공격, 자동 구르기를 하지 않는지 확인한다.

---

## 2026-07-04 03:33 KST

### Task

대기 외 legacy Action 초기화

### 목표

- Action 제작 목록에서 `대기`만 기본으로 남긴다.
- `run`, `jump`, `roll`, `attack` 등 기존 Basic Action은 삭제 상태로 취급한다.
- Q/W/E/Space 입력이 점프, 구르기, 공격, 방어를 직접 만드는 legacy Runtime 분기를 제거한다.
- Action 모션 설정에 남아 있던 점프/구르기/공격 관련 legacy 슬라이더를 제거한다.

### 완료 내용

- `pose_action_authoring`에서 `idle` 외 기존 `ACTION_KEYS` Action을 자동 삭제 상태로 정규화했다.
- 이전 Task에서 자동 생성하던 `moveRight` / `moveLeft` Action을 더 이상 생성하지 않게 했다.
- 기존 자동 생성 이동 Action key가 저장 데이터에 남아 있어도 custom Action 목록에서 제거되게 했다.
- 플레이어 입력 Runtime에서 Space 점프, Space 날개짓, W 구르기, Q 공격, E 방어 직접 발동을 제거했다.
- Action Trigger Runtime은 유지해 새로 만든 custom Action만 Trigger로 실행되게 했다.
- Action 모션 설정 영역의 legacy 점프/구르기/공격 슬라이더 목록을 비웠다.

### 완료된 QA

- Action 목록 정규화 결과가 `대기 + 사용자가 만든 custom Action`만 남는 것 확인.
- 기존 자동 생성 `moveRight` Action이 custom Action 목록에서 제거되는 것 확인.
- Q/W/E/Space 입력이 legacy 공격 / 구르기 / 방어 / 점프를 활성화하지 않는 것 확인.
- 관련 JS 파일 문법 검사 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 새로고침 후 Action 목록에 기본으로 `대기`만 보이는지 확인한다.
- Q/W/E/Space가 더 이상 공격 / 구르기 / 방어 / 점프를 직접 발동하지 않는지 확인한다.
- 새 custom Action에 Trigger와 `move` 수식을 붙였을 때만 이동이 발생하는지 확인한다.

---

## 2026-07-04 03:23 KST

### Task

legacy 좌우 사전 이동 제거

### 목표

- 방향키 입력만으로 `player.speed` / `runAcceleration` 기반 이동이 발생하지 않게 한다.
- 이동은 Action에 켜진 `move` 수식의 X/Y 이동량이 있을 때만 발생하게 한다.
- `move` 수식이 꺼진 Action은 Trigger가 발동해도 위치가 자동으로 이동하지 않게 한다.

### 완료 내용

- `actor_action_helper`의 좌우 방향키 legacy 이동 분기를 제거했다.
- 방향키가 더 이상 `player.vx = speed` 계열 값을 직접 만들지 않게 했다.
- Action Trigger는 그대로 유지하고, 실제 위치 이동은 `action_trigger_runtime`의 `move` modifier 적용 경로만 사용하게 했다.
- `move` 수식이 꺼진 상태에서는 해당 Action Timeline만 재생되고 X/Y 이동은 발생하지 않는 구조로 정리했다.

### 완료된 QA

- 코드 상에서 좌우 방향키가 `player.speed` / `runAcceleration`으로 `vx`를 만드는 경로가 제거된 것 확인.
- `move` 수식이 없는 Action은 `ArrowRight` Trigger가 발동해도 X 위치와 `vx`가 변하지 않는 것 확인.
- `move x` 수식이 있는 Action은 해당 수식 경로로만 X 위치가 변하는 것 확인.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 `move` 수식을 끈 뒤 방향키를 눌러도 위치 이동이 없는지 확인한다.
- `move` 수식을 다시 켜고 X/Y 이동량을 넣었을 때만 이동하는지 확인한다.

---

## 2026-07-04 03:14 KST

### Task

이동 Action을 move 수식 기반으로 전환

### 목표

- 이동을 `오른쪽으로 이동` / `왼쪽으로 이동` 두 Action으로 나눈다.
- ArrowRight는 `오른쪽으로 이동`, ArrowLeft는 `왼쪽으로 이동` Trigger로 사용한다.
- 고정 `이동 속도` / `이동 가속도` 슬라이더를 Action 제작 UI에서 제거한다.
- 이동은 수식 라이브러리의 `move` modifier가 가진 X/Y 이동량으로 표현한다.

### 완료 내용

- 기본 Action 데이터에 `오른쪽으로 이동`과 `왼쪽으로 이동`을 자동 보장하도록 했다.
- `오른쪽으로 이동`은 `ArrowRight`, 반복 실행, `move x: 50, y: 0` modifier를 가진다.
- `왼쪽으로 이동`은 `ArrowLeft`, 반복 실행, `move x: -50, y: 0` modifier를 가진다.
- 사용자가 기본 이동 Action을 삭제하면 `deletedActionKeys`에 기록해 다시 자동 생성되지 않게 했다.
- Action 모션 설정에서 `이동 속도` / `이동 가속도` 행을 제거했다.
- Custom Action 실행 중에는 legacy 좌우 이동이 겹치지 않도록 막았다.
- move modifier의 X 이동량이 양수면 오른쪽, 음수면 왼쪽을 보도록 방향을 맞췄다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- 기본 `오른쪽으로 이동` / `왼쪽으로 이동` Action 생성 확인.
- 각 이동 Action의 Trigger와 move modifier 값 확인.
- 기본 이동 Action 삭제 상태가 유지되는 것 확인.

### 남은 확인 사항

- 실제 브라우저에서 Action 목록에 `오른쪽으로 이동` / `왼쪽으로 이동`이 보이는지 확인한다.
- 오른쪽 / 왼쪽 화살표를 누르고 있을 때 각 이동 Action이 반복 실행되며 움직이는지 확인한다.
- Action 모션 설정 영역에 `이동 속도` / `이동 가속도` 슬라이더가 더 이상 보이지 않는지 확인한다.

---

## 2026-07-04 02:50 KST

### Task

PSD 새로고침 시 파츠 Transform 보존

### 목표

- 기존 캐릭터의 PSD 업로드 / 새로고침이 파츠 위치와 크기 설정을 초기화하지 않게 한다.
- PSD에서 새 PNG를 다시 뽑더라도 사용자가 맞춘 `tuning.rig` Transform 값을 보존한다.
- 새 캐릭터 생성 시에는 기존처럼 최초 이미지 크기 기준 rig 세팅을 유지한다.

### 완료 내용

- PSD 새로고침 / 기존 캐릭터 PSD 업로드 경로에서는 `syncCharacterRigToAssetSizes()`를 호출하지 않게 했다.
- 새 캐릭터 생성 경로에서는 `syncCharacterRigToAssetSizes()`를 계속 호출해 최초 rig 크기를 잡게 했다.
- PSD 갱신 후 `actor.player.assets`와 PSD source만 갱신하고, 기존 `actor.tuning.rig` Transform은 보존하게 했다.
- PSD 갱신 후 기존처럼 `actor.player.applyTuning(actor.tuning)`과 저장 / 패널 동기화는 유지했다.

### 완료된 QA

- `src/asset_refresh_helper.js` 문법 검사 통과.
- 기존 캐릭터 PSD 갱신 경로가 rig size sync를 끄는 것 확인.
- 새 캐릭터 생성 경로가 rig size sync를 유지하는 것 확인.

### 남은 확인 사항

- 실제 브라우저에서 파츠 위치 / 크기를 수정한 뒤 PSD 새로고침을 눌러 Transform이 유지되는지 확인한다.
- 기존 캐릭터 PSD 업로드 후에도 파츠 위치 / 크기가 유지되는지 확인한다.
- 새 캐릭터 추가 시에는 PNG 크기 기준으로 기본 파츠 크기가 잡히는지 확인한다.

---

## 2026-07-04 02:42 KST

### Task

Setup 선택 캐릭터 프리뷰 조작 대상 연결

### 목표

- Setup에서 선택한 캐릭터를 제작 모드의 조작 대상으로 사용한다.
- 잡몹 / 보스 캐릭터를 선택했을 때도 키보드 입력으로 해당 캐릭터를 움직일 수 있게 한다.
- 설정 패널이 열려 있을 때 카메라 중심도 선택 캐릭터를 따라가게 한다.

### 완료 내용

- 전투가 꺼진 제작 / 프리뷰 상태에서는 `playerActor`가 아니라 현재 `selectedActor`가 입력을 받도록 변경했다.
- 선택 캐릭터가 trash 그룹처럼 게임 화면 대상이 아니면 기존 player를 fallback 조작 대상으로 유지했다.
- 전투 중에는 기존 player 기준 전투 흐름을 유지해 실제 게임 플레이 범위를 건드리지 않았다.
- 설정 패널이 열려 있을 때 일반 카메라도 선택 캐릭터를 중심으로 움직이게 했다.
- 확대 편집 카메라 역시 선택 캐릭터 fallback을 안전하게 처리하도록 정리했다.

### 완료된 QA

- `src/main.js` 문법 검사 통과.
- `src/camera_view.js` 문법 검사 통과.
- 제작 모드 입력 업데이트가 `selectedActor` 기준으로 바뀐 것 확인.
- 전투 모드의 `playerActor` 기준 흐름은 유지된 것 확인.

### 남은 확인 사항

- 실제 브라우저에서 주인공 / 잡몹 / 보스 선택 후 각각 직접 조작되는지 확인한다.
- 선택 캐릭터를 바꿀 때 Canvas 카메라 중심이 해당 캐릭터 쪽으로 이동하는지 확인한다.
- 전투 시작 시에는 선택 캐릭터와 무관하게 기존 player 기준 플레이가 유지되는지 확인한다.

---

## 2026-07-04 02:31 KST

### Task

Live Server 대응 코드 제거 및 4176 dev server 기준 정리

### 목표

- 앞으로 Live Server를 사용하지 않고 Crow Knight dev server `4176`만 사용한다.
- Live Server 대응을 위해 추가했던 우회 코드와 CORS 코드를 제거해 API 흐름을 단순화한다.
- PSD 원본 보존 같은 안전장치는 유지한다.

### 완료 내용

- `local_api_helper.js`를 삭제했다.
- 캐릭터 PSD / Effect / Background PSD / 로컬 저장 API 호출을 다시 `./api/...` 상대 경로로 단순화했다.
- dev server의 Live Server 대응용 CORS / OPTIONS 처리를 제거했다.
- README에서 Live Server 안내를 제거하고, Crow Knight dev server로 열어야 한다는 기준만 남겼다.
- PSD 업로드 시 임시 파일로 먼저 export 검증하고 성공 시 기존 PSD를 교체하는 안전장치는 유지했다.
- dev server가 저장하는 JSON에 마지막 개행을 붙여 Prettier 검사가 반복 실패하지 않게 했다.

### 완료된 QA

- 잔여 `local_api_helper` 참조 제거 확인.
- Live Server 전용 API 우회 제거 확인.
- dev server CORS / OPTIONS 제거 확인.
- `npm run check` 통과.
- `git diff --check` 통과.
- `setting.html` 4176 접근 확인.
- `bosses/boss_01` PSD 새로고침 API 성공 확인.

### 남은 확인 사항

- 실제 브라우저에서 `http://127.0.0.1:4176/setting.html` 기준 PSD 업로드 / 새로고침을 확인한다.
- Effect / Stage asset 업로드와 새로고침이 4176 dev server 기준으로 계속 동작하는지 확인한다.
- `setting.html`이 열린 상태에서 저장 API 요청이 과도하게 반복되지 않는지 확인한다.

---

## 2026-07-04 02:15 KST

### Task

Live Server 5500 제작툴 API 연결

### 목표

- `setting.html`을 Live Server `127.0.0.1:5500`으로 열어도 PSD 업로드 / 새로고침 / 로컬 저장 API가 동작하게 한다.
- 화면은 Live Server가 서빙하고, PSD 처리 API는 Crow Knight dev server `127.0.0.1:4176`이 처리하는 구조로 분리한다.

### 완료 내용

- `local_api_helper.js`를 추가해 5500 / 5501 / 5502에서 열린 화면의 `/api/...` 요청을 `http://127.0.0.1:4176/api/...`로 자동 변환하게 했다.
- 캐릭터 PSD 업로드 / 새로고침 / 생성 / 이동 / 삭제 API가 Live Server에서도 4176 dev server로 가게 했다.
- Effect asset API와 Background PSD API도 Live Server에서 4176 dev server로 가게 했다.
- 로컬 metadata 저장 API와 캐릭터 index 저장 API도 Live Server에서 4176 dev server로 가게 했다.
- dev server에 CORS와 OPTIONS 응답을 추가해 5500 페이지의 cross-origin POST를 받을 수 있게 했다.
- README에 Live Server 사용 시 `npm run dev -- --port 4176`을 같이 켜야 한다는 규칙을 기록했다.

### 완료된 QA

- 4176 dev server 새 코드로 재시작 확인.
- 5500 Origin 기준 CORS preflight `OPTIONS /api/character/refresh` 204 확인.
- 5500 Origin 기준 `POST /api/character/refresh?folder=bosses%2Fboss_01` 200 OK 확인.
- boss PSD 업로드 후 `enemy.psd` 기준 PNG 파츠 13개 export 확인.
- 5500 Origin 기준 `POST /api/characters/index` 200 OK 확인.

### 남은 확인 사항

- 실제 Live Server `http://127.0.0.1:5500/setting.html`에서 PSD 업로드와 PSD 새로고침 UI를 확인한다.
- Live Server에서 캐릭터 생성 / 이동 / 삭제가 4176 API를 통해 동작하는지 확인한다.
- 4176 dev server를 끄면 Live Server 화면에서 로컬 dev server 연결 실패가 표시되는지 확인한다.

---

## 2026-07-04 01:58 KST

### Task

PSD 업로드 / 새로고침 원본 보존 보강

### 목표

- 기존 캐릭터의 `PSD 업로드`가 실패해도 기존 PSD 원본과 PNG 파츠를 망가뜨리지 않게 한다.
- `PSD 업로드`와 `PSD 새로고침` 실패 원인을 서버 응답과 Editor alert에서 확인할 수 있게 한다.

### 완료 내용

- 업로드된 PSD 파일명은 더 이상 사용하지 않고, 선택 캐릭터 폴더 기준 고정 파일명으로 저장하게 했다.
- `players/...` 폴더는 항상 `player.psd`, 그 외 캐릭터 폴더는 항상 `enemy.psd`로 저장한다.
- `PSD 새로고침`도 같은 고정 파일명을 우선 읽어 PNG 파츠를 다시 export하게 했다.
- 캐릭터 PSD 업로드 시 기존 PSD를 바로 덮어쓰지 않고 숨김 임시 파일로 먼저 export 검증하게 했다.
- export가 성공한 경우에만 임시 PSD를 기존 PSD로 교체하게 했다.
- export 실패 시 임시 파일을 삭제하고 기존 PSD는 그대로 보존하게 했다.
- 잘못된 PSD 업로드가 실패한 뒤에도 `PSD 새로고침`이 기존 PSD 기준으로 다시 성공하는 것을 확인했다.
- PSD export 실패 응답을 `PSD export failed: ...` 형태로 내려 Editor에서 원인을 볼 수 있게 했다.

### 완료된 QA

- 다른 파일명으로 업로드해도 `players/player_01`은 `player.psd`로 저장되는 것 확인.
- 다른 파일명으로 업로드해도 `mobs/enemy_01`은 `enemy.psd`로 저장되는 것 확인.
- dev server에서 `POST /api/character/refresh?folder=mobs%2Fenemy_01` 정상 PSD 업로드 200 OK 확인.
- 정상 PSD 업로드 후 PNG 파츠 13개 export 확인.
- dev server에서 `GET /api/character/refresh?folder=mobs%2Fenemy_01` 200 OK 확인.
- PSD가 아닌 파일을 업로드했을 때 실패 응답이 내려오는 것 확인.
- 실패 파일 업로드 뒤에도 기존 `enemy.psd` 기준 `PSD 새로고침`이 200 OK로 복구되는 것 확인.
- 업로드 임시 파일이 로컬 `assets/characters` 아래에 남지 않는 것 확인.

### 남은 확인 사항

- 실제 브라우저에서 Setup > 캐릭터 메뉴 > PSD 업로드와 PSD 새로고침 UI 전체 흐름을 확인한다.
- 잘못된 PSD를 올렸을 때 기존 캐릭터 이미지가 망가지지 않고 오류 메시지가 표시되는지 확인한다.
- PSD 업로드 후 Canvas 이미지가 즉시 갱신되는지 확인한다.

---

## 2026-07-04 01:46 KST

### Task

기존 캐릭터 PSD 업로드 실패 원인 표시 보강

### 목표

- Setup의 `PSD 업로드`가 실패할 때 단순 실패가 아니라 실제 원인을 확인할 수 있게 한다.
- 로컬 dev server API, PSD 레이어 export, PNG 이미지 reload 단계를 분리해 문제 지점을 드러낸다.

### 완료 내용

- 기존 캐릭터 PSD 업로드도 `status`, `error`, `data`를 포함한 상세 결과를 받게 했다.
- dev server가 꺼져 있거나 로컬 API를 못 부르면 `로컬 dev server 연결 실패`를 표시하게 했다.
- PSD 안에서 기대 파츠 레이어를 하나도 못 찾으면 레이어명 규칙 문제를 alert로 알려주게 했다.
- PSD export 후 PNG 이미지 reload가 실패하면 어떤 이미지 경로에서 실패했는지 alert로 표시하게 했다.
- `PSD 업로드` 실패 원인을 콘솔에도 남기게 했다.

### 완료된 QA

- dev server에서 `POST /api/character/refresh?folder=players%2Fplayer_01` 직접 호출 200 OK 확인.
- player PSD 업로드 후 PNG 파츠 13개 export 확인.
- dev server에서 `POST /api/character/refresh?folder=mobs%2Fenemy_01` 직접 호출 200 OK 확인.
- enemy PSD 업로드 후 PNG 파츠 13개 export 확인.
- `node --check src/asset_refresh_helper.js` 통과.
- `node --check src/editor_asset_controller.js` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Setup > 캐릭터 메뉴 > PSD 업로드로 파일 선택 UI 전체 흐름을 확인한다.
- 레이어명이 맞지 않는 PSD를 올렸을 때 새 오류 메시지가 표시되는지 확인한다.
- PSD 업로드 뒤 Canvas 이미지가 즉시 갱신되는지 확인한다.

---

## 2026-07-04 01:33 KST

### Task

새 캐릭터 추가 실패 보정

### 목표

- Setup의 새 캐릭터 추가가 로컬 폴더 충돌 때문에 실패하는 문제를 바로잡는다.
- PSD export는 성공했지만 metadata 등록 전에 실패해 반쯤 만들어진 폴더가 남아도 다음 생성 시 복구 가능하게 한다.

### 완료 내용

- 새 캐릭터 PSD 생성 API 응답을 단순 true/false가 아니라 `status`, `error`, `data`까지 읽을 수 있게 분리했다.
- 새 캐릭터 생성 중 로컬 폴더가 이미 있으면 실패로 끝내지 않고 `englishName_2`, `englishName_3` 후보를 순서대로 시도하게 했다.
- 진짜 PSD 처리 실패와 폴더 충돌을 구분해, 충돌만 자동 재시도하고 다른 오류는 콘솔과 alert에 원인을 남기게 했다.
- dev server가 꺼져 있거나 `setting.html`을 파일로 직접 열어 로컬 API를 못 부르면 `로컬 dev server 연결 실패` 원인을 표시하게 했다.
- 새 캐릭터의 `type`과 기본 tint를 선택 그룹에 맞춰 `players -> player`, `mobs/bosses -> enemy`로 정리했다.
- 디버그 중 생성한 임시 로컬 캐릭터 폴더를 제거했다.

### 완료된 QA

- dev server에서 `POST /api/character/create?folder=mobs%2F_debug_create_codex` 직접 호출 200 OK 확인.
- dev server 직접 호출로 PSD export 13개 생성 확인.
- 디버그 임시 폴더 제거 후 `assets/characters` 폴더가 기본 3개 캐릭터만 남은 것 확인.
- `node --check src/asset_refresh_helper.js` 통과.
- `node --check src/editor_asset_controller.js` 통과.
- `npm run check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 새 캐릭터 추가 UI 전체 흐름을 확인한다.
- 같은 영어명으로 다시 추가할 때 자동 suffix 폴더를 쓰는지 확인한다.
- 새 캐릭터 생성 후 `assets/characters/index.json`과 `runtime/project-default-state.json`이 갱신되는지 확인한다.

---

## 2026-07-04 01:24 KST

### Task

setting.html 로컬 제작툴 분리

### 목표

- `setting.html`은 배포 페이지가 아니라 로컬 제작툴로 고정한다.
- 제작 중 PSD, PNG, 캐릭터 metadata는 로컬 `assets`와 로컬 JSON을 기준으로 움직인다.
- Firebase 연결은 남기되, setting.html 첫 로딩이나 캐릭터 편집 중 자동으로 Firebase / Storage를 읽고 쓰지 않는다.

### 완료 내용

- `setting.html`에 로컬 전용 guard를 추가해 localhost / file이 아닌 환경에서 제작툴이 열리지 않게 했다.
- `.firebaseignore`를 추가해 `setting.html`, `tools`, `docs`, 로컬 업로드 임시 폴더가 Firebase Hosting 배포에 포함되지 않게 했다.
- 시작 로딩에서 Firestore metadata 자동 다운로드와 Firebase Storage 캐릭터 목록 자동 다운로드를 제거했다.
- `setting.html`에서는 랭킹 Firebase 동기화도 자동 실행하지 않게 했다.
- 캐릭터 목록은 로컬 `assets/characters/index.json`을 기준으로 읽게 했다.
- 저장 시 `localStorage`, `runtime/project-default-state.json`, `assets/characters/index.json`이 함께 갱신되도록 했다.
- dev server에 `POST /api/characters/index`를 추가해 캐릭터 생성 / 이동 / 삭제 후 로컬 캐릭터 인덱스를 파일로 저장할 수 있게 했다.
- PSD 업로드 / 새로고침은 Firebase Storage가 아니라 로컬 dev server API로 PSD와 PNG 파츠를 갱신하게 했다.
- README에 로컬 제작툴 실행 방식과 `setting.html` 배포 제외 원칙을 기록했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- `node --check src/project_storage_helper.js` 통과.
- `node --check src/editor_local_only_helper.js` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- dev server에서 `GET /api/character/refresh?folder=players%2Fplayer_01` 200 OK 확인.
- dev server에서 `POST /api/characters/index` 200 OK 확인.
- dev server에서 `POST /api/character/refresh?folder=players%2Fplayer_01` PSD 업로드 200 OK 확인.
- `setting.html` 200 OK 확인.
- `docs/sprint-dashboard.html` 200 OK 확인.
- `assets/characters/index.json` 응답이 `players/player_01`, `mobs/enemy_01`, `bosses/boss_01` 세 개만 포함하는 것 확인.
- `src/editor_local_only_helper.js` 200 OK 확인.

### 남은 확인 사항

- 실제 브라우저에서 `setting.html` 첫 로딩 Network에 Firebase / Storage 자동 요청이 없는지 확인한다.
- 새 캐릭터 생성 / 이동 / 삭제가 로컬 폴더, `character.json`, `assets/characters/index.json`에만 반영되는지 확인한다.
- 배포용 `index.html`에서 Firebase assets를 따르는 별도 production loader를 설계한다.

---

## 2026-07-04 00:14 KST

### Task

Local Character Index 3개 기준 정리

### 목표

- 로컬 우선 제작 모드에서 캐릭터 기준을 `assets/characters/index.json`으로 고정한다.
- 현재 기본 캐릭터는 `players/player_01`, `mobs/enemy_01`, `bosses/boss_01` 세 개만 남긴다.

### 완료 내용

- 로컬에 남아 있던 임시 캐릭터 폴더 `assets/characters/mobs/axeman`을 제거했다.
- 로컬에 남아 있던 임시 캐릭터 폴더 `assets/characters/mobs/spearman`을 제거했다.
- `assets/characters/index.json`에 등록된 세 캐릭터와 실제 로컬 폴더 구조를 맞췄다.
- 시작 시 `assets/characters/index.json`을 읽어 캐릭터 목록을 구성하는 `local_character_asset_storage_helper.js`를 추가했다.
- 브라우저 `localStorage`에 예전 캐릭터가 남아 있어도 `index.json`에 없는 캐릭터는 시작 목록에 포함되지 않게 했다.

### 완료된 QA

- `node --check src/main.js` 통과.
- `node --check src/local_character_asset_storage_helper.js` 통과.
- `find assets/characters -maxdepth 2 -type d` 기준 캐릭터 폴더가 `player_01`, `enemy_01`, `boss_01` 세 개만 남은 것 확인.
- `npm run check` 통과.
- `git diff --check` 통과.
- `setting.html` 200 OK 확인.
- `docs/sprint-dashboard.html` 200 OK 확인.
- `assets/characters/index.json` 응답이 `players/player_01`, `mobs/enemy_01`, `bosses/boss_01` 세 개만 포함하는 것 확인.

### 남은 확인 사항

- 실제 브라우저에서 Setup 목록에 주인공 1개, 잡몹 1개, 보스 1개만 보이는지 확인한다.
- 브라우저 localStorage에 예전 캐릭터가 남아 있어도 Setup 목록에 axeman / spearman이 다시 보이지 않는지 확인한다.

---

## 2026-07-04 00:02 KST

### Task

Editor 로컬 우선 제작 모드 전환

### 목표

- 제작 중인 `setting.html`은 Firebase / Storage 자동 동기화 없이 로컬 파일과 로컬 metadata를 기준으로 동작하게 한다.
- Firebase 연결과 수동 업로드 / 다운로드 버튼은 남기되, 사용자가 누르기 전에는 원격을 읽거나 쓰지 않는다.

### 완료 내용

- 시작 로딩에서 Firestore metadata 자동 다운로드를 제거했다.
- 시작 로딩에서 Firebase Storage 캐릭터 목록 자동 다운로드를 제거했다.
- 캐릭터 생성 / 이동 / 삭제가 Storage를 호출하지 않고 로컬 `assets/characters` 폴더만 수정하게 했다.
- 캐릭터 PSD 업로드 / 새로고침이 Firebase PSD 업로드 없이 로컬 PSD export만 수행하게 했다.
- Effect / Stage asset 새로고침도 자동 Storage 업로드 없이 로컬 export와 로컬 metadata 저장만 수행하게 했다.
- 저장 시 `localStorage`에 저장하고, dev server가 켜져 있으면 `runtime/project-default-state.json`에도 metadata를 저장하게 했다.
- Firebase 업로드 / 다운로드 버튼과 관련 함수는 남겨 수동 동기화 또는 이후 배포 동기화에 사용할 수 있게 했다.
- 로컬 mirror에 누락되어 있던 `assets/characters/mobs/enemy_01` 폴더와 `character.json`을 추가했다.

### 완료된 QA

- `node --check src/main.js` 통과.
- `node --check src/project_storage_helper.js` 통과.
- `node --check src/asset_refresh_helper.js` 통과.
- `node --check src/editor_asset_controller.js` 통과.
- `node --check src/project_state_controller.js` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.
- `npm run dev -- --port 4176` 실행 후 `setting.html` 200 OK 확인.
- `npm run dev -- --port 4176` 실행 후 `docs/sprint-dashboard.html` 200 OK 확인.
- `assets/characters/mobs/enemy_01/body.png` 200 OK 확인.

### 남은 확인 사항

- 실제 브라우저에서 첫 로딩 Network에 Firestore / Storage 자동 요청이 없는지 확인한다.
- 새 캐릭터 생성 / 이동 / 삭제가 로컬 폴더와 metadata에만 반영되는지 확인한다.
- 저장 후 `runtime/project-default-state.json`이 생성 / 갱신되는지 확인한다.

---

## 2026-07-03 23:50 KST

### Task

Character Storage 초기 로딩 병목 점검 및 보정

### 목표

- Storage Source of Truth 전환 뒤에도 `setting.html` 첫 로딩이 과하게 길어지는 원인을 코드와 실제 원격 응답 시간 기준으로 확인한다.
- Storage 폴더 기준은 유지하되, 시작 렌더를 막는 원격 작업을 줄인다.

### 완료 내용

- 실측 결과 Firestore 문서 다운로드는 약 0.6초, Storage 캐릭터 목록 조회는 약 0.5초였지만, Storage의 `character.json` 3개 다운로드가 약 3.3초까지 걸리는 것을 확인했다.
- 시작 로딩에서 Storage `character.json` 원격 다운로드를 기다리지 않게 했다.
- 캐릭터 목록은 Storage 폴더 목록을 기준으로 만들고, 이름/튜닝/표시 metadata는 이미 받은 Firestore saved state를 캐시로 재사용하게 했다.
- Firestore 설정 다운로드와 Storage 캐릭터 목록 조회를 동시에 시작하게 바꿔 원격 대기 시간을 직렬 합산하지 않게 했다.
- actor 생성 시 캐릭터별 PNG 파츠 로딩을 순차 처리하지 않고 병렬 처리하게 했다.
- 초기 렌더 이미지는 계속 `./assets/characters/{folder}/{part}.png` 로컬 mirror를 사용한다.

### 완료된 QA

- Firebase 원격 응답 시간 측정: Firestore 문서 약 638ms, Storage 캐릭터 목록 약 528ms, Storage `character.json` 3개 병렬 다운로드 약 3307ms 확인.
- `node --check src/main.js` 통과.
- `node --check src/firebase_asset_storage_helper.js` 통과.
- `node --check src/actor_factory.js` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.
- `npm run dev -- --port 4176` 실행 후 `setting.html` 200 OK 확인.
- `npm run dev -- --port 4176` 실행 후 `docs/sprint-dashboard.html` 200 OK 확인.

### 남은 확인 사항

- 실제 브라우저에서 `setting.html` 첫 로딩 시간이 줄었는지 확인한다.
- 브라우저 Network에서 초기 로딩 중 `character.json` 3개가 렌더 전에 길게 대기하지 않는지 확인한다.

---

## 2026-07-03 23:30 KST

### Task

Character Storage 로딩 성능 보정

### 목표

- Storage Source of Truth 전환 뒤 시작 로딩이 길어진 원인을 줄인다.
- 캐릭터 목록과 PSD 기준은 Storage를 유지하되, 초기 렌더용 PNG 파츠는 로컬 mirror를 먼저 사용한다.

### 완료 내용

- 로딩 지연 원인이 Storage 스캔 결과의 PNG 파츠 URL을 actor asset source에 넣어 초기 렌더가 Firebase PNG를 전부 받는 구조였음을 확인했다.
- Storage 스캔 결과에서 actor asset source로 넘기는 값은 PSD URL만 남기고 PNG 파츠 URL은 제외했다.
- `character.json` 저장 시에도 PNG 파츠 URL을 넣지 않고 PSD URL만 저장하게 했다.
- 초기 렌더 이미지는 기존처럼 `./assets/characters/{folder}/{part}.png` 로컬 mirror를 사용한다.
- 캐릭터 목록과 `character.json`/PSD 기준은 계속 Storage Source of Truth를 유지한다.

### 완료된 QA

- `node --check src/firebase_asset_storage_helper.js` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.
- `npm run dev -- --port 4176` 실행 후 `setting.html` 200 OK 확인.
- `npm run dev -- --port 4176` 실행 후 `docs/sprint-dashboard.html` 200 OK 확인.

### 남은 확인 사항

- 실제 브라우저에서 `setting.html` 첫 로딩 시간이 줄었는지 확인한다.
- Setup의 캐릭터 목록이 Storage 폴더 수와 계속 일치하는지 확인한다.

---

## 2026-07-03 23:22 KST

### Task

Character Storage Source of Truth 전환

### 목표

- Setup의 캐릭터 목록을 코드 기본값이나 중앙 metadata가 아니라 Firebase Storage의 실제 폴더 구조와 같게 만든다.
- 각 캐릭터 폴더에 `character.json`을 두고 캐릭터별 metadata를 중앙 metadata에서 분리한다.
- `players / mobs / bosses / trash` 폴더 아래 실제 캐릭터 폴더가 곧 Setup에 뜨는 캐릭터 목록이 되게 한다.

### 완료 내용

- Firebase Storage `crow-knight/assets/characters/`를 스캔해 캐릭터 폴더 목록을 읽는 로더를 추가했다.
- Storage에 캐릭터 폴더가 있으면 `saved.characters`보다 Storage 목록을 우선 사용하게 했다.
- 각 캐릭터 폴더의 `character.json`을 읽어 `id / name / group / folder / psdFileName / tuning / assets`를 구성하게 했다.
- `character.json`이 없는 폴더도 PSD/PNG 파일 기준으로 임시 metadata를 만들어 로드할 수 있게 했다.
- `players/player_01`, `mobs/enemy_01`, `bosses/boss_01`에 `character.json`을 추가하고 Firebase Storage에도 업로드했다.
- 기본 fallback `ACTOR_DEFS`를 Storage와 같은 3개 캐릭터로 맞췄다.
- 주인공 판정을 `id === "player"`에서 `group === "players"` / `type === "player"` 기준으로 바꿨다.
- 캐릭터 이동은 Firebase Storage 이동을 기준으로 성공/실패를 판단하고, 로컬 폴더 이동은 mirror 작업으로 처리하게 했다.
- 상단 metadata 업로드 시 캐릭터별 `character.json`도 함께 업로드하게 했다.
- Firestore metadata 저장은 `updateMask`를 붙여 일부 필드 PATCH가 기존 state 본문을 지우지 않게 했다.
- Firestore `projectSettings/crowKnight` 문서를 `stateJson` 포함 상태로 복구했다.

### 완료된 QA

- Firebase Storage 목록에서 실제 캐릭터 폴더가 `players/player_01`, `mobs/enemy_01`, `bosses/boss_01` 세 개로 읽히는 것 확인.
- Firebase Storage에 `character.json` 3개가 업로드된 것 확인.
- Firebase Firestore 문서에 `savedAt`, `stateData`, `stateJson`, `stateEncoding` 필드가 다시 존재하는 것 확인.
- Firestore `stateJson.characters`가 Storage와 같은 3개 캐릭터를 가리키는 것 확인.
- `node --check` 주요 변경 파일 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 Storage 폴더 수와 Setup 목록 수가 같은지 확인한다.
- 캐릭터 이동 / 삭제 후 Storage 폴더와 Setup 목록이 함께 바뀌는지 확인한다.
- Storage 기반 캐릭터 id가 `player`가 아니어도 Runtime player 판정이 정상 동작하는지 확인한다.

---

## 2026-07-03 23:04 KST

### Task

Character 이동 / 삭제 Firebase metadata 동기화 보강

### 목표

- 캐릭터 이동 / 삭제가 로컬에서만 반영되고 새로고침 때 Firebase metadata 때문에 되돌아오는 문제를 막는다.
- 캐릭터 생성 / 이동 / 삭제 / PSD 갱신 같은 구조 변경은 로컬 저장 뒤 Firebase metadata까지 같이 갱신한다.

### 완료 내용

- 원격 Firestore metadata의 `characters`가 빈 배열이면 새로고침 때 기본 `ACTOR_DEFS`가 다시 살아나는 구조를 확인했다.
- `createCharacterFromPsd`, `moveSelectedCharacter`, `deleteSelectedCharacter`, `refreshSelectedCharacterPsd`가 로컬 `saveState()` 후 Firebase metadata 업로드까지 실행하게 했다.
- 공유 asset 폴더 이동은 copy 경로를 유지했다.
- 공유 asset 폴더 삭제는 actor metadata만 제거하는 경로를 유지했다.
- 캐릭터 삭제 API는 로컬 asset 폴더가 이미 없어도 삭제 성공으로 처리한다.

### 완료된 QA

- Firebase Firestore 문서가 읽히는 것 확인.
- 현재 원격 metadata 본문이 비어 있어 새로고침 시 localStorage fallback이 필요한 상태임을 확인.
- `/api/character/copy?from=mobs/enemy_01&to=bosses/enemy1_probe` 200 OK 확인 후 임시 폴더 삭제.
- `/api/character/delete?folder=missing_delete_probe_target` 200 OK 확인.
- `node --check src/editor_asset_controller.js` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 캐릭터 이동 / 삭제 후 Firebase metadata가 즉시 갱신되는지 확인한다.
- 캐릭터 이동 / 삭제 후 새로고침해도 변경된 캐릭터 목록이 유지되는지 확인한다.

---

## 2026-07-03 21:16 KST

### Task

Character 생성 / 이동 Storage 구조 적용 및 정리

### 목표

- Setup에서 새 캐릭터를 만들 때 `characters/{group}/{characterId}/{psdFileName}` 구조를 사용한다.
- 기본 캐릭터와 legacy metadata가 새 `players/player_01`, `mobs/enemy_01` 경로를 보게 한다.
- Storage에서 실제 사용하는 객체만 남기고 예전 캐릭터 폴더를 정리한다.

### 완료 내용

- `characterAssetFolder(group, id)`를 캐릭터 개별 폴더 기준으로 사용하도록 생성 로직을 수정했다.
- 새 캐릭터 생성 시 actor id와 폴더명이 영어명 기반으로 같아지게 했다.
- 새 캐릭터 PSD 파일명은 `players`는 `player.psd`, `mobs/bosses`는 `enemy.psd`를 쓰게 했다.
- 기본 `ACTOR_DEFS`를 `players/player_01`, `mobs/enemy_01` 기준으로 변경했다.
- 기존 `player`, `enemy`, `enemy1~4` metadata는 load 시 새 경로로 보정되게 했다.
- `players/player_01`, `mobs/enemy_01`, `bosses/boss_01`의 로컬 PNG 파츠를 PSD에서 다시 export했다.
- Storage에 새 경로의 PSD와 PNG 파츠를 업로드했다.
- 캐릭터 이동 시 Storage PSD와 PNG 파츠를 함께 새 폴더로 복사하고 기존 경로 객체를 삭제하도록 했다.
- 캐릭터 삭제 시 Storage PSD와 PNG 파츠를 함께 삭제하도록 했다.
- Storage에서 예전 `characters/player`, `characters/enemy`, `enemy1~4/.keep`, 불필요한 `.keep`을 삭제했다.
- 로컬에서도 예전 캐릭터 asset 폴더와 불필요한 placeholder를 정리했다.

### 완료된 QA

- Storage 최종 객체 목록 48개 확인.
- Storage에 새 캐릭터 경로 3개와 각 PNG 파츠가 남아 있는 것 확인.
- 로컬 `assets/characters`에 `players/player_01`, `mobs/enemy_01`, `bosses/boss_01`, `trash/.keep`만 남은 것 확인.
- `node --check` 주요 변경 파일 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 새 캐릭터 생성 / 이동 / PSD 새로고침을 확인한다.
- 실제 브라우저에서 캐릭터 이동 / 삭제 시 Storage PSD와 PNG 파츠 변화까지 확인한다.

---

## 2026-07-03 22:34 KST

### Task

Character 공유 asset 폴더 이동 / 삭제 방어

### 목표

- 기본 enemy처럼 여러 actor가 같은 asset 폴더를 공유할 때 캐릭터 이동과 삭제가 실패하지 않게 한다.
- 공유 source 폴더는 이동/삭제하지 않고, 필요한 경우 target 폴더로 복사한다.

### 완료 내용

- dev server에 `/api/character/copy`를 추가했다.
- `copyCharacterAssetFolder()`를 추가해 로컬 캐릭터 asset 폴더 복사를 지원했다.
- `copyCharacterAssetsInFirebase()`를 추가해 Storage PSD/PNG 파츠를 복사하되 원본은 유지할 수 있게 했다.
- 캐릭터 이동 시 source asset 폴더를 다른 actor도 쓰고 있으면 move 대신 copy를 사용하게 했다.
- 캐릭터 삭제 시 source asset 폴더를 다른 actor도 쓰고 있으면 asset 삭제를 건너뛰고 actor metadata만 삭제하게 했다.
- 캐릭터 삭제 API는 로컬 asset 폴더가 이미 없어도 삭제 성공으로 처리하게 했다.
- `4176` dev server를 재시작해 새 copy API가 반영되게 했다.

### 완료된 QA

- `python3 -m py_compile tools/dev_server.py` 통과.
- `node --check src/editor_asset_controller.js src/firebase_asset_storage_helper.js src/asset_refresh_helper.js` 통과.
- `/api/character/copy?from=mobs/enemy_01&to=copy_probe_target` 200 OK 확인 후 임시 폴더 삭제.
- `/api/character/delete?folder=missing_delete_probe_target` 200 OK 확인.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 브라우저에서 기본 enemy를 보스 그룹으로 이동했을 때 source `mobs/enemy_01`은 유지되고 target 폴더가 생성되는지 확인한다.
- 실제 브라우저에서 기본 enemy 삭제 후 다른 enemy 표시가 깨지지 않는지 확인한다.

---

## 2026-07-03 18:05 KST

### Task

Character Storage 그룹 / 개별 캐릭터 폴더 구조 정리

### 목표

- Storage와 로컬 모두 `characters/{group}/{characterId}/{psd}` 구조로 맞춘다.
- `players/player_01`, `mobs/enemy_01`, `bosses/boss_01` 기본 폴더를 만든다.
- player는 `player.psd`, enemy와 boss는 `enemy.psd`를 넣는다.

### 완료 내용

- 로컬에 `assets/characters/players/player_01/player.psd`를 만들고 기존 player PSD를 복사했다.
- 로컬에 `assets/characters/mobs/enemy_01/enemy.psd`를 만들고 기존 enemy PSD를 복사했다.
- 로컬에 `assets/characters/bosses/boss_01/enemy.psd`를 만들고 기존 enemy PSD를 복사했다.
- Storage에 `crow-knight/assets/characters/players/player_01/player.psd`를 업로드했다.
- Storage에 `crow-knight/assets/characters/mobs/enemy_01/enemy.psd`를 업로드했다.
- Storage에 `crow-knight/assets/characters/bosses/boss_01/enemy.psd`를 업로드했다.

### 완료된 QA

- Storage upload API가 세 PSD 업로드에 모두 200을 반환하는 것 확인.
- Storage 목록에서 `players/player_01/player.psd` 확인.
- Storage 목록에서 `mobs/enemy_01/enemy.psd` 확인.
- Storage 목록에서 `bosses/boss_01/enemy.psd` 확인.
- 로컬 목록에서 같은 경로와 파일 크기 확인.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- Setup 기본 캐릭터 metadata를 새 `group/characterId` 경로로 migration할지 결정한다.
- Storage PNG까지 같은 구조로 맞출지 정책을 확정한다.

---

## 2026-07-03 17:55 KST

### Task

Firebase Storage / Local asset 폴더 기준 맞춤

### 목표

- 정식 asset 경로를 `crow-knight/assets` 기준으로 맞춘다.
- Storage와 로컬에 필요한 폴더가 같이 보이도록 placeholder를 둔다.
- `icons`와 `bosses` 폴더를 Storage와 로컬 양쪽에 유지한다.

### 완료 내용

- Storage에 `crow-knight/assets/icons/.keep`을 추가했다.
- Storage에 `crow-knight/assets/characters/players/.keep`, `mobs/.keep`, `bosses/.keep`, `trash/.keep`을 추가했다.
- Storage에 기존 로컬 호환 폴더인 `enemy1/.keep`, `enemy2/.keep`, `enemy3/.keep`, `enemy4/.keep`을 추가했다.
- 로컬에 `assets/characters/players`, `mobs`, `bosses`, `trash`, `enemy`, `assets/icons`, `assets/effects/attack` placeholder를 추가했다.
- `assets/characters` 하위 폴더명이 로컬과 Storage에서 같은 이름 세트로 보이는 것을 확인했다.

### 완료된 QA

- Storage upload API가 각 `.keep` 업로드에 200을 반환하는 것 확인.
- Storage `crow-knight/assets` 목록에 `backgrounds / characters / effects / icons`가 보이는 것 확인.
- Storage `crow-knight/assets/characters` 목록에 `bosses / enemy / enemy1 / enemy2 / enemy3 / enemy4 / mobs / player / players / trash`가 보이는 것 확인.
- 로컬 `assets/characters` 목록에 같은 하위 폴더명이 보이는 것 확인.
- `npm run check` 통과.

### 남은 확인 사항

- Firebase Console에서 예전 top-level `crow-knight/backgrounds`, `crow-knight/characters`, `crow-knight/effects`가 더 이상 앱에서 쓰이지 않는지 확인하고 삭제한다.
- `player/enemy` 기존 호환 폴더와 `players/mobs` 새 그룹 폴더의 최종 migration 정책을 확정한다.

---

## 2026-07-03 17:06 KST

### Task

Setup 캐릭터 이동 실패 원인 파악 및 방어 처리

### 목표

- `캐릭터 이동 실패`가 뜨는 원인을 파악한다.
- 같은 그룹을 다시 선택한 경우 실패처럼 보이지 않게 한다.
- 로컬 폴더와 metadata가 어긋나 대상 폴더가 이미 있을 때도 다음 후보 경로로 재시도한다.

### 완료 내용

- `/api/character/move`가 대상 폴더 충돌 시 409를 반환하는 것을 임시 폴더 테스트로 확인했다.
- 이동 실패 시 `fromFolder`, `toFolder`, HTTP status, 응답 body를 콘솔에 남기도록 했다.
- 이미 현재 canonical 그룹에 있는 캐릭터의 현재 그룹 버튼은 비활성화되게 했다.
- 같은 경로 이동은 실패가 아니라 성공 no-op으로 처리했다.
- 첫 이동 대상 폴더가 로컬에 이미 있으면 `_2`, `_3` 후보로 최대 8개까지 재시도하게 했다.

### 완료된 QA

- `/api/character/move?from=moveprobe_source&to=mobs/moveprobe_source`가 기존 대상 폴더 충돌 시 409를 반환하는 것 확인.
- `/api/character/move?from=moveprobe_source&to=mobs/moveprobe_source_2`가 성공하는 것 확인.
- 임시 테스트 폴더 삭제 확인.
- `node --check src/asset_refresh_helper.js` 통과.
- `node --check src/editor_asset_controller.js` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 확인 사항

- 실제 Setup 화면에서 현재 그룹 버튼 비활성화와 예전 폴더 구조 캐릭터 이동을 확인한다.
- 이동 실패가 다시 발생하면 브라우저 콘솔의 `Character folder move failed.` 로그에서 status/body를 확인한다.
- Firebase metadata 업로드 / 다운로드 뒤 이동한 그룹이 유지되는지 확인한다.

---

## 2026-07-03 16:55 KST

### Task

Setup 캐릭터 이동 대상 서브메뉴 추가

### 목표

- Setup의 `...` 메뉴에서 `캐릭터 이동`을 누르면 입력창 대신 이동 대상 그룹을 왼쪽 서브메뉴로 보여준다.
- 이동 대상은 `주인공 / 잡몹 / 보스 / 휴지통`으로 유지한다.
- `캐릭터 삭제`는 완전삭제, `휴지통`은 보관용 그룹이라는 정책을 유지한다.

### 완료 내용

- `setting.html`의 캐릭터 작업 메뉴 안에 `characterMoveMenu` 서브메뉴를 추가했다.
- 이동 대상 버튼을 `주인공 / 잡몹 / 보스 / 휴지통` 네 개로 구성했다.
- `src/editor_asset_controller.js`에서 캐릭터 이동의 `prompt()` 입력을 제거하고, 대상 버튼 클릭으로 이동을 실행하게 했다.
- 메뉴 외부 클릭과 `Escape` 입력 시 이동 대상 패널도 함께 닫히게 했다.
- `src/settingsPanel.css` / `src/settingsPanelControls.css`에 이동 대상 패널과 활성 메뉴 항목 스타일을 추가했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`을 이번 Task 기준으로 갱신했다.

### 완료된 QA

- `node --check src/editor_asset_controller.js` 통과.
- `node --check src/editor_panel_dom_helper.js` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.
- `http://127.0.0.1:4176/setting.html` 200 OK 확인.
- `http://127.0.0.1:4176/docs/sprint-dashboard.html` 200 OK 확인.

### 남은 확인 사항

- 실제 화면에서 `캐릭터 이동`을 눌렀을 때 대상 패널이 메뉴 왼쪽에 뜨는지 확인한다.
- 대상 패널에서 `휴지통`을 눌렀을 때 보관용 그룹 이동 흐름이 정상인지 확인한다.
- 대상 패널에서 `주인공 / 잡몹 / 보스`를 눌렀을 때 로컬 asset 폴더와 metadata group이 함께 이동하는지 확인한다.
- Firebase metadata 업로드 / 다운로드 뒤 이동한 그룹이 유지되는지 확인한다.

---

## 2026-07-02 12:40 KST

### Task

Setup PSD / 캐릭터 이동 / 삭제 정책 정리

### 목표

- Setup의 `PSD 업로드`는 현재 선택 캐릭터에 새 PSD를 업로드하는 동작으로 유지한다.
- Setup의 `PSD 새로고침`은 현재 선택 캐릭터를 Storage에 있는 PSD로 다시 불러와 로컬 PNG를 갱신하는 동작으로 유지한다.
- `휴지통`은 삭제 대상이 아니라 `주인공 / 잡몹 / 보스`와 같은 선택 그룹으로 둔다.
- 캐릭터를 보관하려면 `캐릭터 이동 → 휴지통`을 사용하고, `캐릭터 삭제`는 완전삭제로 동작한다.

### 완료 내용

- 캐릭터 그룹 목록에 `휴지통`을 추가해 Setup 선택 드롭다운에 `주인공 / 잡몹 / 보스 / 휴지통`이 보이게 했다.
- 새 캐릭터 생성 모달에서는 휴지통을 선택할 수 없도록 생성 가능 그룹을 `주인공 / 잡몹 / 보스`로 제한했다.
- 메뉴의 별도 `휴지통` 항목과 휴지통 다이얼로그를 제거했다.
- `캐릭터 이동` 메뉴를 추가하고, 선택 캐릭터를 `주인공 / 잡몹 / 보스 / 휴지통` 폴더로 이동할 수 있게 했다.
- `캐릭터 삭제`를 휴지통 이동이 아니라 로컬 asset 폴더 / Firebase PSD / metadata 제거를 시도하는 완전삭제로 변경했다.
- 휴지통 그룹 캐릭터는 Setup에서 선택할 수 있지만 전투 Runtime / Canvas 렌더 / 충돌 계산에서는 제외되도록 했다.
- `파츠 위치 초기화`는 기존 동작 그대로 유지했다.

### 완료된 QA

- `node --check src/editor_asset_controller.js src/main.js src/character_group_data.js src/actor_factory.js src/particle_effects_engine.js` 통과.
- `npm run check` 통과.
- `git diff --check` 통과.
- `setting.html` / `sprint-dashboard.html` 200 OK 응답 확인.

### 남은 QA

- Setup UI에서 PSD 업로드 / PSD 새로고침 / 캐릭터 이동 / 완전삭제를 실제 파일로 확인한다.
- 휴지통 그룹 캐릭터가 Runtime에 참여하지 않는지 확인한다.

---

## 2026-07-02 12:22 KST

### Task

Task Report 파일명 변경

### 목표

- 기존 `docs/99_CURRENT_SPRINT.md` 파일명을 문서 역할에 맞게 `docs/99_TASK_REPORT.md`로 변경한다.
- 문서, 대시보드, 히스토리, 개발 규칙에 남아 있는 이전 파일명 참조를 새 파일명으로 정리한다.
- 다음 작업부터 Task Report 갱신 대상이 `docs/99_TASK_REPORT.md`임을 명확히 한다.

### 완료 내용

- `docs/99_CURRENT_SPRINT.md`를 `docs/99_TASK_REPORT.md`로 이동했다.
- `AGENTS.md`, `docs/00_MANIFEST.md`, `docs/98_SPRINT_HISTORY.md`, `docs/src-map.html`, `docs/completed-sprints/README.md`, `docs/sprint-dashboard.html`의 참조를 새 파일명으로 바꿨다.
- `docs/src-map.html`의 Task Report 링크가 `./99_TASK_REPORT.md`를 가리키도록 갱신했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`의 직전 완료 Task 보고를 이번 파일명 변경 Task로 갱신했다.
- 이전 미확인 QA는 `완료 안 된 QA`로 이월했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 새 파일 존재와 이전 파일 제거를 확인한다.
- AGENTS / Manifest / SRC Map / completed-sprints README의 운영 참조가 새 파일명으로 바뀌었는지 확인한다.
- 대시보드 200 OK 응답을 다시 확인한다.

### 남은 QA

- `docs/src-map.html`에서 Task Report 링크가 `99_TASK_REPORT.md`로 이동하는지 화면 확인.
- 대시보드에서 이번 파일명 변경 Task와 이월 QA가 보이는지 확인.

---

## 2026-07-02 12:17 KST

### Task

QA 체크 표시 / 미완료 QA 이월 규칙 정리

### 목표

- Sprint Dashboard의 `해야 할 QA`를 실제 체크 가능한 QA 목록으로 만든다.
- 다음 Task Report 갱신 때 체크 완료된 QA는 제거하고, 체크되지 않은 QA는 `완료 안 된 QA`로 이월한다.
- QA 문구를 확인 위치와 확인 기준이 보이도록 더 친절하게 작성한다.

### 완료 내용

- `docs/sprint-dashboard.html`의 QA 항목을 체크박스 UI로 변경했다.
- QA 체크 상태를 브라우저 `localStorage`에 저장하도록 했다.
- `docs/99_TASK_REPORT.md`에 `완료 안 된 QA` 섹션을 추가했다.
- 이전 Setup 캐릭터 그룹 / 생성 / 휴지통 QA를 `완료 안 된 QA`로 이월했다.
- QA 문구를 `어디에서`, `무엇을`, `어떤 기준으로` 확인해야 하는지 알 수 있게 풀어서 작성했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 대시보드 200 OK 응답을 다시 확인한다.

## 2026-07-04 05:36 KST

### Task

Action 문제 추적을 위한 SRC MAP 최신화

### 목표

- 현재 Action 파트에서 어떤 JS들이 엮여 있는지 다시 확인한다.
- 수식 라이브러리가 꺼져 보이는데 Runtime이 이전 이동값으로 움직이는 문제를 구조 관점에서 정리한다.
- 수정 전에 원인 후보와 수정 계획을 분리한다.

### 완료 내용

- `docs/10_SRC_MAP.md`에 Action Editor 연결 지도, Action별 편집 상태 지도, Action Runtime 연결 지도를 추가했다.
- Headless Chrome QA로 `customAction1` 전환 시 `settings.playback` undefined 예외가 발생하는 것을 확인했다.
- `project_data_normalizer_helper.js`의 `ensureActionSettings(tuning)`이 custom Action key를 넘기지 않아 custom Action `actionSettings`를 제거할 수 있음을 확인했다.
- Action 변경 렌더가 중간에 터지면서 수식 UI가 이전 Action 상태로 남는 것이 현재 증상의 직접 원인임을 정리했다.
- `modifier_editor_engine.js`의 optimistic UI update가 실제 저장 상태와 UI 표시를 갈라놓을 수 있음을 문서화했다.
- `project_storage_helper.js`가 `localStorage`를 `runtime/project-default-state.json`보다 우선하므로 화면 상태와 파일 검색 결과가 다를 수 있음을 문서화했다.
- 제작 모드 조작 actor는 `main.js`의 `editorControlActor()`가 결정하므로 Action 패널 actor와 실제 움직이는 actor가 다를 수 있음을 문서화했다.
- 큰 파일 줄 수를 최신 상태로 갱신했다.

### 완료된 QA

- Action 관련 Editor / Data / Runtime 연결 파일을 검색해 확인했다.
- `runtime/project-default-state.json` 기준으로 `player_01`의 `customAction1/2/3` 이동 수식이 아직 enabled 상태인 것을 확인했다.
- Headless Chrome에서 `customAction1` 전환 시 `timeline_panel_sync_helper.js` 예외를 재현했다.
- `mergeTuning()`은 custom Action `actionSettings`를 정상 생성하지만, `ensureActionSettings()`가 다시 제거할 수 있음을 코드로 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 QA

- 실제 브라우저 콘솔에서 UI 상태와 tuning 저장 상태를 대조한다.
- Action 패널 actor id와 Runtime 조작 actor id가 같은지 확인한다.

---

## 2026-07-04 05:21 KST

### Task

Runtime modifier 최신 상태 참조 보정

### 목표

- 수식 라이브러리에서 `이동`을 껐는데도 이전 이동 수식 값대로 움직이는 문제를 막는다.
- Runtime이 낡은 `player.actions` modifier 사본만 보지 않고 현재 tuning의 modifier 상태를 우선 해석하게 한다.
- Runtime 이름별 Action 분기는 늘리지 않는다.

### 완료 내용

- `actor_runtime_engine.applyTuning()`이 현재 `modifiers` 데이터를 `player.modifiers`에 보관하게 했다.
- `action_trigger_runtime`이 Action 실행 / Trigger 매칭 시 `player.modifiers.action[actionKey]`를 우선 사용하게 했다.
- `player.actions`에 남은 낡은 modifier 사본보다 최신 modifier 저장소가 우선되도록 `runtimeActions()` 경로를 추가했다.
- 저장 파일 확인 결과 현재 `player_01`의 `우로이동(customAction1)` `move.enabled`는 아직 `true`로 남아 있었다.

### 완료된 QA

- Runtime 이동 수식 실행부가 `enabled` modifier만 사용하는 구조인지 확인했다.
- Runtime이 최신 `player.modifiers.action[actionKey]`를 우선 참조하는 구조인지 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 남은 QA

- 실제 브라우저에서 `이동` 수식을 끄면 이전 X/Y 이동값으로 움직이지 않는지 확인한다.
- `이동` 수식을 다시 켰을 때만 설정한 X/Y 이동량으로 움직이는지 확인한다.

---

## 2026-07-04 05:14 KST

### Task

Action 편집 세션 분리 리팩토링

### 목표

- Action을 바꿔도 파츠 선택, Property, 타임라인 선택, 수식 UI 상태가 서로 간섭하지 않게 한다.
- 기존 공통 Property / Timeline / Modifier 엔진은 유지하고 Action별 편집 상태 저장소만 분리한다.
- 새 파일명은 `snake_case`를 지킨다.

### 완료 내용

- `src/action_edit_state.js`를 추가했다.
- Action key별로 타임라인 선택, 선택 파츠, 활성 파츠, 그룹 변형값을 따로 저장하게 했다.
- Pose Timeline Controller가 Action 세션의 타임라인 선택 프록시를 사용하게 했다.
- Part / Canvas / Undo / Lifecycle이 같은 Action 세션 상태를 보도록 연결했다.
- Action 변경 시 선택 상태를 무조건 초기화하지 않고 해당 Action의 세션을 렌더하게 했다.
- Actor 변경과 패널 닫기 같은 큰 전환에서는 Action 편집 세션 전체를 초기화하게 했다.

### 완료된 QA

- `npm run check` 통과.
- `git diff --check` 통과.
- 4176 dev server 실행 확인.

### 남은 QA

- 실제 브라우저에서 Action A/B 전환 시 파츠 선택, Property, 타임라인 선택, 수식 UI가 독립적으로 동작하는지 확인한다.
- 인앱 브라우저 연결이 되지 않아 화면 클릭 QA는 아직 수행하지 못했다.

---

### 남은 QA

- 대시보드에서 QA 체크박스 클릭 / 새로고침 유지 동작을 화면에서 확인한다.
- 다음 Task Report 갱신 때 체크 완료 QA는 제거하고, 미체크 QA는 완료 안 된 QA로 이월한다.

---

## 2026-07-02 12:13 KST

### Task

Task Report 반영 방식 보정

### 목표

- 작은 문서 정리 Task도 완료된 작업이면 `99_TASK_REPORT.md`의 직전 완료 Task 보고에 남긴다.
- `docs/sprint-dashboard.html`도 같은 직전 Task 내용을 보여주게 한다.

### 완료 내용

- `99_TASK_REPORT.md`의 직전 완료 Task 보고를 `Current Task Report 표시명 정리` 내용으로 교체했다.
- `docs/sprint-dashboard.html`의 직전 완료 Task 보고도 같은 내용으로 맞췄다.
- 이전 Setup 캐릭터 그룹 / 생성 / 휴지통 작업 기록은 이 히스토리 문서에 유지했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 대시보드 200 OK 응답을 다시 확인한다.

### 남은 QA

- 대시보드에서 `Current Task Report`와 `직전 완료 Task 보고`가 보이는지 화면 확인.

---

## 2026-07-02 12:09 KST

### Task

Current Task Report 표시명 정리

### 목표

- `99_TASK_REPORT.md`와 대시보드가 실제로는 직전 Task를 보고하는 문서라는 점이 제목에서 드러나게 한다.
- 파일명은 기존 작업 루틴과 호환되도록 유지한다.

### 완료 내용

- `docs/99_TASK_REPORT.md`의 최상단 제목을 `CURRENT TASK REPORT`로 변경했다.
- `직전 완료 Task` 섹션 이름을 `직전 완료 Task 보고`로 변경했다.
- `docs/sprint-dashboard.html`의 `<title>`, H1, 섹션 제목을 Current Task Report 기준으로 변경했다.
- 기존 캐릭터 그룹 / 생성 / 휴지통 Task의 QA 항목은 유지했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 대시보드 200 OK 응답을 다시 확인한다.

### 남은 QA

- 없음.

---

## 2026-07-02 12:04 KST

### Task

Setup 캐릭터 그룹 / 생성 / 휴지통 구조 정리

### 목표

- Setup 캐릭터 선택을 `주인공 / 잡몹 / 보스` 그룹으로 나눈다.
- 새 캐릭터 생성 시 영어명 / 한글명 / 그룹 / PSD를 명확히 입력하게 한다.
- 삭제한 캐릭터는 즉시 제거하지 않고 휴지통으로 보낸다.
- 휴지통 캐릭터는 Runtime actor가 아니라 metadata로 관리한다.

### 완료 내용

- `src/character_group_data.js`를 추가해 캐릭터 그룹과 휴지통 group key를 공통화했다.
- Setup 선택 UI에 `actorGroupSelect`를 추가하고 그룹별 캐릭터 필터링을 연결했다.
- 새 캐릭터 생성 모달을 추가했다.
- 새 캐릭터 폴더를 `assets/characters/{group}/{englishName}`로 만들도록 했다.
- Firebase Storage PSD 경로가 `characters/{group}/{englishName}/{englishName}.psd`를 보존하도록 slash path sanitizer를 보정했다.
- 로컬 dev server에 `/api/character/move`, `/api/character/delete`를 추가했다.
- 캐릭터 삭제를 휴지통 이동으로 바꾸고, 휴지통 UI에서 완전삭제할 수 있게 했다.
- `99_TASK_REPORT.md`를 새 고정 템플릿으로 재작성했다.
- `sprint-dashboard.html`을 현재 Sprint 문서 요약만 보여주는 구조로 개편했다.

### 완료된 QA

- `npm run check` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `git diff --check` 통과.
- `http://127.0.0.1:4176/setting.html` 200 OK 확인.
- `http://127.0.0.1:4176/docs/sprint-dashboard.html` 200 OK 확인.
- 임시 폴더로 `/api/character/move`, `/api/character/delete` nested path 이동 / 삭제 확인.

### 남은 QA

- 실제 브라우저에서 새 캐릭터 모달과 PSD 파일 선택 흐름 확인.
- 휴지통 이동 후 새로고침 / Firebase metadata 업로드 / 다운로드 확인.
- 기존 `player`, `enemy*` fallback asset 경로와 새 그룹 경로의 공존 확인.

---

## 2026-07-04 01:20 KST

### Task

Action 수식 라이브러리 / 타임라인 직접 QA 재검증

### 목표

- 수식 라이브러리를 눌러도 적용 카드가 뜨지 않는 문제를 실제 `setting.html` 경로로 다시 확인한다.
- Action 타임라인 선택이 안 되는 문제를 실제 입력에 가깝게 재검증한다.
- custom Action 전환 중 Editor 렌더가 끊기는 원인을 수정한다.

### 완료 내용

- Headless Chrome CDP로 `setting.html`을 열고 `customAction1` 전환 중 `settings.playback` undefined 예외가 발생하는 것을 재확인했다.
- `project_data_normalizer_helper.js`의 `ensureActionSettings(tuning)`이 custom Action key를 포함해 normalize하도록 수정했다.
- 수정 후 `customAction1` 이동 수식 카드가 현재 Action key 기준으로 표시되는 것을 확인했다.
- 이동 수식 태그를 끄면 적용 카드가 사라지고 저장값이 `enabled:false`로 변경되는 것을 확인했다.
- `customAction1` / `customAction2`를 오가며 수식 카드와 태그가 Action별 저장 데이터 기준으로 분리 표시되는 것을 확인했다.
- 설정 패널을 실제로 연 상태에서 좌표 입력으로 시작 키프레임과 빈 슬롯 선택이 정상 동작하는 것을 확인했다.
- `10_SRC_MAP.md`, `99_TASK_REPORT.md`, `sprint-dashboard.html`을 이번 QA 결과 기준으로 갱신했다.

### 완료된 QA

- `http://127.0.0.1:4176/setting.html` 200 OK 확인.
- Headless Chrome CDP에서 수식 카드 표시 / 수식 태그 해제 / Action 재전환 QA 수행.
- Headless Chrome CDP에서 타임라인 시작 키프레임 / 빈 슬롯 선택 QA 수행.
- QA 중 `Runtime.exceptionThrown` 없음 확인.

### 남은 QA

- 실제 사용자 브라우저에서 같은 흐름을 마우스로 반복 확인.
- Runtime Trigger 실행 중 move modifier enabled 상태가 이동에 반영되는지 확인.
- Modifier 숫자 입력 / 스크럽 컨트롤이 현재 수식 카드에서 정상 변경되는지 확인.

---

## 2026-07-04 02:10 KST

### Task

Action 파일명 / SRC MAP 네이밍 정리

### 목표

- Action 파트에서 `pose`로 남아 있던 편집 계층 파일명을 `action` 기준으로 바꾼다.
- 새 파일명은 snake_case와 접미사 역할표를 따른다.
- 역할표에 맞지 않는 파일 목록과 현재 하는 일을 `src-map.html`에 정리한다.

### 완료 내용

- `pose_action_authoring_helper.js`를 `action_authoring_data.js`로 변경했다.
- `pose_action_authoring_controller.js`를 `action_authoring_controller.js`로 변경했다.
- `timeline_pose_adapter.js`를 `timeline_action_adapter.js`로 변경했다.
- `timeline_pose_controller.js`를 `timeline_action_controller.js`로 변경했다.
- `timeline_pose_panel_view.js`를 `timeline_action_panel_view.js`로 변경했다.
- 관련 import/export 함수명을 Action 기준으로 정리했다.
- `docs/10_SRC_MAP.md`와 `docs/src-map.html`에 Action Authoring 연결 지도와 네이밍 보류 파일 목록을 추가했다.
- 저장 key인 `actionSettings`, `actionOffsets`, `modifiers.action`, DOM id인 `poseSelect`는 migration 전까지 유지하기로 문서화했다.

### 완료된 QA

- rename 대상 JS 파일 문법 검사 통과.
- 남은 `pose_action_authoring` / `timeline_pose_*` 코드 import가 없는지 검색 확인.

### 남은 QA

- 실제 브라우저에서 Action 탭 생성/삭제/Trigger/Timeline/수식 흐름을 확인한다.
- 기존 저장 데이터가 migration 없이 열리는지 확인한다.

---

## 2026-07-04 06:19 KST

### Task

Action 저장 스키마 명칭 통일

### 목표

- 기존 저장 데이터 호환을 포기하고 Action 저장 키를 `action` 기준으로 통일한다.
- `poseSettings`, `poseOffsets`, `deletedPoseActions`, `modifiers.pose`를 더 이상 사용하지 않는다.
- Runtime Trigger의 역할과 남은 `pose` 명칭을 분리해서 보고한다.

### 완료 내용

- `STORAGE_KEY`를 `crowKnight.actorTuning.v3`로 올려 기존 v2 localStorage를 사용하지 않게 했다.
- `deletedPoseActions`를 `deletedActionKeys`로 변경했다.
- `poseSettings` / `poseOffsets`를 `actionSettings` / `actionOffsets`로 변경했다.
- `modifiers.pose[actionKey]`를 `modifiers.action[actionKey]`로 변경했다.
- `ACTION_KEYS`, `ACTION_PART_KEYS`, `ACTION_FRAME_KEYS`, `ACTION_FPS` 기준으로 Action Timeline 상수를 정리했다.
- Action 수식 UI가 `action` scope에 쓰고 Runtime도 `player.modifiers.action[actionKey]`를 읽도록 맞췄다.
- `actionPreview.pose`를 `actionPreview.action`으로 정리했다.
- `10_SRC_MAP.md`, `99_TASK_REPORT.md`, `sprint-dashboard.html`, `src-map.html`을 새 저장 스키마 기준으로 갱신했다.

### 완료된 QA

- `poseSettings`, `poseOffsets`, `deletedPoseActions`, `modifiers.pose` 코드 참조가 없는지 검색 확인.
- `ensureTimelineModifierTarget(..., 'action', actionKey)` 저장 경로와 Runtime `player.modifiers.action[actionKey]` 읽기 경로를 코드로 확인.
- ESLint 통과.

### 남은 QA

- 실제 브라우저에서 v3 저장 키로 기본 Action 데이터가 시작되는지 확인한다.
- Action JSON export/import가 새 저장 키 기준으로 정상인지 확인한다.
- Runtime Trigger 실행 중 move modifier enabled 상태가 이동에 반영되는지 확인한다.

---

## 2026-07-04 06:19 KST

### Task

Action UI / Edit Context 명칭 정리

### 목표

- Action 편집 UI와 edit context에 남아 있던 `pose` 명칭을 `action` 기준으로 정리한다.
- 공통 Timeline CSS는 `pose`나 `action` 전용이 아닌 `timeline-*` 이름으로 바꾼다.
- 실제 렌더링 자세 계산을 뜻하는 `pose`만 남긴다.

### 완료 내용

- `setting.html`의 Action section을 `data-section="action"`으로 변경했다.
- `poseSelect`, `poseName`, `poseTrigger*`, `posePartFields` 등 Action DOM id를 `action*` 기준으로 변경했다.
- edit context 문자열을 `'pose'`에서 `'action'`으로 변경했다.
- `selectedPoseParts`, `activePosePartKey` 등 Action part selection 상태명을 `selectedActionParts`, `activeActionPartKey`로 변경했다.
- `.pose-timeline`, `.pose-keyframe`, `.pose-slot` 등 공통 Timeline CSS class를 `.timeline-view`, `.timeline-keyframe`, `.timeline-slot`로 변경했다.
- `action_authoring_controller.js`에서 input 변수와 imported `actionName()` 함수가 충돌하던 이름을 분리했다.
- `10_SRC_MAP.md`, `12_EDITOR_FLOW.md`, `99_TASK_REPORT.md`, `sprint-dashboard.html`, `src-map.html`을 새 명칭 기준으로 갱신했다.

### 완료된 QA

- Action 편집 경로에서 `poseSelect`, `selectedPoseParts`, `editContext === 'pose'`, `.pose-timeline`, `.pose-keyframe` 참조가 없는지 검색 확인.
- 전체 `src`에서 남은 `pose` 명칭이 `actor_pose_helper.js`, `actor_renderer.js`, `interaction_region_engine.js` 중심의 렌더링 자세 계층인지 확인.
- ESLint 통과.

### 남은 QA

- 실제 브라우저에서 Action 생성 / 삭제 / 이름 변경 / Trigger 녹화가 정상인지 확인한다.
- Action Timeline 키프레임 선택과 수식 라이브러리 표시가 정상인지 확인한다.
- Effect Timeline이 공통 `timeline-*` class 변경의 영향을 받지 않았는지 확인한다.

---

## 이전 누적 기록 요약

### Action Interaction & Modifiers Sprint에서 이미 반영된 큰 흐름

- Property / Interaction / Modifiers를 같은 Timeline Target 아래 형제 패널로 분리했다.
- Property Engine은 Transform 전용으로 유지했다.
- Interaction Editor Engine은 충돌 / 피격 / 공격 / 방어 체크와 Box 편집을 담당한다.
- Modifiers Editor Engine은 수식 라이브러리와 적용된 수식 UI를 담당한다.
- 수식 MVP는 `이동`, `가속`, `감속` 3개로 축소했다.
- Action Trigger Editor는 녹화 기반 single / sequence / hold combo 입력을 지원한다.
- Action / Effect 상단 UI와 Timeline toolbar를 정리했다.
- Setup / Action / Effect Property scrub UI를 compact 숫자형 구조로 통일했다.
- Firebase metadata는 Firestore 단일 문서 저장 흐름으로 정리했다.
- Firebase asset은 backgrounds / characters / effects / icons root 규칙을 따른다.
