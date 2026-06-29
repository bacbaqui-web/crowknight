# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

Ranking DOM 표시와 Canvas HUD 표시를 같은 Ranking UI 파일로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 Ranking 표시 책임은 같은 파일로 모은다.
- Main render 파일은 키우지 않는다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/rankingCanvas.js` 제거.
- `drawRankingHud()`를 `src/rankingUi.js`로 이동.
- `src/main.js`의 ranking HUD import를 `rankingUi.js`로 변경.
- `docs/10_SRC_MAP.md`에서 삭제/갱신 파일 항목 반영.

## 변경한 파일과 변경 이유

- `src/rankingUi.js`
  - Ranking DOM 표시와 Canvas HUD 표시를 같은 Ranking UI 책임으로 통합.
- `src/main.js`
  - `drawRankingHud()` import 경로 변경.
- `src/rankingCanvas.js`
  - 삭제. 기능은 `rankingUi.js`로 이동.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
main
→ rankingCanvas.drawRankingHud

rankingController
→ rankingUi
```

After:

```text
main
→ rankingUi.drawRankingHud

rankingController
→ rankingUi
```

## 제거한 중복 또는 예외 처리

- Ranking 표시 책임이 DOM/Canvas 파일로 나뉘어 있던 구조 제거.
- JS 파일 수: `src` 기준 140개 → 139개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Ranking controller 구조는 유지.
- Firebase ranking 구조는 유지.
- Ranking localStorage key는 유지.
- Score formatting helper는 유지.
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
- 통과: `rankingUi.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `rankingCanvas` 참조 없음.
- 통과: `src` 파일 수 139개 확인.
- 제한: `main.js`는 import 시점에 `document`를 읽으므로 Node import smoke 대상에서 제외.
- 제한: 실제 canvas ranking HUD 시각 QA는 수행하지 않음.

## 알려진 위험 요소

- `rankingUi.js`가 DOM ranking과 Canvas HUD ranking을 함께 가진다.
- 둘 다 Ranking 표시 책임이라 현재 통합 경계는 자연스럽다.
- Ranking UI가 300줄 이상 커지면 DOM/Canvas view 경계를 재검토한다.

## 다음 Sprint 추천

1. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`
2. Effect runtime renderer 공통화 검토.
   - `actorEffectsRenderer.js`가 editable object render/source와 더 합쳐질 수 있는지 확인.
3. 작은 파일 통합 후보 재검토.
   - 큰 파일을 키우지 않는 범위에서만 진행.

## 리팩토링 후보와 이유

- `src/rankingUi.js`
  - 이번 Sprint에서 Canvas HUD 표시를 흡수함. 크기 추적 필요.
- `src/actorEffectsRenderer.js`
  - Runtime Effect render entry가 아직 별도.
- `src/editableObjectModel.js`
  - 미사용 export 후보가 남아 있음.
- `src/tuningInteractionObjects.js`
  - 미사용 source helper 후보가 남아 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningPanel.js`: 421줄. 추가 흡수 시 파일 비대화 주의.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
- `src/rankingUi.js`: 220줄. 이번 Sprint에서 Canvas HUD 표시를 흡수함.
