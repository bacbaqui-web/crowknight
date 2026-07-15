# Runtime Structure Refactor — Final Report

## 최종 진행률

100%

## 완료 Task

✅ Task1 — 기준점 구축

✅ Task2 — Interaction Overlap 분리

✅ Task3 — Enemy Runtime 분리

✅ Task4 — Run Actor 목록 분리

✅ Task5 — Run Lifecycle 분리

✅ Task6 — 최종 QA와 문서 정리

## 최종 결과 요약

기능·저장 구조·전투 결과·Runtime 순서를 바꾸지 않고 `main.js`와 `combat_engine.js`에 섞여 있던 Geometry, Enemy Runtime, Actor roster, Run Lifecycle 책임을 전용 모듈로 분리했다.

- `main.js`는 앱 bootstrap, Runtime update/draw 조립과 Screen wiring을 담당한다.
- Run 상태는 `run_lifecycle_controller.js` 한 곳에서만 변경한다.
- Runtime Actor 목록은 `run_actor_state.js` 한 곳에서만 소유한다.
- Enemy 방향·AI·활성 수·Respawn은 `enemy_runtime_engine.js`가 담당한다.
- Combat 판정·Damage·Reaction·Region cache는 `combat_engine.js`에 유지했다.
- 순수 overlap Geometry는 `interaction_overlap_helper.js`가 담당한다.
- 기존 점수 산식, Ranking 형식, 저장 schema와 전투 수치는 변경하지 않았다.

## 최종 구조

| 파일                            | 최종 책임                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `main.js`                       | Bootstrap, Module Wiring, Runtime Update/Draw Loop, Screen/Button/DOM/Canvas 연결         |
| `run_lifecycle_controller.js`   | Run 활성·사망·결과 상태, 생존 시간, 처치 수, 최종 점수와 상태 전환                        |
| `run_actor_state.js`            | Player 선택, Runtime Enemy clone, Actor 정렬, Preview/Battle Actor 목록                   |
| `enemy_runtime_engine.js`       | Enemy 방향, AI, cooldown, 활성 수, Spawn Rule, 숨김과 Respawn                             |
| `combat_engine.js`              | Combat Resolve, Damage/Reaction, Guard, Hit Cancel, Knockback, Region cache, Combat timer |
| `interaction_overlap_helper.js` | Rect overlap, Polygon SAT, Swept overlap                                                  |

## 생성 파일

- `src/interaction_overlap_helper.js`
- `src/enemy_runtime_engine.js`
- `src/run_actor_state.js`
- `src/run_lifecycle_controller.js`
- `test/interaction_overlap_helper.test.js`
- `test/enemy_runtime_engine.test.js`
- `test/run_actor_state.test.js`
- `test/run_lifecycle_controller.test.js`

## Before / After

| 책임                   | 리팩토링 전             | 리팩토링 후                     |
| ---------------------- | ----------------------- | ------------------------------- |
| Runtime 조립           | `main.js`               | `main.js`                       |
| Run 상태·전환          | `main.js`               | `run_lifecycle_controller.js`   |
| Runtime Actor 목록     | `main.js`               | `run_actor_state.js`            |
| Enemy AI·Respawn       | `combat_engine.js`      | `enemy_runtime_engine.js`       |
| Combat·Damage·Reaction | `combat_engine.js`      | `combat_engine.js`              |
| Overlap Geometry       | `combat_engine.js`      | `interaction_overlap_helper.js` |
| 점수 계산              | `run_hud_view.js`       | `run_hud_view.js`               |
| Ranking                | `ranking_controller.js` | `ranking_controller.js`         |

## 파일 크기 변화

| 파일                            | 이전 | 현재 |
| ------------------------------- | ---: | ---: |
| `main.js`                       |  839 |  704 |
| `combat_engine.js`              |  893 |  611 |
| `run_lifecycle_controller.js`   | 없음 |  170 |
| `run_actor_state.js`            | 없음 |  129 |
| `enemy_runtime_engine.js`       | 없음 |  215 |
| `interaction_overlap_helper.js` | 없음 |   74 |

줄 수 감소는 완료 기준으로 사용하지 않았으며 최종 책임과 동작 보존을 기준으로 확인했다.

## Source of Truth

| 책임                   | 담당 파일                       |
| ---------------------- | ------------------------------- |
| Run 상태·전환          | `run_lifecycle_controller.js`   |
| Runtime Actor 목록     | `run_actor_state.js`            |
| Enemy 방향·AI·Respawn  | `enemy_runtime_engine.js`       |
| Combat·Damage·Reaction | `combat_engine.js`              |
| Overlap Geometry       | `interaction_overlap_helper.js` |
| Actor 공통 Runtime     | `actor_runtime_engine.js`       |
| 점수 계산              | `run_hud_view.js`               |
| Ranking 흐름           | `ranking_controller.js`         |
| AI 설정 normalize      | `enemy_ai_settings_helper.js`   |

## Dead Code / 중복 검사

제거한 잔여 wrapper:

- `beginPlayerDeath()` — `runLifecycle.startPlayerDeath` 직접 전달
- `finishRun()` — `runLifecycle.stop` 직접 호출
- `runActorOrderActive()` — `runLifecycle.hasActiveRunActors` 직접 호출
- `handlePlayerKill()` — `runLifecycle.recordPlayerKill` 직접 전달
- `handleEnemyDeath()` — `runLifecycle.recordEnemyDeath` 직접 전달

검사 결과:

