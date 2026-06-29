# 99_CURRENT_SPRINT.md

## Sprint 목표

큰 파일을 키우지 않고 미사용 public helper를 제거한다.

파일 수를 억지로 줄이는 단계는 잠시 멈추고, 실제로 더 이상 쓰이지 않는 API 표면을 줄인다.

## 핵심 원칙

- 사용하지 않는 export는 남기지 않는다.
- 큰 파일에 기능을 흡수하지 않는다.
- 같은 기능으로 착각될 수 있는 죽은 helper를 제거한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/editableObjectModel.js`에서 미사용 export 제거.
  - `createEditableInteraction()`
  - `createEditableObject()`
  - `centeredEditableTransform()`
  - `centerOffsetEditableTransform()`
  - `editableTransformLocalPoints()`
  - `editableTransformPoints()`
  - `editableTransformBounds()`
- `src/tuningInteractionObjects.js`에서 미사용 export 제거.
  - `interactionObjectPartSources()`
- 기존 사용 중인 editable transform helper는 유지.
  - `createEditableTransform()`
  - `createEditableAppearance()`
  - `editableTransformDrawRect()`
  - `scaledEditableAnchor()`
  - `resizeEditableTransformFromHandle()`

## 변경한 파일과 변경 이유

- `src/editableObjectModel.js`
  - 사용되지 않는 object factory/center/bounds helper 제거.
- `src/tuningInteractionObjects.js`
  - Editor source 단일화 이후 사용되지 않는 interaction object source helper 제거.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
editableObjectModel
→ 실제 사용 helper + 미사용 helper 혼재

tuningInteractionObjects
→ interaction object key/parent helper + 미사용 source helper 혼재
```

After:

```text
editableObjectModel
→ 실제 사용 중인 transform/appearance/resize helper만 유지

tuningInteractionObjects
→ 실제 사용 중인 key/parent/focus helper만 유지
```

## 제거한 중복 또는 예외 처리

- 호출되지 않는 editable object factory 제거.
- 호출되지 않는 center transform helper 제거.
- 호출되지 않는 bounds/points helper 제거.
- 호출되지 않는 interaction object source helper 제거.
- JS 파일 수 변화 없음: `src` 기준 138개 유지.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Editable Transform 규칙은 유지.
- InteractionBox 저장 구조는 유지.
- Interaction runtime 계산은 변경하지 않음.
- Canvas drag resize 흐름은 유지.
- Renderer/edit handle 흐름은 유지.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- `actorEffectsRenderer.js`
  - Effect/hit flash/selection glow renderer가 별도.
- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 완전히 흡수되지 않았다.

## 검증 방법 및 결과

- 예정: `npm run check`.
- 예정: `git diff --check`.
- 예정: 삭제 export 이름 검색.
- 예정: `src` 파일 수 138개 확인.
- 제한: 실제 브라우저 시각 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- 삭제한 helper가 외부 문서나 미래 계획에서만 참조될 가능성은 낮다.
- 현재 기준 `src` 참조가 없는 helper만 삭제했다.
- 향후 필요하면 실제 사용 흐름이 생길 때 다시 추가한다.

## 다음 Sprint 추천

1. Effect renderer 공통화 검토.
   - `actorEffectsRenderer.js`가 actor/effect/editable render 흐름과 통합 가능한지 확인.
2. 큰 파일 분해 기준 수립.
   - `tuningNormalize.js`, `puppetPlayer.js`, `tuningPanel.js`는 추가 흡수보다 책임 분리가 우선.
3. 실제 화면 QA.
   - Ranking HUD.
   - Actor HUD/shadow.
   - StageRules panel render.
   - Asset refresh buttons.
   - Timeline selection/copy/playback.

## 리팩토링 후보와 이유

- `src/actorEffectsRenderer.js`
  - Actor render 계열과 책임 경계 재검토 가능.
- `src/tuningNormalize.js`
  - 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`
  - 440줄. Runtime helper 책임 집중.
- `src/tuningPanel.js`
  - 421줄. 추가 흡수보다 분리 기준 검토가 필요.

## 현재 판단

이번 단계는 파일 수 감소보다 API 표면 축소가 목적이었다.

더 줄이는 작업은 가능하지만, 다음부터는 큰 파일 비대화 위험이 커진다.

계속 진행하려면 먼저 `actorEffectsRenderer.js` 공통화 가능성을 확인하고, 무리하면 중단하는 것이 맞다.
