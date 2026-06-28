# 99_CURRENT_SPRINT.md

## Sprint 목표

Runtime mirror와 legacy migration을 제거한다.

## 완료한 작업

- `hitbox`, `shieldHitbox`, `attackBoxes`, `attackBox` mirror source 제거.
- `syncRuntimeInteractionBoxesFromRig()` 제거.
- default tuning에서 runtime mirror field 제거.
- normalize에서 legacy attackBox/attackBoxes migration 제거.
- `hurtInteractionRegion`을 `tuning.rig.hurtHitbox`에서 직접 계산.
- `attackInteractionRegion`은 기존처럼 `tuning.rig.weaponHitbox` + pose offset에서 계산.
- Setup hurt box 필드 path를 `tuning.rig.hurtHitbox`로 변경.
- 문서 결정: Runtime data는 저장 mirror가 아니라 실행 중 계산값.

## 변경한 파일과 이유

- `src/tuningInteractionBoxes.js`: mirror 상수/export 제거.
- `src/playerDefaultTuning.js`: top-level mirror defaults 제거.
- `src/tuningNormalize.js`: mirror 생성과 legacy migration 제거.
- `src/interactionBoxRuntime.js`: parent rig 기반 hurt region 계산 추가.
- `src/puppetPlayer.js`: mirror config 대신 runtime 계산 getter 사용.
- `src/gameConfig.js`: hurt box setup field path를 rig source로 변경.
- `src/tuningPanel.js`, `src/tuningPanelCanvasController.js`: apply 중 mirror sync 제거.
- `src/editHandleGeometry.js`: legacy target type 허용 제거.
- `docs/00_MANIFEST.md`, `docs/02_DECISIONS.md`, `docs/10_SRC_MAP.md`, `docs/11_DATA_MODEL.md`, `docs/12_EDITOR_FLOW.md`: mirror 제거 결정 반영.

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

- Runtime mirror 저장 field 제거.
- Runtime mirror export 제거.
- legacy `attackBox` / `attackBoxes` input migration 제거.
- legacy `hitbox` target type 허용 제거.
- `hitReaction` legacy reaction fallback 제거.

## 유지한 구조

- rig key `collisionBox`, `hurtHitbox`, `weaponHitbox`, `shieldHitbox`.
- `attackEffects` combat reaction source.
- InteractionBox editor selection/handle/field flow.

## 아직 남아있는 예외 처리

- rig key 이름에는 `*Hitbox`가 남아 있다.
- `recordPuppetInteractionBoxes()`는 아직 renderer의 image-less rect 전용 기록 경로다.
- InteractionBox resize 보정은 아직 일반 Part resize와 완전히 합쳐지지 않았다.

## 검증 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: Node smoke.
  - legacy mirror field가 merge 후 제거됨.
  - legacy attackBoxes effect가 migration되지 않음.
  - `hurtInteractionRegion` 생성 확인.
  - `attackInteractionRegion` 생성 확인.

## 알려진 위험 요소

- 기존 localStorage/Firebase 저장값의 mirror-only 설정은 보존하지 않는다.
- 기존 저장 데이터가 rig InteractionBox를 갖고 있지 않으면 기본 rig 값으로 초기화된다.
- 실제 브라우저 저장 데이터는 필요 시 reset이 필요할 수 있다.

## 다음 Sprint 추천

1. rig key 이름을 `attackInteractionBox` 등으로 바꿀지 결정.
2. `recordPuppetInteractionBoxes()`를 일반 image-less part 렌더 경로로 흡수.
3. InteractionBox resize 보정을 일반 Part resize 흐름으로 통합.

## 리팩토링 후보

- `src/interactionBoxRuntime.js`: role별 region 계산 확대 후보.
- `src/puppetPlayerRenderer.js`: image part와 image-less rect 기록 책임 분리 후보.
- `src/canvasVisualValues.js`: Part size와 InteractionBox size 정책 통합 후보.
