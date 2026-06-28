# 99_CURRENT_SPRINT.md

## Sprint 목표

InteractionBox 렌더 기록 경로의 전용 함수명을 제거한다.

## 완료한 작업

- `recordPuppetInteractionBoxes()` 제거.
- 부모 part 렌더 중 image-less child part를 찾는 흐름으로 이름 변경.
- image-less child part는 rect part 기록 흐름을 사용.
- InteractionBox handle/source 동작은 유지.
- 저장 구조 변경 없음.

## 변경한 파일과 이유

- `src/puppetPlayerRenderer.js`: InteractionBox 전용 기록 함수명을 image-less part 렌더 흐름으로 정리.
- `docs/12_EDITOR_FLOW.md`: Handle 생성 흐름의 함수명 갱신.
- `docs/99_CURRENT_SPRINT.md`: 이번 Sprint 결과로 덮어쓰기.

## 변경된 데이터 흐름

```text
tuning.rig[interactionBoxKey]
+ tuning.poseOffsets[poseKey][interactionBoxKey]
→ interactionBoxRuntime
→ actor.player.*InteractionRegion
→ combatSystem
```

```text
tuning.attackEffects[attackKey]
→ combatSystem.attackReaction()
```

## 제거한 중복 또는 예외 처리

- `recordPuppetInteractionBoxes()` 전용 함수명 제거.
- renderer의 InteractionBox 기록 책임을 image-less child part 기록 이름으로 이동.

## 유지한 구조

- `attackEffects` combat reaction source.
- InteractionBox editor selection/handle/field flow.
- Runtime mirror 없음.
- InteractionBox parent mapping.

## 아직 남아있는 예외 처리

- image-less child part 목록은 현재 InteractionBox parent mapping에서 온다.
- InteractionBox resize 보정은 아직 일반 Part resize와 완전히 합쳐지지 않았다.

## 검증 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: Node smoke.
  - `hurtInteractionBox` edit handle target 생성 확인.
  - `attackInteractionBox` edit handle target 생성 확인.
  - 두 target 모두 `interactionBox` type 확인.

## 알려진 위험 요소

- renderer 함수명 변경이므로 저장 데이터 영향은 없다.

## 다음 Sprint 추천

1. InteractionBox resize 보정을 일반 Part resize 흐름으로 통합.
2. image-less child part 목록을 renderer 밖 source helper로 분리할지 검토.
3. InteractionBox UI label을 role 중심 용어로 정리할지 검토.

## 리팩토링 후보

- `src/interactionBoxRuntime.js`: role별 region 계산 확대 후보.
- `src/puppetPlayerRenderer.js`: image part와 image-less rect 기록 책임 분리 후보.
- `src/canvasVisualValues.js`: Part size와 InteractionBox size 정책 통합 후보.
