# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

Actor HUD draw helper를 Actor renderer에 합쳐 같은 render 책임으로 정리한다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 actor render 책임은 같은 파일로 모은다.
- Actor render 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/actorHudRenderer.js` 제거.
- `drawActorShadow()`를 `src/actorRenderer.js` local helper로 이동.
- `drawHealthMeter()`를 `src/actorRenderer.js` local helper로 이동.
- `src/actorRenderer.js`가 actor body/HUD/shadow draw를 함께 처리하도록 정리.
- `docs/10_SRC_MAP.md`에서 삭제/갱신 파일 항목 반영.

## 변경한 파일과 변경 이유

- `src/actorRenderer.js`
  - 단일 소비자였던 actor HUD/shadow draw helper 흡수.
- `src/actorHudRenderer.js`
  - 삭제. `actorRenderer.js` 외부에서 쓰이지 않았음.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
actorRenderer
→ actorHudRenderer
→ drawActorShadow / drawHealthMeter
```

After:

```text
actorRenderer
→ local drawActorShadow / drawHealthMeter
```

## 제거한 중복 또는 예외 처리

- Actor render가 HUD/shadow 전용 파일로 갈라져 있던 구조 제거.
- Actor render import 경로 1개 축소.
- JS 파일 수: `src` 기준 139개 → 138개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Actor HUD layout 계산은 `characterHudLayout.js` 유지.
- Actor effect render는 `actorEffectsRenderer.js` 유지.
- Puppet player renderer 구조는 유지.
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
- 통과: `actorRenderer.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `actorHudRenderer` 참조 없음.
- 통과: `src` 파일 수 138개 확인.
- 제한: 실제 canvas actor HUD 시각 QA는 수행하지 않음.

## 알려진 위험 요소

- `actorRenderer.js`가 body/HUD/shadow draw를 함께 가진다.
- 현재 80줄대 예상이라 파일 크기 위험은 낮음.
- Actor render가 300줄 이상 커지면 HUD/effect 경계를 재검토한다.

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

- `src/actorRenderer.js`
  - 이번 Sprint에서 HUD/shadow draw를 흡수함. 크기 추적 필요.
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
- `src/actorRenderer.js`: 84줄. 이번 Sprint에서 HUD/shadow draw를 흡수함.
