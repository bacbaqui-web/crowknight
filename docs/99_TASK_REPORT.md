# Runtime Structure Refactor

## 현재 진행률

55%

## 완료 Task

✅ Task1 — 기준점 구축

✅ Task2 — Interaction Overlap 분리

✅ Task3 — Enemy Runtime 분리

⬜ Task4 — Run Actor 목록 분리

⬜ Task5 — Run Lifecycle 분리

⬜ Task6 — 최종 QA와 문서 정리

## 다음 Task

Task4 — Run Actor 목록 분리

## Task3 목표와 결과

Enemy의 행동과 생명주기를 `enemy_runtime_engine.js`로 이동했다. `combat_engine.js`는 공격 결과와 damage, reaction, Combat 상태의 Source of Truth로 유지했다.

- Enemy 방향과 lock Formula facing 이동
- Enemy AI 후보 선택, Action 실행과 cooldown 이동
- Actor별 `maxAlive`와 spawn rule 해석 이동
- Enemy 활성 수, hide, respawn timer와 위치 이동
- respawn 시 HP, Action 상태와 Runtime flag 초기화 이동
- `main.js`의 전투 전·후 `maintainEnemyFlow` 호출 위치와 횟수 유지
- Combat, Run Actor 목록, Run Lifecycle와 저장 데이터 구조 변경 없음

## 새 파일

- `src/enemy_runtime_engine.js`
  - Enemy 방향·AI·cooldown
  - 활성 수·spawn rule
  - hide·respawn·Runtime 초기화
  - 215줄

## 이동한 함수

기존 위치: `src/combat_engine.js`

새 위치: `src/enemy_runtime_engine.js`

- `updateBattleActorMotion`
- `faceNpcActorTowardPlayer`
- `npcLockFormulaFacing`
- `oppositeFacingFromPlayer`
- `shouldNpcFacePlayer`
- `runEnemyRangeAi`
- `enemyRangeActionCandidate`
- `startEnemyAiActionCooldown`
- `maintainEnemyFlow`
- `hideEnemyActor`
- `updateEnemyRespawn`
- `activeEnemyCount`
- `groupEnemyActorsById`
- `resolveEnemyActorSpawnRule`
- `respawnEnemyActor`
- `enemyRespawnX`
- `updateEnemyAiCooldowns`

`main.js`에 중복되어 있던 `resolveRuntimeEnemyMaxAlive`는 제거했다. 최초 Runtime clone 생성은 `main.js`에 유지하고 `resolveEnemyActorSpawnRule()`의 결과만 사용한다.

## combat_engine.js 변화

823줄

↓

611줄

남은 책임:

- 근접·Projectile Combat Resolve
- Attack/Hurt/Guard/Collision 판정 흐름
- Damage, Hit Cancel, Knockback, Invincible Time
- Death와 Hit Reaction
- Region cache와 `previousAttackRegions`
- Combat timer

`updateActorCombatTimers()`는 Invincible/Hurt/Hit 상태를 다루므로 `combat_engine.js`에 유지하고 export했다. Enemy Runtime이 기존 Battle Motion 순서 안에서 이를 호출한다.

## enemy_runtime_engine.js 공개 API

- `updateBattleActorMotion`
  - 호출처: `main.js`
  - 역할: Combat timer, AI cooldown, Player update, Enemy 방향·AI·NPC update의 기존 순서 조립
- `maintainEnemyFlow`
  - 호출처: `main.js`의 Combat 전 `dt: 0`, Combat 후 `dt`
  - 역할: Actor별 활성 수, hide, respawn timer와 respawn 처리
- `resolveEnemyActorSpawnRule`
  - 호출처: `main.js`의 최초 Runtime clone 수 계산과 `maintainEnemyFlow`
  - 역할: Actor rule → pool rule → 기본값 순서로 `maxAlive`와 interval 해석

## 실행 순서 보존 확인

- 전투 전 Enemy Flow: 생존 시간 증가 직후 `maintainEnemyFlow(..., dt: 0)` 유지
- Actor Motion: Combat timer → AI cooldown → Player update → Enemy 방향 → AI Action → NPC update 유지
- Combat: Projectile update → 근접 Combat → Projectile Combat 유지
- 전투 후 Enemy Flow: 두 Combat 처리 뒤 `maintainEnemyFlow(..., dt)` 유지
- Effect: 전투 후 Enemy Flow 뒤에 기존 효과 update 유지

