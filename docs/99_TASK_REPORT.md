# Runtime Structure Refactor

## 현재 진행률

90%

## 완료 Task

✅ Task1 — 기준점 구축

✅ Task2 — Interaction Overlap 분리

✅ Task3 — Enemy Runtime 분리

✅ Task4 — Run Actor 목록 분리

✅ Task5 — Run Lifecycle 분리

⬜ Task6 — 최종 QA와 문서 정리

## 다음 Task

Task6 — 최종 QA와 문서 정리

## Task5 목표와 결과

`main.js`가 직접 변경하던 Run mutable 상태와 시작·종료·사망·결과 전환을 `run_lifecycle_controller.js`로 이동했다. `main.js`는 기존 update/draw 분기 순서와 Actor, Projectile, Input, Effect, Ranking, HUD, DOM 연결을 유지한다.

- Run 활성, Player 사망, 결과 화면 상태를 Controller 단일 Source of Truth로 이동
- 생존 시간, 일반 적·Boss 처치 수와 최종 점수 이동
- 시작, 수동 종료, 사망 시작, 사망 sequence 완료, 결과 확정과 재시작 초기화 이동
- `run_hud_view.js`의 기존 점수 산식 재사용
- Boss의 `runtimeBossKillCounted` 중복 집계 방지 유지
- Boss 처치 HP 회복과 난이도 증가 로직 없음 확인
- Actor roster, Enemy Runtime, Combat, Ranking 저장 형식과 Project 저장 schema 변경 없음

## 새 파일

- `src/run_lifecycle_controller.js`
- 실제 역할: Run 상태, 시작·종료·사망·결과 전환, 생존 시간, 처치 집계와 최종 결과
- 170줄

## 이동한 상태와 함수

| 상태 또는 전환          | 기존 위치                                  | 새 위치                                    | 역할                                 |
| ----------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------ |
| `battleActive`          | `main.js`                                  | `run_lifecycle_controller.js`              | Battle 활성 상태                     |
| `playerDeathPending`    | `main.js`                                  | `run_lifecycle_controller.js`              | 사망 sequence 상태                   |
| `resultOpen`            | `main.js`                                  | `run_lifecycle_controller.js`              | 결과 화면 상태                       |
| `deathSequenceTime`     | `main.js`                                  | `run_lifecycle_controller.js`              | 기존 2초 사망 연출 시간              |
| `runSurvivalTime`       | `main.js`                                  | `run_lifecycle_controller.js`              | 활성 Run 생존 시간                   |
| `runKills`, `bossKills` | `main.js`                                  | `run_lifecycle_controller.js`              | 일반 적·Boss 분리 집계               |
| `lastRecordedScore`     | `main.js`                                  | `run_lifecycle_controller.js`              | 사망·수동 종료 최종 점수             |
| Run 시작·재시작         | `startRun()`                               | `start()`                                  | 모든 Run 상태 초기화와 시작 callback |
| Run 종료                | `finishRun()`                              | `stop()`                                   | 점수 확정과 종료/결과 callback 분기  |
| Player 사망 시작        | `beginPlayerDeath()`                       | `startPlayerDeath()`                       | 중복 방지, 점수 확정, timer 초기화   |
| 사망 완료 판단          | `updatePlayerDeathSequence()`              | `updateDeathSequence()`                    | duration 뒤 결과 1회 확정            |
| 처치 집계               | `handlePlayerKill()`, `handleEnemyDeath()` | `recordPlayerKill()`, `recordEnemyDeath()` | mobs/Boss 분리와 Boss 중복 방지      |
| 결과 데이터             | `getRunResult()`                           | `getRunResult()`                           | Ranking 저장용 결과 snapshot         |

Actor 사망 애니메이션 update와 DOM 표시 함수는 외부 callback으로 `main.js`와 `ranking_controller.js`에 유지했다.

## 공개 API

- `createRunLifecycleController` — `main.js`가 한 번 생성하는 Controller factory
- `start` — 결과 상태를 닫고 새 Run 상태 초기화
- `stop` — 활성 Run 점수 확정과 시작/결과 화면 callback 분기
- `updateSurvivalTime` — 활성 Battle에서만 생존 시간 증가
- `startPlayerDeath` — 사망 sequence 중복 진입 방지와 시작
- `updateDeathSequence` — 기존 duration 누적과 결과 전환
- `recordPlayerKill` — mobs 일반 적 처치만 집계
- `recordEnemyDeath` — Boss 처치와 `runtimeBossKillCounted` 한 번 집계
- `getRunResult` — 점수, 시간, 일반 적·Boss 처치 결과
- `getSnapshot` — 외부 변경이 내부 상태에 영향을 주지 않는 상태 snapshot
- `isRunActive`, `isDeathPending`, `isResultOpen` — update/draw 분기 read API
- `hasActiveRunActors` — Preview/Battle Actor 목록 선택용 read API

## main.js 변화

751줄

↓

724줄

남은 책임:

- 앱 bootstrap과 Runtime module wiring
- 기존 Runtime update와 draw 순서 조립
- Actor 사망 애니메이션 update
- 시작·결과·조작법 DOM과 버튼 wiring
- Actor, Projectile, Input, Effect, Ranking, HUD callback 연결

## Lifecycle Source of Truth

