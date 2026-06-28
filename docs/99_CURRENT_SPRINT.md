# 99_CURRENT_SPRINT.md

## Sprint 목표

InteractionBox 용어를 코드 기준으로 정착시킨다.

## 완료한 작업

- source type: `interactionBox`.
- target type: `interactionBox`.
- runtime region: `attackInteractionRegion`, `hurtInteractionRegion`.
- runtime helper: `createAttackInteractionRegion()`.
- debug flag: `debugInteractionBoxes`.
- CSS class: `*-interaction-box`.
- constants: role 기준 `*_INTERACTION_BOX_KEY`.
- legacy mirror key 문자열은 `tuningInteractionBoxes.js` 상수로 격리.

## 변경한 파일과 이유

- `src/tuningInteractionBoxes.js`: InteractionBox key/type/legacy mirror 상수의 단일 출처.
- `src/interactionBoxRuntime.js`: runtime region helper명을 InteractionBox 기준으로 정리.
- `src/puppetPlayer.js`: runtime getter를 `attackInteractionRegion` / `hurtInteractionRegion`으로 정리.
- `src/combatSystem.js`, `src/combatGeometry.js`: combat 판정을 InteractionRegion 기준으로 정리.
- `src/playerDefaultRig.js`, `src/playerDefaultTuning.js`, `src/tuningParts.js`, `src/tuningLabels.js`: 저장 key literal 대신 InteractionBox 상수 사용.
- `src/tuningNormalize.js`: legacy 입력은 migration하고 normalized output은 InteractionBox 기준으로 정리.
- `src/gameConfig.js`, `src/tuningPanelDom.js`, `src/partPicker.css`: field/class/debug 용어 정리.
- `docs/12_EDITOR_FLOW.md`: 오래된 helper명 갱신.
- `docs/99_CURRENT_SPRINT.md`: 이번 Sprint 결과로 덮어쓰기.

## 변경된 데이터 흐름

```text
Editor
→ tuning.rig[interactionBoxKey]
→ poseOffsets[poseKey][interactionBoxKey]
→ PuppetPlayer attack/hurt InteractionRegion
→ Runtime combat
```

```text
legacy saved type: "hitbox"
→ mergeTuning()
→ type: "interactionBox"
```

```text
legacy saved attackBox / attackBoxes effect fields
→ attackEffects
→ combat reaction
```

## 제거한 중복 또는 예외 처리

- 신규 `type: "hitbox"` 생성 경로 제거.
- `attackBox` runtime getter 제거.
- legacy weapon attack region helper 제거.
- legacy attack/hurt overlap helper 제거.
- combat reaction의 `attackBoxes` fallback 제거.
- default `attackBoxes`의 effect 중복 제거.
- 미사용 hitbox debug helper 제거.

## 유지한 구조

- 저장 key `collisionBox`, `hurtHitbox`, `weaponHitbox`, `shieldHitbox`.
- Runtime mirror field `hitbox`, `shieldHitbox`, `attackBoxes`.
- 기존 저장 데이터 migration.
- Runtime mirror export 경계.

## 아직 남아있는 예외 처리

- 저장 호환 때문에 일부 key 문자열에 `Hitbox`가 남아 있다.
- Runtime mirror field 이름 `attackBoxes`는 geometry mirror로 남아 있다.
- `recordPuppetInteractionBoxes()`는 아직 renderer의 image-less rect 전용 기록 경로다.
- InteractionBox resize 보정은 아직 일반 Part resize와 완전히 합쳐지지 않았다.

## 검증 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: Node smoke.
  - legacy rig type normalize 확인.
  - attack effect migration 확인.
  - `attackBoxes` effect field 제거 확인.
  - `attackInteractionRegion` 생성 확인.
  - legacy `attackBox` getter 제거 확인.

## 알려진 위험 요소

- 저장 key와 runtime mirror field는 호환 때문에 이름이 오래됐다.
- 새 저장 데이터는 `type: "interactionBox"`를 사용한다.
- 오래된 저장 데이터는 반드시 normalize 경로를 거쳐야 한다.

## 다음 Sprint 추천

1. `recordPuppetInteractionBoxes()`를 일반 image-less part 렌더 경로로 흡수.
2. InteractionBox resize 보정을 일반 Part resize 흐름과 통합.
3. `attackBoxes` mirror field 이름 변경 가능성을 별도 migration Sprint로 검토.
4. hurt/guard/collision runtime region도 `interactionBoxRuntime.js`에 명시적으로 통합.

## 리팩토링 후보

- `src/tuningNormalize.js`: 558줄. migration 책임 분리 후보.
- `src/puppetPlayerRenderer.js`: image part와 image-less rect 기록 책임 분리 후보.
- `src/canvasVisualValues.js`: Part size와 InteractionBox size 정책 통합 후보.
