# Runtime Structure Refactor

## 현재 진행률

15%

## 완료 Task

✅ Task1 — 기준점 구축 및 Characterization Test 계획

## 다음 Task

Task2 — `interaction_overlap_helper` 분리

## Task1 범위

이번 Task에서는 Runtime 구현을 이동하거나 수정하지 않았다. 이후 리팩토링에서 기존 플레이 방식, 저장 데이터, 전투 결과와 frame 순서를 보존할 수 있도록 현재 동작과 검증 기준만 기록했다.

### 기준 커밋

- 기준: `fb05e83 chore: prepare runtime refactor baseline`
- 난이도 제거와 Asset 변경은 기준 커밋에 이미 고정되어 있다.
- Task1 시작 시 작업 트리는 깨끗했다.
- 기준 커밋의 history는 다시 쓰지 않는다. Task1 문서 변경부터 Task별 독립 커밋으로 관리한다.
- Runtime 소스와 `runtime/project-default-state.json`은 읽거나 수정하지 않았다.

## 현재 Runtime update 순서

### Frame loop

1. `dt`를 최대 `0.033`으로 제한한다.
2. `update(dt)`를 실행한다.
3. `draw()`를 실행한다.
4. frame 입력인 `pressed`를 비운다.
5. 다음 `requestAnimationFrame`을 예약한다.

### 공통 update 분기

1. Runtime debug frame을 시작한다.
2. 현재 활성 Actor 목록을 계산한다.
3. 모든 활성 Actor의 frame 시작 위치를 캡처한다.
4. 조작법 화면이 열려 있으면 update를 종료한다.
5. 플레이어 사망 연출 중이면 사망 sequence만 update하고 종료한다.
6. 결과 화면이 열려 있으면 결과 scene만 update하고 종료한다.
7. Run이 비활성 상태이면 선택 Actor 또는 기본 플레이어의 preview update와 효과만 처리하고 종료한다.
8. Run이 활성 상태이면 아래 Battle update를 실행한다.

### Battle update

1. 생존 시간을 더한다.
2. `maintainEnemyFlow(..., dt: 0)`으로 전투 전 Enemy 활성 수를 맞춘다.
3. Actor combat timer를 갱신한다.
4. Player action runtime과 physics를 갱신한다.
5. Enemy 방향, AI action, NPC action runtime과 physics를 갱신한다.
6. Projectile runtime을 갱신한다.
7. 근접·trace·collision·guard combat을 판정한다.
8. Projectile combat을 판정한다.
9. `maintainEnemyFlow(..., dt)`로 사망 후 숨김과 respawn timer를 처리한다.
10. 잔상, 색상, shake, dust, particle 효과를 갱신한다.

`Enemy Flow`의 전·후 두 번 호출, 근접 Combat 뒤 Projectile Combat, Combat 완료 뒤 Respawn 순서는 보존 대상이다.

### 근접 Combat 내부 순서

1. 해당 `resolveCombat()` 호출 전용 Region cache를 만든다.
2. Collision interaction을 해결한다.
3. Collision과 Hurt interaction을 해결한다.
4. Attack 대상별 중복 hit를 `lastHitSerials`로 차단한다.
5. Hurt, Guard, Attack Region을 cache에서 읽는다.
6. Guard, Hit Cancel, Damage, Death/Hit Reaction 순서로 판정한다.
7. 모든 근접 판정이 끝난 뒤 `previousAttackRegions`를 현재 Region으로 동기화한다.

`lastHitSerials`는 Guard와 Hit Cancel보다 먼저 기록된다. damage가 발생하지 않아도 같은 `attackSerial`은 다시 판정하지 않는 현재 규칙을 유지한다.

### Render 순서

1. World와 camera transform
2. Dust
3. Formula afterimage
4. Roll ghost
5. Actor
6. Projectile
7. Hit spark와 death particle
8. Attack trail
9. 설정 페이지 debug box
10. World foreground
11. Editor handle
12. Run HUD
13. Runtime debug HUD
14. 조건부 Ranking HUD

