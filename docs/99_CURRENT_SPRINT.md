# 99_CURRENT_SPRINT.md

## Sprint 목표

InteractionBox 저장 key 이름을 통일한다.

## 완료한 작업

- rig key를 InteractionBox 이름으로 변경.
- `collisionInteractionBox`
- `hurtInteractionBox`
- `attackInteractionBox`
- `guardInteractionBox`
- Action poseOffset key도 같은 상수를 따라 변경.
- Editor selection/field/handle/runtime 계산 경로는 같은 key를 사용.
- 문서의 오래된 저장 key 설명 제거.

## 변경한 파일과 이유

- `src/tuningInteractionBoxes.js`: InteractionBox 저장 key의 단일 출처 변경.
- `docs/02_DECISIONS.md`: 오래된 용어 예시 제거.
- `docs/11_DATA_MODEL.md`: 새 저장 key 반영.
- `docs/12_EDITOR_FLOW.md`: 새 Action/Runtime key 반영.
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

- 저장 key의 오래된 box 이름 제거.
- 문서의 오래된 key 설명 제거.

## 유지한 구조

- `attackEffects` combat reaction source.
- InteractionBox editor selection/handle/field flow.
- Runtime mirror 없음.

## 아직 남아있는 예외 처리

- `recordPuppetInteractionBoxes()`는 아직 renderer의 image-less rect 전용 기록 경로다.
- InteractionBox resize 보정은 아직 일반 Part resize와 완전히 합쳐지지 않았다.

## 검증 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: Node smoke.
  - 새 rig key 생성 확인.
  - 새 poseOffset key 생성 확인.
  - 오래된 rig/pose key 제거 확인.
  - `hurtInteractionRegion` 생성 확인.
  - `attackInteractionRegion` 생성 확인.

## 알려진 위험 요소

- 기존 localStorage/Firebase 저장값의 오래된 InteractionBox key는 보존하지 않는다.
- 실제 브라우저 저장 데이터는 reset이 필요할 수 있다.

## 다음 Sprint 추천

1. `recordPuppetInteractionBoxes()`를 일반 image-less part 렌더 경로로 흡수.
2. InteractionBox resize 보정을 일반 Part resize 흐름으로 통합.
3. InteractionBox UI label을 role 중심 용어로 정리할지 검토.

## 리팩토링 후보

- `src/interactionBoxRuntime.js`: role별 region 계산 확대 후보.
- `src/puppetPlayerRenderer.js`: image part와 image-less rect 기록 책임 분리 후보.
- `src/canvasVisualValues.js`: Part size와 InteractionBox size 정책 통합 후보.
