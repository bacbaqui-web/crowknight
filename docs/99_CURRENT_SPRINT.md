# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

Effect 전용 value transform 파일을 공통 field value 흐름에 흡수한다.

## 핵심 원칙

- 새 파일보다 기존 공통 파일을 우선한다.
- 같은 field display/store 변환은 같은 모듈에서 처리한다.
- 특정 영역 전용 value adapter는 마지막 선택이다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/effectVisualValues.js` 제거.
- Effect display/store value 함수를 `src/tuningFieldValues.js`로 이동.
- Effect Timeline controller import를 `tuningFieldValues.js`로 변경.
- `docs/10_SRC_MAP.md`에서 삭제된 파일 항목 제거.
- `docs/10_SRC_MAP.md`의 `tuningFieldValues.js` 설명을 Part/Pose/Effect 공통 value 변환으로 갱신.

## 변경한 파일과 변경 이유

- `src/tuningFieldValues.js`
  - Effect field display/store value 변환 흡수.
- `src/tuningEffectTimelineController.js`
  - Effect value 변환 import 경로 변경.
- `src/effectVisualValues.js`
  - 삭제. 기능은 `tuningFieldValues.js`로 이동.
- `docs/10_SRC_MAP.md`
  - 소스 지도에서 삭제된 파일 제거.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
Effect property input/display
→ effectVisualValues.js
→ tuning.effectOffsets[effectKey]
```

After:

```text
Effect property input/display
→ tuningFieldValues.js
→ tuning.effectOffsets[effectKey]
```

## 제거한 중복 또는 예외 처리

- Effect 전용 value transform 파일 제거.
- Effect field value 변환이 Part/Pose field value 변환 파일로 합쳐짐.
- JS 파일 수: `src` 기준 155개 → 154개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Effect 저장 위치는 `tuning.effectOffsets` 유지.
- Effect Timeline controller 구조는 유지.
- Effect preview/render entry는 유지.
- Runtime combat system은 변경하지 않음.
- Master/root handle 정책은 유지.
- Group edit handle 정책은 유지.

## 아직 남아있는 예외 처리

- Effect preview/render entry는 아직 별도다.
  - `settingsEffectPreviewRenderer.js`
  - `actorEffectsRenderer.js`
- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: Effect field value smoke test.
  - Effect size percent display/store 변환 확인.
  - Effect toggle/limit clamp 확인.
- 통과: 삭제 파일 import 검색.
  - `src/effectVisualValues.js` 삭제 확인.
  - `src` 파일 수 154개 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 수행하지 않음.

## 알려진 위험 요소

- `tuningFieldValues.js`가 Part/Pose/Effect value 변환을 함께 맡아 책임이 커졌다.
- 다음에 Background/Stage value 변환까지 무작정 넣으면 이 파일이 커질 수 있다.

## 다음 Sprint 추천

1. Effect preview/render entry 통합 검토.
   - `settingsEffectPreviewRenderer.js`와 `actorEffectsRenderer.js`를 공통 editable render/source로 줄일 수 있는지 확인.
2. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`
3. Master/root transform 정리 설계.
   - `anchorX/anchorY`를 editable transform 규칙에 맞출지 결정.
4. Group edit 규칙 정리 설계.
   - Group도 같은 handle set/drag entry를 유지할지 결정.

## 리팩토링 후보와 이유

- `src/settingsEffectPreviewRenderer.js`
  - Effect preview target 생성이 아직 별도.
- `src/actorEffectsRenderer.js`
  - Runtime Effect render entry가 별도.
- `src/tuningFieldValues.js`
  - 공통 value 변환이 모이고 있어 책임 경계 관리 필요.
- `src/tuningCanvasEditState.js`
  - Part/Effect edit state가 같은 파일 안에서 더 공통화될 수 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
- `src/tuningFieldValues.js`: 이번 Sprint에서 Effect value 변환을 흡수함. 계속 커지면 분리 기준 재검토.