## Characterization Test 계획

외부 라이브러리는 추가하지 않는다. Node 내장 `node:test`와 `node:assert/strict`를 사용한다.

| 대상             | 고정할 현재 동작                                                                                 | Task1 기준 검증 방법                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Run 시작         | 선택 Player 확정, 카운터·효과·Projectile·입력 초기화, Actor 배치, Boss 중복 집계 flag 초기화     | 현재는 브라우저 QA, Task5 추출 후 Node test              |
| Run 종료         | 활성 Run 점수 보존, Projectile와 입력 초기화, 시작/결과 화면 분기                                | 현재는 브라우저 QA, Task5 추출 후 Node test              |
| Player 선택      | base Actor에 존재하는 선택 Actor 사용, 없으면 기본 Player fallback                               | 현재는 브라우저 QA, Task4 추출 후 Node test              |
| Enemy 생성       | 원본 Actor를 Runtime clone하고 Actor별 최초 생성 수와 runtime flag를 적용                        | 현재는 브라우저 QA, Task4 추출 후 Node test              |
| Enemy `maxAlive` | Actor rule, pool rule, 기본값 순으로 해석하고 정수·0 이상으로 제한                               | Task4 추출 후 Node test                                  |
| Boss Kill        | Boss만 `bossKills`에 한 번 집계하고 기존 점수·사망·다음 등장 흐름 유지                           | 현재는 브라우저 QA, Task5 추출 후 Node test              |
| 일반 적 Kill     | Boss가 아닌 적만 `runKills`에 집계                                                               | 현재는 브라우저 QA, Task5 추출 후 Node test              |
| Attack 중복 방지 | 같은 attacker와 `attackSerial`은 대상별 한 번만 판정하고 새 serial은 다시 허용                   | 현재 `resolveCombat` fake Actor 통합 test 가능           |
| Trace 공격       | 현재 Region이 직접 닿지 않아도 같은 key/action의 이전 Region과 swept overlap이면 hit             | 현재 `resolveCombat` 통합 test, Task2부터 순수 함수 test |
| Projectile 공격  | 활성 owner가 있는 Projectile만 판정하고 `hitTargets`로 중복 hit를 막으며 hit 또는 cancel 뒤 제거 | 현재 `resolveProjectileCombat` fake Actor 통합 test 가능 |
| 저장 호환성      | 기존 local 설정과 배포 데이터가 normalize되고 누락된 신규 값은 기본값으로 보완                   | 순수 normalizer Node test와 브라우저 load QA 병행        |

추가 회귀 기준:

- Guard는 damage 없이 hit reaction과 기존 camera shake를 유지한다.
- mobs 공격은 bosses에게 damage를 주지 않는다.
- Hit Cancel의 성공 여부와 Projectile 제거 시점을 유지한다.
- Enemy 사망 callback, ragdoll/dead 처리와 일반 적·Boss 집계 순서를 유지한다.
- Melee와 Projectile은 각각 독립된 Region cache를 사용한다.
- AI 선택, respawn 위치, Hit Cancel처럼 난수를 쓰는 테스트는 `Math.random`을 고정하고 원상 복구한다.

## Node 내장 test 검토 결과

- 확인 환경: Node `v24.13.0`
- 프로젝트가 ESM(`"type": "module"`)이므로 `node:test`를 별도 의존성 없이 사용할 수 있다.
- `combat_engine.js`, `projectile_runtime_engine.js`, `interaction_swept_region_helper.js`, `stage_rules_state.js`, `run_hud_view.js`는 Node에서 import 가능하다.
- `resolveCombat`, `resolveProjectileCombat`, `maintainEnemyFlow`, `updateBattleActorMotion`은 현재 export되어 fake Actor 기반 characterization test가 가능하다.
- `main.js`는 top-level DOM, `window`, Canvas, Firebase bootstrap과 private closure 상태에 결합되어 직접 Node import test를 만들기 어렵다.
- Task1에서는 테스트를 위해 export를 추가하거나 Runtime 구조를 바꾸지 않는다. Run lifecycle과 Actor 생성은 Task4·Task5의 책임 이동 직후 Node test로 고정한다.
- 별도 npm script나 외부 test runner는 Task1에서 추가하지 않는다. 최초 test 파일이 생기는 Task2에서 `node --test` 실행 경로를 확정한다.