- Geometry 함수는 `interaction_overlap_helper.js` 한 곳에만 존재한다.
- Enemy AI·방향·Respawn Runtime 구현은 `enemy_runtime_engine.js` 한 곳에만 존재한다.
- Runtime Enemy mutable 배열은 `run_actor_state.js` 한 곳에만 존재한다.
- Run mutable 상태 8개는 `run_lifecycle_controller.js` 한 곳에서만 변경된다.
- `stage_rules_controller.js`의 같은 이름 Spawn Rule resolver는 Editor 표시값 선택용이므로 유지했다.
- 추출 모듈 export 14개를 검사했으며 사용되지 않는 export는 0개다.
- ESLint 기준 사용되지 않는 import는 0개다.

## Runtime Flow 검증

### 공통 frame

1. `dt`를 최대 0.033초로 clamp
2. `update(dt)`
3. `draw()`
4. `pressed.clear()`
5. 다음 `requestAnimationFrame(loop)` 예약

### 공통 update

1. Runtime debug frame 시작
2. Active Actor 계산
3. frame 시작 위치 snapshot
4. 조작법 화면 분기
5. Player death sequence 분기
6. 결과 화면 분기
7. Preview 분기
8. Battle update

### Battle update

1. 생존 시간 증가
2. 전투 전 Enemy Flow(`dt: 0`)
3. Combat timer와 Enemy AI cooldown
4. Player Action Runtime/physics
5. Enemy 방향·AI·NPC Runtime/physics
6. Projectile update
7. 근접/trace/collision/guard Combat
8. Projectile Combat
9. 전투 후 Enemy Flow(`dt`)
10. Ghost, Formula, Particle Effect update

### 근접 Combat

1. frame Region cache 생성
2. Collision 처리
3. Collision/Hurt 처리
4. `lastHitSerials` 중복 차단
5. Hurt/Guard/Attack Region 읽기
6. Guard → Hit Cancel → Damage → Death/Reaction
7. `previousAttackRegions` 동기화

### Render

World background → Dust/Afterimage/Ghost/Actor → Projectile → Hit/Death Effect → Attack Trail → Editor debug → Foreground → Edit handles → HUD → Runtime Debug → Ranking HUD 순서를 유지한다.

## 테스트

- 테스트 파일: 4개
- 전체 테스트: 25개
- 통과: 25개
- 실패: 0개

검증 범위:

- Rect/Polygon/SAT/Swept overlap과 Trace 공격
- Enemy Spawn Rule, 종류별 활성 수, AI/cooldown과 Respawn
- Runtime Actor clone, Player fallback, maxAlive와 Actor 정렬
- Run 시작·재시작, 생존 시간, 일반 적·Boss 처치와 Boss 중복 방지
- Player 사망 sequence, 결과 확정, 점수와 Snapshot 격리

## QA 결과

- `npm run check`: 통과
- ESLint: 통과
- Prettier: 통과
- `git diff --check`: 통과
- `node --test`: 25개 통과, 실패 0개
- 전체 `src` JavaScript 문법 검사: 204개 통과
- 상대 import 해석: 누락 0개
- 순환 import: 0개
- 하위 모듈의 `main.js` import: 0개
- SRC Map inventory: 실제 파일 204/204, 누락 0개, 오래된 경로 0개
- HTTP 200: `index.html`, `setting.html`, Lifecycle, Actor State, Enemy Runtime, Combat, Overlap 모듈
- 저장·규칙 파일 baseline diff: 변경 없음
- Project schema, Local/Firebase metadata, Ranking, Actor/Action/Stage/AI 설정 구조 변경 없음
- 전투 수치, AI 확률, Respawn 시간, 점수 산식, 사망 연출 시간 변경 없음
- Asset, PNG, PSD 변경 없음

제거 기능 검색:

- Boss 처치 기반 난이도·Boss HP·일반 적 수 증가 Runtime 소비처: 0개
- Boss 처치 Player HP 회복 Runtime 소비처: 0개
- 난이도/HP+1 경고 UI와 효과: 0개
- `runtime/project-default-state.json`에는 baseline부터 존재한 `bossKillInterval`, `bossHpPerLevel`, `spawnIncreaseByActor`, `warningText` 호환 데이터가 남아 있으나 읽는 Runtime 코드는 없다.
- Task6의 저장 schema 변경 금지에 따라 위 비활성 호환 데이터는 수정하지 않았다.

브라우저 QA:

- 현재 세션에서 사용 가능한 인앱 브라우저가 없어 실제 게임 플레이와 Editor 조작 QA는 미수행했다.
- HTTP 200과 자동 검사를 실제 플레이 검증 완료로 간주하지 않았다.

## 문서 변경

- `docs/99_TASK_REPORT.md` — 전체 리팩토링 최종 완료 보고서
- `docs/sprint-dashboard.html` — Sprint 완료, 진행률 100%, 브라우저 QA 미확인 표시
- `docs/10_SRC_MAP.md` — 최종 Runtime 역할과 검색 경로 확정
- `docs/src-map.html` — 최종 Inventory, Runtime Flow, 책임 Audit, 줄 수와 위험도 반영

## 남은 보류 사항

- 실제 브라우저에서 전투·사망·Ranking·재시작과 Editor Preview를 수동 검증해야 한다.
- `main.js`는 704줄로 500줄 검토 권장 기준을 넘지만 허용된 조립·화면 wiring 책임만 남아 이번 Sprint에서는 추가 분리하지 않았다.
- `action_trigger_engine.js`는 812줄로 별도 리팩토링 후보이며 이번 Runtime 구조 작업 범위에서는 수정하지 않았다.
- 비활성 난이도 호환 데이터 제거는 저장 schema migration 정책을 정한 별도 작업에서 검토해야 한다.

## 최종 판정

완료
