# 99_CURRENT_SPRINT.md

## Sprint 목표

Effect handle source를 공통 `player.editHandles` 흐름에 흡수한다.

문서에는 공통 기능 원칙을 추가한다.

## 핵심 원칙

- 새 편집 기능은 하나의 공통 경로로 만든다.
- 같은 handle은 같은 source와 같은 입력 시스템을 사용한다.
- 특정 영역 전용 구현은 마지막 선택이다.
- 저장 위치는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `00_MANIFEST.md`에 공통 편집 기능 원칙 추가.
- `02_DECISIONS.md`에 Common Editor Feature Path 결정 추가.
- Effect preview handle을 `selectedActor.player.editHandles.effect`에 기록하도록 변경.
- `effectEditHandle` 별도 상태 전달 제거.
- `tuningEditHandleGeometry()`가 Effect도 `selectedActor.player.editHandles[focusPartKey]`에서 읽도록 변경.
- `drawTuningPanelDebugBoxes()`의 Effect handle 반환값 제거.

## 변경한 파일과 변경 이유

- `docs/00_MANIFEST.md`
  - 공통 기능 우선 원칙 추가.
- `docs/02_DECISIONS.md`
  - 영역별 전용 구현을 피하는 구조 결정 추가.
- `src/editHandleGeometry.js`
  - Effect synthetic handle key 상수 추가.
- `src/settingsEffectPreviewRenderer.js`
  - Effect handle info를 `player.editHandles.effect`에 기록.
- `src/tuningEditHandleGeometry.js`
  - Effect handle geometry도 공통 editHandles lookup 사용.
- `src/tuningPanel.js`
  - `effectEditHandle` 상태 제거.
- `src/tuningPanelDebugView.js`
  - Effect handle 반환 프로토콜 제거.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
drawEffectSettingsPreview()
→ return effectEditHandle
→ tuningPanel local effectEditHandle state
→ tuningEditHandleGeometry(effectEditHandle)
```

After:

```text
drawEffectSettingsPreview()
→ selectedActor.player.editHandles.effect
→ tuningEditHandleGeometry()
→ selectedActor.player.editHandles[focusPartKey]
```

Effect handle input:

```text
player.editHandles.effect
→ createPartEditHandleGeometry()
→ handleCanvasPointerDown()
→ createCanvasPartDrag()
→ applyCanvasPartDrag()
```

## 제거한 중복 또는 예외 처리

- `effectEditHandle` local state 제거.
- Effect handle 반환용 `hasEffectHandleUpdate/effectHandle` protocol 제거.
- `tuningEffectEditHandleGeometry()` 제거.
- Effect handle source가 Part처럼 `player.editHandles`에 들어가도록 통합.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Effect 저장 위치는 `tuning.effectOffsets` 유지.
- Effect preview/render entry는 유지.
- Effect value adapter는 유지.
- Runtime combat system은 변경하지 않음.
- Master/root handle 정책은 유지.
- Group edit handle 정책은 유지.

## 아직 남아있는 예외 처리

- Effect preview/render entry는 아직 별도다.
  - `settingsEffectPreviewRenderer.js`
  - `actorEffectsRenderer.js`
- Effect value adapter는 아직 별도다.
  - `effectVisualValues.js`
- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: legacy Effect handle state/function 검색.
  - `effectEditHandle`
  - `tuningEffectEditHandleGeometry`
  - `hasEffectHandleUpdate`
- 통과: Effect handle geometry common lookup smoke test.
  - `player.editHandles.effect`를 읽어 `createPartEditHandleGeometry()`로 geometry 생성 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 수행하지 않음.

## 알려진 위험 요소

- Effect handle은 preview draw 이후 `player.editHandles.effect`에 기록된다.
- Effect preview가 그려지지 않는 조건에서는 Effect handle도 없다.
- 실제 UI에서 Effect handle 표시와 드래그 QA가 필요하다.

## 다음 Sprint 추천

1. 실제 UI QA.
   - Effect opacity/anchor/move/resize/rotate handle.
   - Part/InteractionObject handle regressions.
2. Effect value adapter 통합.
   - `effectVisualValues.js`를 common editable value adapter로 합치기.
3. Effect preview/render entry 통합.
   - Effect preview target 생성을 더 공통 editable renderer/source로 이동.
4. Master/root transform 정리 설계.
   - `anchorX/anchorY`를 editable transform 규칙에 맞출지 결정.
5. Group edit 규칙 정리 설계.
   - Group도 같은 handle set/drag entry를 유지할지 결정.

## 리팩토링 후보와 이유

- `src/settingsEffectPreviewRenderer.js`
  - Effect preview target 생성이 아직 별도.
- `src/effectVisualValues.js`
  - Effect display/input 변환만 별도.
- `src/tuningCanvasEditState.js`
  - Part/Effect edit state가 같은 파일 안에서 더 공통화될 수 있음.
- `src/tuningEditHandleGeometry.js`
  - Group routing과 single-object routing을 더 단순화할 수 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
