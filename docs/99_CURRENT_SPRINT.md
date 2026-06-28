# 99_CURRENT_SPRINT.md

## Sprint 목표

InteractionBox legacy naming 제거.

Interaction system을 `InteractionObject` + Runtime `InteractionRegion` 용어로 정리한다.

## 핵심 원칙

- 모든 editable object는 interaction state를 가질 수 있다.
- fallback interaction target도 editable object다.
- 저장 key는 `...InteractionObject`를 사용한다.
- Runtime combat 계산값은 `InteractionRegion`이다.
- 과거 `InteractionBox` 저장값은 호환하지 않는 clean init 방향이다.

## 완료한 작업

- `src/tuningInteractionBoxes.js`를 `src/tuningInteractionObjects.js`로 rename.
- fallback 저장 key 변경:
  - `collisionInteractionBox` → `collisionInteractionObject`
  - `hurtInteractionBox` → `hurtInteractionObject`
  - `attackInteractionBox` → `attackInteractionObject`
  - `guardInteractionBox` → `guardInteractionObject`
- type/target type 변경:
  - `interactionBox` → `interactionObject`
- 관련 constant/helper 이름을 `INTERACTION_OBJECT_*`, `isInteractionObjectPartKey()` 계열로 변경.
- local tuning storage key를 `crowKnight.actorTuning.v2`로 변경.
- obsolete local tuning key `crowKnight.actorTuning.v1` 삭제 처리 추가.
- old top-left interaction object normalize 보정 제거.
- debug flag를 `debugInteractionObjects`로 변경.
- palette CSS class를 `part-*-interaction-object`로 변경.
- UI aria label과 part label을 `히트박스/박스` 대신 `판정 영역/영역` 기준으로 변경.
- debug preview 함수 이름을 box 중심에서 target/region 중심으로 변경.
- 문서의 InteractionBox 중심 설명을 InteractionObject/InteractionRegion 기준으로 갱신.

## 변경한 파일과 변경 이유

- `src/tuningInteractionObjects.js`
  - fallback interaction object key/role/parent helper의 기준 파일.
- `src/gameConfig.js`
  - `POSE_PART_KEYS`가 새 object key를 사용.
  - local storage key를 v2로 변경.
  - obsolete local storage key 목록 추가.
- `src/saveStateStorage.js`
  - load/save 시 obsolete local tuning key 삭제.
- `src/playerDefaultRig.js`
  - 기본 rig 저장 key와 type을 InteractionObject로 변경.
- `src/playerDefaultTuning.js`
  - 기본 attack frame value가 `attackInteractionObject`에 연결.
- `src/tuningNormalize.js`
  - 새 key normalize.
  - 과거 top-left 보정 제거.
- `src/interactionRegionRuntime.js`
  - fallback key 참조를 새 object key로 변경.
- `src/tuningParts.js`
- `src/tuningSelectionPalette.js`
- `src/tuningPanelDom.js`
- `src/tuningLabels.js`
- `src/tuningFieldGroups.js`
- `src/tuningFieldValues.js`
- `src/canvasVisualValues.js`
- `src/editHandleGeometry.js`
- `src/puppetPlayerRenderer.js`
- `src/settingsDebugRenderer.js`
- `src/tuningPanelDebugView.js`
  - import/helper/type 이름을 InteractionObject 기준으로 변경.
- `src/partPicker.css`
  - palette class 이름을 InteractionObject 기준으로 변경.
- `setting.html`
  - palette aria label 용어 정리.
- `docs/00_MANIFEST.md`
- `docs/02_DECISIONS.md`
- `docs/03_ARCHITECTURE.md`
- `docs/10_SRC_MAP.md`
- `docs/11_DATA_MODEL.md`
- `docs/12_EDITOR_FLOW.md`
- `docs/99_CURRENT_SPRINT.md`
  - 현재 구조와 용어 반영.

## 변경된 데이터 흐름

```text
Setup fallback interaction object
→ tuning.rig[interactionObjectKey]
→ puppetPlayerRenderer image-less rect
→ player.editHandles[interactionObjectKey]
→ handle/debug preview
```

```text
Action editable object
→ tuning.poseOffsets[poseKey][partKey]
→ active/attack/hurt/collision/guard/reaction settings
→ renderer records active object regions
→ interactionRegionRuntime
→ combatSystem
```

