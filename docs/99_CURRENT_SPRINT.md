# 99_CURRENT_SPRINT.md

## Sprint 목표

큰 파일을 키우지 않는 범위에서 Settings debug draw 책임을 통합한다.

`settingsDebugRenderer.js`는 `tuningPanelDebugView.js`에서만 쓰이므로 같은 설정 디버그 overlay draw 흐름으로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 Settings debug draw 책임은 같은 파일로 모은다.
- Debug overlay 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/settingsDebugRenderer.js` 제거.
- `drawEditableInteractionTarget()`를 `src/tuningPanelDebugView.js` local helper로 이동.
- `drawFallbackAttackRegionPreview()`를 `src/tuningPanelDebugView.js` local helper로 이동.
- `drawEffectPreviewBounds()`를 `src/tuningPanelDebugView.js` local helper로 이동.
- `docs/10_SRC_MAP.md`에서 삭제/갱신 파일 항목 반영.
- `docs/12_EDITOR_FLOW.md`에서 Settings debug draw 참조 갱신.

## 변경한 파일과 변경 이유

- `src/tuningPanelDebugView.js`
  - Settings debug overlay draw helper 통합.
- `src/settingsDebugRenderer.js`
  - 삭제. `tuningPanelDebugView.js` 외부에서 쓰이지 않았음.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/12_EDITOR_FLOW.md`
  - Settings debug draw 경로 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
tuningPanelDebugView
→ settingsDebugRenderer
→ InteractionObject / attack / effect debug draw
```

After:

```text
tuningPanelDebugView
→ local InteractionObject / attack / effect debug draw
```

## 제거한 중복 또는 예외 처리

- Settings debug draw 전용 중간 파일 제거.
- Debug overlay import 경로 1개 축소.
- JS 파일 수: `src` 기준 137개 → 136개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Settings panel state 흐름은 유지.
- InteractionObject target source는 `player.editHandles` 유지.
- Effect settings preview source는 유지.
- 저장 구조는 변경하지 않음.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 완전히 흡수되지 않았다.

## 검증 방법 및 결과

- 예정: `npm run check`.
- 예정: `git diff --check`.
- 완료: `tuningPanelDebugView.js` import smoke test.
- 예정: 삭제 파일 import 검색.
- 완료: `src` 파일 수 136개 확인.
- 제한: 실제 브라우저 Settings debug overlay 시각 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `tuningPanelDebugView.js`가 Settings debug overlay draw helper를 함께 가진다.
- 현재 216줄이라 파일 크기 위험은 낮음.
- Debug overlay가 300줄 이상 커지면 InteractionObject/Effect preview 경계를 재검토한다.

## 다음 Sprint 추천

1. 실제 화면 QA.
   - Settings collision/debug overlay.
   - Attack fallback preview.
   - Effect settings preview bounds.
2. 큰 파일 분해 기준 수립.
   - `tuningNormalize.js`, `puppetPlayer.js`, `tuningPanel.js`는 추가 흡수보다 책임 분리가 우선.
3. 더 줄일 후보는 신중히 선별.
   - 중심 파일을 키우는 통합은 중단.
   - 같은 책임의 작은 파일 통합만 허용.

## 리팩토링 후보와 이유

- `src/tuningNormalize.js`
  - 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`
  - 440줄. Runtime helper 책임 집중.
- `src/tuningPanel.js`
  - 421줄. 추가 흡수보다 분리 기준 검토가 필요.
- `src/puppetPlayerRenderer.js`
  - 394줄. render/edit region 기록 책임 집중.

## 현재 판단

이번 통합은 무리한 수준이 아니다.

`tuningPanelDebugView.js`가 216줄이므로 아직 관리 가능하다.

다음부터는 중심 파일 비대화 위험이 커진다. 후보 분석 후 같은 책임으로 묶이는 경우에만 진행해야 한다.
