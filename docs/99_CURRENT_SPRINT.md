# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

Tuning Panel 내부에서 한 곳만 쓰는 얇은 helper 파일을 호출자에 흡수한다.

## 핵심 원칙

- 새 구조를 만들지 않는다.
- 한 곳에서만 쓰이는 helper부터 줄인다.
- Tuning Panel 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/tuningPanelTimelineFrameActions.js` 제거.
- Timeline frame action helper를 `src/tuningPanelComposition.js`로 이동.
- `src/tuningPanelButtonAction.js` 제거.
- Panel button action helper를 `src/tuningPanelAssetActions.js`로 이동.
- `docs/10_SRC_MAP.md`에서 삭제된 파일 항목 제거.

## 변경한 파일과 변경 이유

- `src/tuningPanelComposition.js`
  - Timeline frame copy/paste action helper 흡수.
- `src/tuningPanelAssetActions.js`
  - asset/firebase button action helper 흡수.
- `src/tuningPanelTimelineFrameActions.js`
  - 삭제. `tuningPanelComposition.js` 단일 호출자였음.
- `src/tuningPanelButtonAction.js`
  - 삭제. `tuningPanelAssetActions.js` 단일 호출자였음.
- `docs/10_SRC_MAP.md`
  - 삭제된 파일 항목 제거.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
tuningPanelComposition
→ tuningPanelTimelineFrameActions
→ pose/effect timeline controller

tuningPanelAssetActions
→ tuningPanelButtonAction
→ upload/refresh action
```

After:

```text
tuningPanelComposition
→ pose/effect timeline controller

tuningPanelAssetActions
→ upload/refresh action
```

## 제거한 중복 또는 예외 처리

- Tuning Panel 단일 호출 helper 파일 2개 제거.
- Panel action 호출 경로 1단계 축소.
- JS 파일 수: `src` 기준 152개 → 150개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Timeline frame copy/paste 동작 유지.
- Firebase/PSD/Effect asset button 동작 유지.
- Timeline controller 구조는 유지.
- Asset refresh/runtime 로직은 변경하지 않음.
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
- 통과: `tuningPanelComposition.js` import smoke test.
- 통과: `tuningPanelAssetActions.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `tuningPanelTimelineFrameActions` 참조 없음.
  - `src`에서 `tuningPanelButtonAction` 참조 없음.
- 통과: `src` 파일 수 150개 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `tuningPanelComposition.js`가 timeline frame action helper를 직접 포함한다.
- `tuningPanelAssetActions.js`가 button async state helper를 직접 포함한다.
- 두 helper 모두 작고 단일 호출자라 현재 파일 크기 위험은 낮음.

## 다음 Sprint 추천

1. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`
2. 작은 1회 import 파일 추가 검토.
   - `tuningPanelEditingState.js`
   - `tuningPanelWorkflowSessionState.js`
   - `actorFrameState.js`
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
- `src/tuningPanel.js`
  - 작은 state helper 흡수 후보가 있으나 이미 392줄이라 무리한 흡수는 주의.
- `src/tuningCanvasEditState.js`
  - Part/Effect edit state가 같은 파일 안에서 더 공통화될 수 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
- `src/tuningPanelComposition.js`: 218줄. 이번 Sprint에서 timeline frame action helper를 흡수함.
- `src/tuningPanelAssetActions.js`: 131줄. 이번 Sprint에서 button action helper를 흡수함.
