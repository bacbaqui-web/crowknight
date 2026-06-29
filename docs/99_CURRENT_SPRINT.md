# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

Timeline preview timer 전용 파일을 Timeline preview 흐름에 흡수한다.

## 핵심 원칙

- 새 구조를 만들지 않는다.
- 한 곳에서만 쓰이는 얇은 파일부터 줄인다.
- Timeline preview 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/previewPlayback.js` 제거.
- preview timer helper를 `src/tuningTimelinePreview.js`로 이동.
- `src/tuningTimelinePreview.js`가 preview sync와 timer start/stop을 함께 처리하도록 import 정리.
- `docs/10_SRC_MAP.md`에서 삭제된 파일 항목 제거.

## 변경한 파일과 변경 이유

- `src/tuningTimelinePreview.js`
  - 단일 호출자였던 preview timer helper를 흡수.
- `src/previewPlayback.js`
  - 삭제. `schedulePreviewStop()` / `stopPreviewTimer()`만 가진 얇은 중간 파일이었음.
- `docs/10_SRC_MAP.md`
  - 삭제된 파일 항목 제거.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
tuningTimelinePreview
→ previewPlayback
→ tuningPlayback.previewTimeoutMs
```

After:

```text
tuningTimelinePreview
→ tuningPlayback.previewTimeoutMs
```

## 제거한 중복 또는 예외 처리

- Timeline preview timer 전용 중간 파일 제거.
- Preview start/stop timer 호출 경로 1단계 축소.
- JS 파일 수: `src` 기준 153개 → 152개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- `previewTimeoutMs()` 계산은 `tuningPlayback.js` 유지.
- Pose/Effect preview state 구조는 유지.
- Timeline controller 구조는 유지.
- 저장 구조는 변경하지 않음.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect runtime renderer는 아직 `actorEffectsRenderer.js`에 별도 존재.
- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: `tuningTimelinePreview.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `previewPlayback` 참조 없음.
- 통과: `src` 파일 수 152개 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `tuningTimelinePreview.js`가 preview sync와 timer helper를 함께 맡는다.
- 현재 이동한 helper는 2개뿐이라 파일 크기 위험은 낮음.

## 다음 Sprint 추천

1. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`
2. 작은 1회 import 파일 추가 검토.
   - `runHud.js`
   - `actorFrameState.js`
   - `tuningPanelEditingState.js`
3. Effect runtime renderer 공통화 검토.
   - `actorEffectsRenderer.js`가 editable object render/source와 더 합쳐질 수 있는지 확인.
4. Master/root transform 정리 설계.
   - `anchorX/anchorY`를 editable transform 규칙에 맞출지 결정.

## 리팩토링 후보와 이유

- `src/actorEffectsRenderer.js`
  - Runtime Effect render entry가 아직 별도.
- `src/editableObjectModel.js`
  - 미사용 export 후보가 남아 있음.
- `src/tuningInteractionObjects.js`
  - 미사용 source helper 후보가 남아 있음.
- `src/tuningTimelinePreview.js`
  - 이번 Sprint에서 timer helper를 흡수함. 아직 작지만 preview 책임이 더 늘면 경계 재검토.
- `src/tuningCanvasEditState.js`
  - Part/Effect edit state가 같은 파일 안에서 더 공통화될 수 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
- `src/tuningTimelinePreview.js`: 163줄. 이번 Sprint에서 timer helper를 흡수했지만 크기 위험은 낮음.