같은 frame에서 죽은 Enemy는 Combat 뒤 Enemy Flow에서 timer를 처리하며, 전투 전 `dt: 0`은 사망 Actor의 timer를 진행하지 않는다.

## 작성한 테스트

- 파일: `test/enemy_runtime_engine.test.js`
- 새 테스트: 6개
- 전체 Node test: 11개

검증 대상:

- Actor rule, pool rule, 기본값의 `maxAlive` 우선순위
- 소수 반올림과 음수 0 제한
- Actor 종류와 mobs/bosses 활성 수 격리
- 부족한 수만 활성화하고 충분할 때 추가 활성화하지 않는 흐름
- `dt: 0`에서 respawn timer 미진행
- timer 완료 전·후 respawn과 위치 규칙
- respawn 시 HP, Action 상태, hit/AI flag 초기화
- 다른 Enemy clone 상태 비변경
- 고정된 `Math.random`에서 AI Action 선택
- lock Formula 방향, AI cooldown, Player/NPC update 순서
- Action 실행 불가 상태에서 AI Action 미실행
- `Math.random` 원상 복구

## Source of Truth

| 책임                  | 담당 파일                       |
| --------------------- | ------------------------------- |
| Enemy 방향·AI         | `enemy_runtime_engine.js`       |
| Enemy 활성 수·Respawn | `enemy_runtime_engine.js`       |
| Actor 공통 Runtime    | `actor_runtime_engine.js`       |
| Combat·Damage         | `combat_engine.js`              |
| Overlap Geometry      | `interaction_overlap_helper.js` |
| AI 설정 Normalize     | `enemy_ai_settings_helper.js`   |

## Runtime 책임 분포

| 파일                            | 주요 책임 수 | 실제 책임                                                                  |
| ------------------------------- | -----------: | -------------------------------------------------------------------------- |
| `main.js`                       |            5 | Bootstrap, Runtime Loop, Run Lifecycle, Runtime Actor Roster, Screen State |
| `combat_engine.js`              |            4 | Combat Resolve, Damage/Reaction, Region Cache, Combat Timers               |
| `enemy_runtime_engine.js`       |            4 | Enemy Direction/AI, Cooldown, Active Count/Spawn Rule, Respawn             |
| `actor_runtime_engine.js`       |            3 | World Physics, Action Runtime, Actor State                                 |
| `interaction_overlap_helper.js` |            3 | Rect Overlap, Polygon SAT, Swept Overlap                                   |

## 문서 변경

- `docs/99_TASK_REPORT.md` — Task3 결과, API, 실행 순서, 테스트와 QA 기록
- `docs/sprint-dashboard.html` — Task3 완료와 누적 진행률 55% 반영
- `docs/10_SRC_MAP.md` — Enemy Runtime 등록과 Combat 역할 수정
- `docs/src-map.html` — Source inventory, Runtime Flow, Runtime/Interaction 그룹, 책임 Audit, 줄 수와 위험도 갱신

## QA 결과

- `npm run check`: 통과 (ESLint, Prettier)
- `git diff --check`: 통과
- `node --test`: 11개 통과, 실패 0개
- HTTP 확인: `index.html`, `setting.html`, `enemy_runtime_engine.js` 모두 `200`
- 잔여 참조와 중복 구현 검색: 이동 함수의 `combat_engine.js` 잔여 구현 0개
- 호출 횟수: `maintainEnemyFlow` 2회, `updateBattleActorMotion` 1회 유지
- 순환 import: `src` JavaScript 202개 검사, cycle 0개
- 모듈 import: Enemy Runtime, Combat, Overlap Helper 통과
- SRC Map: 실제 파일 202/202, 누락·오래된 경로·그룹 미등록 없음
- 저장 데이터 변경: 없음
- 브라우저 QA: 현재 세션에 연결 가능한 인앱 브라우저가 없어 미수행

## 발견한 위험 또는 보류 사항

- `main.js`는 833줄로 800줄 리팩토링 권장 기준을 넘으며 Task4의 Runtime Actor Roster 분리 대상이다.
- `enemy_runtime_engine.js`가 Combat timer의 Source of Truth를 유지하기 위해 `combat_engine.js`의 `updateActorCombatTimers()`에 단방향으로 의존한다.
- DOM/Canvas/Firebase가 필요한 실제 Run 동작은 자동 Node test와 별도로 브라우저 QA가 필요하다.