```text
No active object region
→ fallback tuning.rig.attackInteractionObject / hurtInteractionObject / collisionInteractionObject / guardInteractionObject
→ Runtime InteractionRegion
```

## 제거한 중복 또는 예외 처리

- `InteractionBox` module/file name 제거.
- `interactionBox` type string 제거.
- `...InteractionBox` 저장 key 제거.
- old top-left interaction object normalize 보정 제거.
- obsolete local tuning v1 삭제 처리 추가.
- `debugInteractionBoxes` 이름 제거.
- palette `*-interaction-box` CSS class 제거.
- 코드와 일반 문서에서 `InteractionBox`, `interactionBox`, `INTERACTION_BOX` 검색 결과 제거.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- fallback interaction object 4개는 유지.
- fallback object의 parent mapping 유지:
  - collision/hurt → body
  - attack → weapon
  - guard → shield
- Runtime combat system의 attack/hurt/collision/guard 동작은 변경하지 않음.
- Runtime `InteractionRegion` 이름 유지.
- Background/HUD/Effect 저장 구조는 변경하지 않음.
- Firebase remote data migration은 추가하지 않음.

## 아직 남아있는 예외 처리

- fallback interaction object 4개는 아직 별도 helper 파일을 가진다.
- `isInteractionObjectPartKey()` 분기는 아직 남아 있다.
- Runtime active object region은 renderer가 기록한 `hitRegions`를 사용한다.
- active object region이 없으면 fallback object region을 사용한다.
- collision push는 X축 최소 분리만 처리한다.
- guard region이 없으면 기존 `isGuarding` 방어 동작을 유지한다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: `http://127.0.0.1:5514/setting.html` HTTP 200.
- 통과: `src/tuningInteractionObjects.js` HTTP 200.
- 통과: old `src/tuningInteractionBoxes.js` HTTP 404.
- 통과: legacy 용어 검색. 단, 변경 전 이름을 기록한 이 보고서는 제외.
  - `InteractionBox`
  - `interactionBox`
  - `INTERACTION_BOX`
  - `interaction-box`
  - `tuningInteractionBoxes`
  - `collision-box`
  - `히트박스`
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 이번 단계에서 수행하지 않음.

## 알려진 위험 요소

- local tuning storage key가 v2로 변경되어 기존 local tuning v1 저장값은 삭제된다.
- Firebase나 외부 저장소에 남은 v1 데이터는 별도 migration 없이 새 key와 맞지 않을 수 있다.
- fallback object key가 바뀌었으므로, 외부 문서나 수동 저장 JSON이 old key를 쓰면 무시된다.
- broad rename 범위가 넓어서 실제 UI smoke QA가 필요하다.

## 다음 Sprint 추천

1. 실제 UI QA.
   - Setup palette 4개 영역 선택.
   - Action에서 `attackInteractionObject` 기본 공격 frame 확인.
   - active/attack/hurt/collision/guard 토글 확인.
   - resize/rotate/move/opacity 확인.
2. old key migration 필요 여부 결정.
   - clean init 유지면 migration 없음.
   - 기존 저장 복구가 필요하면 별도 Sprint로 작성.
3. `isInteractionObjectPartKey()` 분기 축소.
   - fallback object도 일반 editable object definition으로 흡수.
4. fallback interaction object helper 정리.
   - `tuningInteractionObjects.js`를 role definition 중심으로 축소.
5. Runtime collision/guard 고도화.
   - push 방향/세기/guard blockPower 정의.

## 리팩토링 후보와 이유

- `src/tuningInteractionObjects.js`
  - fallback key helper와 role definition이 같이 있다.
- `src/tuningFieldGroups.js`
  - interaction field를 object definition 기반으로 생성할 수 있다.
- `src/interactionRegionRuntime.js`
  - fallback region 생성과 active object region 수집을 분리할 수 있다.
- `src/tuningNormalize.js`
  - 저장 schema normalize 책임이 계속 늘고 있다.
- `src/puppetPlayerRenderer.js`
  - image part와 image-less object render 흐름을 더 명확히 나눌 수 있다.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 500줄 근처. 저장 schema 변경 전 분리 검토 필요.
- `src/puppetPlayerRenderer.js`: renderer/edit region 기록 책임 집중.
- `src/tuningPanelPartController.js`: field 표시와 value routing 책임이 함께 있음.
