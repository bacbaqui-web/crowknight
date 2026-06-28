# 99_CURRENT_SPRINT.md

## Sprint 목표

Effect handle pointer down을 공통 handle 입력 흐름에 흡수한다.

모든 editable object handle은 같은 pointer down → drag 생성 → drag apply 흐름을 사용해야 한다.

## 핵심 원칙

- 같은 handle은 같은 입력 시스템을 사용한다.
- Effect 전용 pointer down 함수를 남기지 않는다.
- 저장 위치는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- Effect 전용 pointer down 함수 제거.
- Effect 전용 drag 시작 함수 제거.
- `handleCanvasPointerDown()`이 Effect도 직접 처리하도록 변경.
- Effect edit state를 `canvasEffectEditState()`로 분리.
- Effect opacity handle도 공통 pointer down에서 처리.
- Effect move/resize/rotate/anchor handle도 공통 `beginCanvasPartPointerDrag()`를 통해 drag 생성.
- Effect 저장은 generic `writeValue`로 `effectTimeline.writeFrameValue()`에 연결.

## 변경한 파일과 변경 이유

- `src/tuningCanvasPointerDrag.js`
  - `handleEffectCanvasPointerDown()` 제거.
  - `beginCanvasEffectPointerDrag()` 제거.
  - Effect도 `handleCanvasPointerDown()`에서 처리.
- `src/tuningPanelCanvasController.js`
  - Effect pointer down 별도 라우팅 제거.
  - Effect context active part를 `effect`로 제공.
  - Effect edit state를 공통 pointer down에 제공.
- `src/tuningCanvasEditState.js`
  - `canvasEffectEditState()` 추가.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
Effect handle pointer down
→ handleEffectCanvasPointerDown()
→ beginCanvasEffectPointerDrag()
→ createCanvasPartDrag()
```

After:

```text
Any editable handle pointer down
→ handleCanvasPointerDown()
→ canvasEditState()
→ beginCanvasPartPointerDrag()
→ createCanvasPartDrag()
```

Effect write path:

```text
Effect handle drag
→ applyCanvasPartDrag()
→ setCanvasVisualValue()
→ editState.writeValue()
→ effectTimeline.writeFrameValue()
→ tuning.effectOffsets[effectKey]
```

## 제거한 중복 또는 예외 처리

- `handleEffectCanvasPointerDown()` 제거.
- `beginCanvasEffectPointerDrag()` 제거.
- `handleEffectPointerDown` callback 제거.
- Effect opacity handle 전용 처리 제거.
- Effect drag 시작 전용 처리 제거.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Effect 저장 위치는 `tuning.effectOffsets` 유지.
- Effect timeline controller는 유지.
- Effect preview/render entry는 유지.
- Runtime combat system은 변경하지 않음.
- Master/root handle 정책은 유지.
- Group edit handle 정책은 유지.

## 아직 남아있는 예외 처리

- Effect handle geometry source는 아직 `effectEditHandle`로 전달된다.
- Effect preview/render entry는 아직 별도다.
  - `settingsEffectPreviewRenderer.js`
  - `actorEffectsRenderer.js`
- Effect value adapter는 아직 별도다.
  - `effectVisualValues.js`
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: legacy Effect pointer/drag 함수 검색.
  - `handleEffectCanvasPointerDown`
  - `beginCanvasEffectPointerDrag`
  - `handleEffectPointerDown`
  - `createCanvasEffectDrag`
  - `applyEffectCanvasDrag`
- 통과: Effect opacity common pointer down smoke test.
  - 공통 `handleCanvasPointerDown()`이 Effect opacity를 `writeValue`로 기록.
- 통과: Effect drag common pointer down smoke test.
  - 공통 `handleCanvasPointerDown()`이 Effect drag를 `createCanvasPartDrag()`로 생성.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 수행하지 않음.

## 알려진 위험 요소

- Effect context에서 `activePart`는 synthetic key `effect`를 사용한다.
- Effect handle source는 아직 `player.editHandles`가 아니라 preview renderer의 `effectEditHandle`이다.
- 실제 UI에서 Effect opacity/anchor/move/resize/rotate drag QA가 필요하다.

## 다음 Sprint 추천

1. 실제 UI QA.
   - Effect opacity/anchor/move/resize/rotate handle.
   - Part/InteractionObject handle regressions.
2. Effect handle source 통합.
   - `effectEditHandle` 전달을 줄이고 공통 editable target source로 연결.
3. Effect value adapter 통합.
   - `effectVisualValues.js`를 common editable value adapter로 합치기.
4. Master/root transform 정리 설계.
   - `anchorX/anchorY`를 editable transform 규칙에 맞출지 결정.
5. Group edit 규칙 정리 설계.
   - Group도 같은 handle set/drag entry를 유지할지 결정.

## 리팩토링 후보와 이유

- `src/tuningEditHandleGeometry.js`
  - Effect context routing이 남아 있음.
- `src/settingsEffectPreviewRenderer.js`
  - Effect preview target 생성이 별도.
- `src/effectVisualValues.js`
  - Effect display/input 변환만 별도.
- `src/tuningCanvasEditState.js`
  - Part/Effect edit state가 같은 파일 안에서 더 공통화될 수 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