| 책임             | 담당 파일                     |
| ---------------- | ----------------------------- |
| Run 상태·전환    | `run_lifecycle_controller.js` |
| Actor roster     | `run_actor_state.js`          |
| Enemy AI·Respawn | `enemy_runtime_engine.js`     |
| Combat·Damage    | `combat_engine.js`            |
| 점수 계산        | `run_hud_view.js`             |
| Ranking          | `ranking_controller.js`       |

## 책임 이동 현황

| 기능              | 이전 담당                 | 현재 담당                     |
| ----------------- | ------------------------- | ----------------------------- |
| Run 활성 상태     | `main.js`                 | `run_lifecycle_controller.js` |
| Player 사망 상태  | `main.js`                 | `run_lifecycle_controller.js` |
| 생존 시간         | `main.js`                 | `run_lifecycle_controller.js` |
| 일반 적·Boss 처치 | `main.js`                 | `run_lifecycle_controller.js` |
| 결과 확정         | `main.js`                 | `run_lifecycle_controller.js` |
| Actor roster      | `run_actor_state.js`      | 변경 없음                     |
| Enemy AI·Respawn  | `enemy_runtime_engine.js` | 변경 없음                     |

## Update 분기 보존

다음 공통 분기 순서를 바꾸지 않았다.

1. Runtime debug frame 시작
2. `getActiveActors({ runActive })`로 현재 Actor 목록 계산
3. 모든 활성 Actor frame 시작 위치 캡처
4. 조작법 화면이면 종료
5. 사망 sequence만 update 후 종료
6. 결과 scene만 update 후 종료
7. Run 비활성이면 Preview update 후 종료
8. Run 활성이면 Battle update

`runActive` 값은 기존 `battleActive || playerDeathPending || resultOpen`과 같은 `hasActiveRunActors()` 결과를 사용한다. 사망·결과 중 Battle update가 실행되지 않으며 Preview/Battle Actor 선택 시점도 유지했다.

## 작성한 테스트

- 파일: `test/run_lifecycle_controller.test.js`
- 새 테스트: 8개
- 전체 테스트: 25개

검증 대상:

- Run 시작과 두 번째 시작의 전체 상태 초기화 및 callback 횟수
- 활성 Battle에서만 생존 시간 증가
- mobs만 일반 적 처치로 집계하고 Player, Boss, 잘못된 Actor 제외
- Boss 분리 집계와 동일 Boss 중복 방지
- Boss 처치 HP 회복·난이도 상태 없음
- Player 사망 중복 진입 방지와 timer 유지
- 기존 2초 duration 전 결과 미확정, 완료 후 1회 확정
- 생존 시간, 일반 적·Boss 처치와 기존 점수 산식 결과
- 수동 종료의 점수 확정과 callback 분기
- 외부 snapshot 변경으로부터 내부 상태 격리

## Runtime 책임 분포

| 파일                          | 주요 책임 수 | 실제 책임                                                            |
| ----------------------------- | -----------: | -------------------------------------------------------------------- |
| `main.js`                     |            4 | Bootstrap/Module Wiring, Runtime Update, Runtime Draw, Screen Wiring |
| `run_lifecycle_controller.js` |            4 | Run State, Death Sequence, Kill Count, Result Transition             |
| `run_actor_state.js`          |            4 | Player Selection, Enemy Clone, Actor Ordering, Active Roster         |
| `enemy_runtime_engine.js`     |            4 | Enemy Direction/AI, Cooldown, Active Count/Rule, Respawn             |
| `combat_engine.js`            |            4 | Combat Resolve, Damage/Reaction, Region Cache, Combat Timers         |

## 문서 변경

- `docs/99_TASK_REPORT.md` — Task5 결과, Lifecycle API, 책임 이동, 테스트와 QA 기록
- `docs/sprint-dashboard.html` — Task5 완료와 누적 진행률 90% 반영
- `docs/10_SRC_MAP.md` — Run Lifecycle Controller 등록과 `main.js` 역할 수정
- `docs/src-map.html` — Source inventory, Runtime Flow/그룹, 책임 Audit, 줄 수와 위험도 갱신

## QA 결과

- `npm run check`: 통과 (ESLint, Prettier)
- `git diff --check`: 통과
- `node --test`: 25개 통과, 실패 0개
- HTTP 확인: `index.html`, `setting.html`, `run_lifecycle_controller.js` 모두 `200`
- 중복 상태 검색: 8개 Run mutable 상태 write는 `run_lifecycle_controller.js` 한 곳
- 결과 중복 확정: `resultReady` guard와 사망 pending 해제로 result callback 1회
- Controller DOM 조회/import: 없음
- Controller의 `main.js` import: 없음
- 순환 import: `src` JavaScript 204개 검사, cycle 0개
- SRC Map: 실제 JavaScript 204/204, 누락·오래된 경로 없음
- 저장 데이터 변경: 없음
- 브라우저 QA: 현재 세션에 연결 가능한 인앱 브라우저가 없어 미수행

## 발견한 위험 또는 보류 사항

- `main.js`는 724줄로 500줄 검토 권장 기준을 넘는다. 다만 Task5 범위를 지키기 위해 Runtime 조립과 Screen wiring의 추가 분리는 Task6 이후 검토 대상으로 남겼다.
- `action_trigger_engine.js`는 812줄로 800줄 리팩토링 권장 기준을 넘지만 이번 Run Lifecycle 범위와 관련 없어 수정하지 않았다.
- 실제 게임 플레이 브라우저 QA와 최종 Dead Code 검색은 Task6에서 수행한다.
