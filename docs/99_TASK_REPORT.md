# Runtime Structure Refactor

## 현재 진행률

30%

## 완료 Task

✅ Task1 — 기준점 구축

✅ Task2 — Interaction Overlap 분리

## 다음 Task

Task3 — Enemy Runtime 분리

## Task2 목표와 결과

`combat_engine.js`의 순수 overlap 계산만 `interaction_overlap_helper.js`로 이동했다. Damage, Guard, Hit Cancel, Knockback, Death, Respawn, Enemy AI, Runtime 상태와 실행 순서는 변경하지 않았다.

### 이동한 함수

- `overlappingCollisionHurtRegion`
- `overlappingAttackRegion`
- `overlappingGuardBlockAttackRegion`
- `previousAttackRegion`
- `attackRegionOverlaps`
- `interactionRegionsOverlap`
- `rectsOverlap`
- `convexPolygonsOverlap`
- `projectPolygon`

함수 이름, 매개변수, 반환값과 내부 판정 순서를 유지했다. `combat_engine.js`는 필요한 함수를 import해 기존 호출 위치에서 그대로 사용한다.

### combat_engine.js에 유지한 책임

- Damage
- Guard
- Hit Cancel
- Knockback
- Death
- Respawn
- Enemy AI
- Region cache
- `previousAttackRegions` 상태
- `createInteractionRegionFrameCache`
- `cachedInteractionRegions`
- `invalidateCachedInteractionRegions`
- `readInteractionRegions`
- `syncPreviousAttackRegions`

`regionPoints`는 Knockback 중심 계산에서도 사용되므로 기존 `combat_engine.js` import를 유지했다. 해당 Knockback 로직은 수정하지 않았다.

## 이번 Task에서 생성된 파일

- `src/interaction_overlap_helper.js` — rect, polygon SAT, swept overlap 순수 계산
- `test/interaction_overlap_helper.test.js` — Node 내장 test 기반 Geometry characterization test

## combat_engine.js 변화

893줄

↓

823줄

Geometry 9개 함수만 빠졌다. Enemy AI, Respawn, Combat Resolve, Damage와 Runtime 상태는 다음 Task 범위로 남겼다.

## 작성한 테스트

총 5개 test를 작성했다.

- rect overlap과 경계 접촉 non-overlap
- 볼록 다각형 overlap과 분리 상태의 SAT 판정
- SAT 축 projection 최소·최대값
- polygon과 rect의 실제 교차 판정
- trace 공격이 지나간 대상과 만나는 swept overlap 및 action 불일치 차단

테스트는 `node:test`와 `node:assert/strict`만 사용하며 `Math.random`을 사용하지 않는다.

## 문서 변경

- `docs/99_TASK_REPORT.md` — Task2 실제 변경, 테스트와 QA 결과 기록
- `docs/sprint-dashboard.html` — Task2 완료와 누적 진행률 30% 반영
- `docs/10_SRC_MAP.md` — `interaction_overlap_helper.js` 등록과 Combat 책임 수정
- `docs/src-map.html` — Source inventory, Interaction, Runtime, 책임 audit와 실제 줄 수 갱신

SRC Map에서 역할을 다음과 같이 분리했다.

- `combat_engine.js`: Enemy AI / Respawn / Combat Resolve / Damage
- `interaction_overlap_helper.js`: Rect Overlap / Polygon SAT / Swept Overlap Geometry

## QA 결과

- `npm run check`: 통과 (ESLint, Prettier)
- `git diff --check`: 통과
- `node --test`: 5개 test 통과, 실패 0개
- `index.html` HTTP: `200`
- `setting.html` HTTP: `200`
- SRC Map 실제 파일 대조: `201 / 201`, 누락·오래된 경로 없음
- Runtime 실행 순서 변경: 없음
- 저장 데이터 변경: 없음

## 유지보수 주의사항

- `combat_engine.js`는 823줄로 여전히 800줄 리팩토링 권장 기준을 넘는다.
- 이번 Task에서는 크기를 더 줄이기 위한 추가 분리를 하지 않았다.
- Region cache와 `previousAttackRegions` 갱신 시점은 Combat 결과에 민감하므로 Task3에서도 이동하지 않는다.
- `previousAttackRegion`은 전달받은 attacker snapshot을 조회하지만 상태를 생성·소유·수정하지 않는다.