## 발견한 위험 요소

- `src/main.js`는 839줄이며 앱 bootstrap, DOM, Firebase, Run 상태가 top-level closure에 결합되어 있다.
- `src/combat_engine.js`는 893줄이며 Enemy AI, Enemy Flow, Combat, Region cache, 순수 기하 계산이 섞여 있다.
- 두 파일 모두 800줄 리팩토링 권장 기준을 넘으며 작은 변경에도 큰 컨텍스트가 필요해 토큰 낭비 위험이 있다.
- `maintainEnemyFlow`의 전투 전 `dt: 0` 호출과 전투 후 `dt` 호출 위치가 달라지면 같은 frame의 활성 수와 respawn 결과가 바뀔 수 있다.
- Region cache는 `resolveCombat` 호출 단위이며 Collision 이동 뒤 cache 무효화가 필요하다.
- `previousAttackRegions`는 근접 Combat 전체가 끝난 뒤 갱신된다. 갱신 시점을 앞당기면 trace 판정이 바뀐다.
- `lastHitSerials` 기록은 Guard와 Hit Cancel보다 앞선다. 이 순서를 바꾸면 한 공격이 여러 번 시도될 수 있다.
- Projectile의 `hitTargets` 기록과 제거 순서가 바뀌면 중복 damage 또는 callback 중복이 발생할 수 있다.
- Enemy 사망, Player 처치 집계, ragdoll/dead callback 순서는 점수와 결과 화면에 영향을 준다.
- Runtime과 설정 페이지가 `main.js`를 공유하므로 Runtime 분리 중 Editor preview 경로가 섞일 위험이 있다.
- 로컬 설정 페이지와 Firebase/Storage를 사용하는 게임 페이지의 데이터 경로를 리팩토링 범위 밖으로 유지해야 한다.

## Task2에서 이동 예정인 함수

새 파일: `src/interaction_overlap_helper.js`

`combat_engine.js`에서 다음 순수 overlap 책임을 이름과 실행 순서 변경 없이 이동할 예정이다.

- `overlappingCollisionHurtRegion`
- `overlappingAttackRegion`
- `overlappingGuardBlockAttackRegion`
- `previousAttackRegion`
- `attackRegionOverlaps`
- `interactionRegionsOverlap`
- `rectsOverlap`
- `convexPolygonsOverlap`
- `projectPolygon`

Task2에서도 다음 frame 상태 책임은 `combat_engine.js`에 유지한다.

- `createInteractionRegionFrameCache`
- `cachedInteractionRegions`
- `invalidateCachedInteractionRegions`
- `readInteractionRegions`
- `syncPreviousAttackRegions`

Task2 완료 조건은 사각형, SAT, swept trace 순수 함수 test 통과와 Guard·일반 공격·trace 공격 결과 보존이다.

## 이번 Task에서 작성/수정한 문서

- `docs/99_TASK_REPORT.md` — 기준 커밋, update/render 순서, Characterization Test 계획, 위험 요소, Task2 이동 범위 기록
- `docs/sprint-dashboard.html` — Runtime Structure Refactor Task1 완료와 진행률 15% 반영

`docs/10_SRC_MAP.md`와 `docs/src-map.html`은 직전 기준 커밋에서 실제 `src` JS 200/200과 동기화되어 있어 Task1에서는 다시 수정하지 않았다.

## QA 결과

- `npm run check`: 통과 (ESLint, Prettier)
- `git diff --check`: 통과
- Node ESM import 확인: 통과
- Sprint Dashboard HTTP 확인: `200`
- Runtime 소스와 저장 기본값 변경 여부: 변경 없음
- 시각적 페이지 QA: 현재 세션에 연결 가능한 인앱 브라우저가 없어 미수행
