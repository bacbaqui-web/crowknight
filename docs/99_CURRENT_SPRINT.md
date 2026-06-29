# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

큰 파일을 키우지 않고 StageRules panel definition/render 책임을 한 파일로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 UI 정의/렌더 책임은 같은 파일로 모은다.
- StageRules 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/stageRulesPanelDefinitions.js` 제거.
- StageRules panel definitions를 `src/stageRulesPanelRenderer.js`로 이동.
- `src/stageRulesPanelRenderer.js`가 StageRules panel 정의와 render를 함께 처리하도록 정리.
- `docs/10_SRC_MAP.md`에서 삭제/갱신 파일 항목 반영.

## 변경한 파일과 변경 이유

- `src/stageRulesPanelRenderer.js`
  - 단일 소비자였던 StageRules panel definitions 흡수.
- `src/stageRulesPanelDefinitions.js`
  - 삭제. definitions는 renderer 밖에서 사용되지 않았음.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
tuningPanelBootstrap
→ stageRulesPanelRenderer
→ stageRulesPanelDefinitions
```

After:

```text
tuningPanelBootstrap
→ stageRulesPanelRenderer
```

## 제거한 중복 또는 예외 처리

- StageRules panel definition 전용 파일 제거.
- StageRules panel render 호출 경로 1단계 축소.
- JS 파일 수: `src` 기준 144개 → 143개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- StageRules controller 구조는 유지.
- StageRules panel controller 구조는 유지.
- StageRules 저장 모델은 변경하지 않음.
- StageRules UI field 구성은 변경하지 않음.
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
- 통과: `stageRulesPanelRenderer.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `stageRulesPanelDefinitions` 참조 없음.
- 통과: `src` 파일 수 143개 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `stageRulesPanelRenderer.js`가 definition/render를 함께 가진다.
- 둘 다 StageRules panel render 책임이라 현재 통합 경계는 자연스럽다.
- StageRules panel field가 크게 늘면 definition 분리를 재검토한다.

## 다음 Sprint 추천

1. StageRules selector/controller 통합 검토.
   - `stageRulesSelectors.js`는 `stageRulesController.js` 단일 소비자다.
2. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`
3. Effect runtime renderer 공통화 검토.
   - `actorEffectsRenderer.js`가 editable object render/source와 더 합쳐질 수 있는지 확인.

## 리팩토링 후보와 이유

- `src/stageRulesSelectors.js`
  - StageRules controller 단일 소비자.
- `src/stageRulesPanelRenderer.js`
  - 이번 Sprint에서 panel definitions를 흡수함. 크기 추적 필요.
- `src/actorEffectsRenderer.js`
  - Runtime Effect render entry가 아직 별도.
- `src/editableObjectModel.js`
  - 미사용 export 후보가 남아 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningPanel.js`: 421줄. 추가 흡수 시 파일 비대화 주의.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
- `src/stageRulesPanelRenderer.js`: 168줄. 이번 Sprint에서 panel definitions를 흡수함.
