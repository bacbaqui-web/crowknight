# 99_CURRENT_SPRINT.md

## Sprint 목표

Effect handle/drag를 Part 편집 흐름에 흡수한다.

최종 목표는 모든 editable object가 같은 transform, handle geometry, canvas drag 규칙을 쓰게 만드는 것이다.

## 핵심 원칙

- 같은 UX는 같은 내부 시스템을 사용한다.
- Effect 전용 handle geometry/drag 계산을 남기지 않는다.
- 저장 위치는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.
- 큰 구조 이동 없이 작은 경계부터 통합한다.

## 완료한 작업

- Effect edit handle info에 Part target과 같은 `target.points/bounds/type/source`를 추가.
- Effect handle geometry가 `createPartEditHandleGeometry()`를 사용하도록 변경.
- Effect resize/rotate/move/anchor/opacity handle이 Part handle 생성 규칙을 공유.
- Effect canvas drag가 `createCanvasPartDrag()`를 사용하도록 변경.
- Effect canvas drag apply가 `applyCanvasPartDrag()`를 사용하도록 변경.
- `setCanvasVisualValue()`가 generic `writeValue()` writer를 지원하도록 변경.
- Effect size clamp가 Part drag의 `canvasSizePercentBase()`/`clampCanvasVisualSize()` 경로를 타도록 변경.
- 더 이상 쓰지 않는 Effect 전용 함수 제거.

## 변경한 파일과 변경 이유

- `src/editHandleGeometry.js`
  - Effect target type 추가.
  - Effect도 `createPartEditHandleGeometry()`에서 처리.
  - `createEffectEditHandleGeometry()` 제거.
- `src/settingsEffectPreviewRenderer.js`
  - Effect preview handle info에 draw rect 기반 target 전달.
- `src/tuningEditHandleGeometry.js`
  - Effect handle geometry를 Part handle geometry 경로로 연결.
- `src/tuningCanvasDragFactory.js`
  - Effect 전용 drag factory 제거.
  - Part drag factory에 generic `writeValue` 추가.
- `src/tuningCanvasPointerDrag.js`
  - Effect drag 시작 시 `createCanvasPartDrag()` 사용.
- `src/canvasDragApply.js`
  - Effect 전용 drag apply 제거.
  - Effect도 `applyCanvasPartDrag()` 경로 사용.
- `src/canvasVisualValues.js`
  - non-pose object writer 지원.
- `src/canvasDragState.js`
  - Effect 전용 drag value picker 제거.
- `src/effectVisualValues.js`
  - 미사용 `clampEffectFrameSize()` 제거.
- `src/tuningPanelCanvasController.js`
  - Effect 전용 drag apply 인자 제거.
- `src/tuningParts.js`
  - `partFieldLimits('effect')`가 Effect limits를 사용하도록 연결.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
Effect handle
→ createEffectEditHandleGeometry()
→ createCanvasEffectDrag()
→ applyEffectCanvasDrag()
→ writeEffectFrameValue()
```

After:

```text
Effect handle
→ createPartEditHandleGeometry()
→ createCanvasPartDrag()
→ applyCanvasPartDrag()
→ setCanvasVisualValue()
→ writeValue(writeEffectFrameValue)
```

## 제거한 중복 또는 예외 처리

- `createEffectEditHandleGeometry()` 제거.
- `createCanvasEffectDrag()` 제거.
- `applyEffectCanvasDrag()` 제거.
- `pickEffectDragValues()` 제거.
- `clampEffectFrameSize()` 제거.
- Effect handle 위치 계산이 Part handle geometry와 같은 target boundary 기준을 사용.
- Effect resize 계산이 Part resize transform helper를 공유.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Effect 저장 위치는 `tuning.effectOffsets` 유지.
- Effect panel/timeline controller는 유지.
- Effect preview renderer는 유지.
- Runtime combat system은 변경하지 않음.
- fallback InteractionObject 4개는 유지.
- Master/root `anchorX/anchorY` 구조는 변경하지 않음.
- Background/Stage/HUD는 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect pointer down entry는 아직 별도 함수다.
  - `handleEffectCanvasPointerDown()`
  - `beginCanvasEffectPointerDrag()`
- Effect preview/render entry는 아직 별도다.
  - `settingsEffectPreviewRenderer.js`
  - `actorEffectsRenderer.js`
- Effect value adapter는 아직 별도다.
  - `effectVisualValues.js`
- `tuningEditHandleGeometry()`에는 Effect context routing이 남아 있다.
- InteractionObject는 opacity/anchor handle 정책이 일반 Part와 다르다.
- Master/root와 Group edit는 아직 `anchorX/anchorY` screen-space 기준을 사용한다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: Effect Part handle geometry smoke test.
  - Effect target이 `createPartEditHandleGeometry()`에서 처리됨 확인.
  - Effect size handle이 target boundary 기준을 사용함 확인.
- 통과: Effect Part drag apply smoke test.
  - Effect move가 `applyCanvasPartDrag()`에서 `x/y` writer로 기록됨 확인.
  - Effect width resize가 `w` writer로 기록됨 확인.
  - Effect anchor drag가 `ax/ay` writer로 기록됨 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 수행하지 않음.

## 알려진 위험 요소

- Effect handle 위치가 기존 고정 offset 방식에서 target boundary 기준으로 바뀌었다.
- Effect drag는 공통 Part drag를 쓰지만 pointer down entry는 아직 Effect 전용이다.
- 실제 UI에서 Effect handle 위치/드래그 체감 QA가 필요하다.

## 다음 Sprint 추천

1. Effect pointer down routing 통합.
   - `handleEffectCanvasPointerDown()`을 일반 pointer down 경로로 흡수.
2. Effect value adapter 통합.
   - `effectVisualValues.js`를 common editable value adapter로 합치기.
3. Effect preview/render entry 통합.
   - Effect preview target도 `player.editHandles` 또는 공통 editable target source로 연결.
4. InteractionObject handle 예외 정책 결정.
   - opacity handle 허용 여부.
   - anchor handle 허용 여부.
5. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`

## 리팩토링 후보와 이유

- `src/tuningCanvasPointerDrag.js`
  - Effect pointer down과 Part pointer down이 아직 분리.
- `src/tuningEditHandleGeometry.js`
  - Effect context routing이 남아 있음.
- `src/effectVisualValues.js`
  - Effect display/input 변환만 별도.
- `src/settingsEffectPreviewRenderer.js`
  - Effect preview target 생성이 별도.
- `src/actorEffectsRenderer.js`
  - Runtime Effect render entry가 별도.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
