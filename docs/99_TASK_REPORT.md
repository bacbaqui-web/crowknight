# Runtime Structure Refactor

## 현재 진행률

70%

## 완료 Task

✅ Task1 — 기준점 구축

✅ Task2 — Interaction Overlap 분리

✅ Task3 — Enemy Runtime 분리

✅ Task4 — Run Actor 목록 분리

⬜ Task5 — Run Lifecycle 분리

⬜ Task6 — 최종 QA와 문서 정리

## 다음 Task

Task5 — Run Lifecycle 분리

## Task4 목표와 결과

현재 Run의 Player와 Enemy 목록을 `run_actor_state.js`가 소유하도록 분리했다. `main.js`는 Lifecycle 상태를 유지하면서 Run Actor State가 반환하는 목록을 update와 draw에 전달한다.

- 유효한 선택 Player와 기본 Player fallback 해석 이동
- Preview base Actor와 Battle Runtime Actor 경계 이동
- 모든 Battle Enemy를 base Actor와 분리된 Runtime clone으로 생성
- Task3의 `resolveEnemyActorSpawnRule()` 재사용
- Runtime Enemy 배열 단일 소유
- Player → mobs → bosses update 순서와 Enemy → Player draw 순서 유지
- Run 시작·종료·사망·점수·결과 화면 책임은 `main.js`에 유지

## 새 파일

- `src/run_actor_state.js`
- 선택 이유: 현재 Player와 mutable Runtime Enemy roster를 함께 소유하므로 `_roster_state`보다 프로젝트 마스터 플랜과 기존 `_state` 역할에 맞는 짧은 이름을 사용했다.
- 실제 역할: Player 선택, Enemy clone, 최초 생성 수, 정렬, Preview/Battle 활성 Actor 목록
- 129줄

## 이동한 상태와 함수

기존 위치: `src/main.js`

새 위치: `src/run_actor_state.js`

- `playerActor` Runtime 선택 상태
- `runtimeEnemyActors` 배열 상태
- `activeGameActors` → `getActiveActors`
- `editorControlActor` → `getEditorControlActor`
- `syncRunPlayerFromSetupSelection` → `resolvePlayer`
- `rebuildRuntimeEnemyActors` → `rebuildEnemies`
- `createRuntimeEnemyClone`
- `setupSelectedRunActor` → `resolvePlayer`
- `runOrderedActors` → 내부 `orderRunActors`
- `compareEnemyRunOrder`
- `enemyRunOrderPriority`
- `baseGameActors` → `baseActors`
- `defaultRunPlayerActor`
- `actorRenderOrder` → `getRenderActors`

`readSetupSelectedActor()`와 `writeSetupSelectedActor()`는 localStorage와 Editor 선택 상태를 다루므로 `main.js`에 유지했다. 저장된 ID를 Actor로 찾는 작업만 `findBaseActor()`에 위임한다.

## 공개 API

- `createRunActorState` — `main.js`가 한 번 생성하는 State factory
- `baseActors` — trash를 제외한 Preview base Actor 목록
- `findBaseActor` — 저장된 선택 ID 해석
- `resolvePlayer` — 유효한 Player 선택과 fallback
- `getPlayer` — 현재 Runtime Player
- `rebuildEnemies` — Spawn Rule에 맞는 Runtime Enemy clone 재구성
- `clearEnemies` — Run 종료 시 Runtime Enemy roster 초기화
- `getEnemyActors` — Runtime Enemy snapshot
- `getRunActors` — Player → mobs → bosses Battle 목록
- `getActiveActors` — Lifecycle 상태에 따른 Preview/Battle 목록
- `getEditorControlActor` — Preview 선택 Actor fallback
- `getRenderActors` — 기존 Enemy → Player draw 순서

## main.js 변화

833줄

↓

751줄

남은 책임:

- 앱 bootstrap과 Runtime 모듈 연결
- Runtime update와 draw 순서
- Run 시작·종료·사망 sequence
- 생존 시간, 일반 적·Boss 처치와 점수
- 시작·결과·조작법 화면 상태

## Actor Source of Truth

| 책임               | 담당 파일                 |
| ------------------ | ------------------------- |
| Player 선택        | `run_actor_state.js`      |
| Runtime Enemy 배열 | `run_actor_state.js`      |
| Enemy AI·Respawn   | `enemy_runtime_engine.js` |
| Combat·Damage      | `combat_engine.js`        |
| Run Lifecycle      | `main.js`                 |

## 책임 이동 현황

| 기능                      | 이전 담당                 | 현재 담당            |
| ------------------------- | ------------------------- | -------------------- |
| Player 선택               | `main.js`                 | `run_actor_state.js` |
| Runtime Enemy clone       | `main.js`                 | `run_actor_state.js` |
| Actor 최초 생성 수        | `main.js`                 | `run_actor_state.js` |
| Actor 정렬                | `main.js`                 | `run_actor_state.js` |
| Preview/Battle Actor 조회 | `main.js`                 | `run_actor_state.js` |
| Enemy AI                  | `enemy_runtime_engine.js` | 변경 없음            |
| Run Lifecycle             | `main.js`                 | 변경 없음            |

## 실행 순서와 Actor 순서 보존

- Preview Actor: trash를 제외한 base Actor 원본 목록 유지
- Battle Actor: 선택 Player와 Runtime Enemy clone만 사용
- Player: update 목록 첫 번째 유지
- mobs: 정의 순서와 clone 순서를 유지하며 bosses보다 앞에 배치
- bosses: mobs 뒤에 정의 순서대로 배치
- update: State 목록을 기존 Battle update 순서에 전달
- draw: Enemy를 먼저 그리고 Player를 마지막에 그리는 기존 순서 유지
- 사망·결과: 같은 Runtime Actor roster를 유지

## 작성한 테스트

- 파일: `test/run_actor_state.test.js`
- 새 테스트: 6개
- 전체 테스트: 17개

검증 대상:

- 유효한 선택 Player, 잘못된 ID와 Enemy 선택 fallback
- Editor 선택 객체 비변경
- Runtime clone과 원본 객체 분리
- HP, AI cooldown, hit 기록과 Action 상태의 clone별 격리
- Asset reference의 기존 공유 규칙
- Actor별 `maxAlive`, 0개 생성, Actor rule → pool → 기본값
- Player → mobs → bosses 정렬과 정의 순서
- Preview base Actor와 Battle clone 경계
- rebuild 시 이전 hidden, dead, respawn timer와 cooldown 폐기

## Runtime 책임 분포

| 파일                      | 주요 책임 수 | 실제 책임                                                          |
| ------------------------- | -----------: | ------------------------------------------------------------------ |
| `main.js`                 |            4 | Bootstrap/Module Wiring, Runtime Loop, Run Lifecycle, Screen State |
| `run_actor_state.js`      |            4 | Player Selection, Enemy Clone, Actor Ordering, Active Roster       |
| `enemy_runtime_engine.js` |            4 | Enemy Direction/AI, Cooldown, Active Count/Rule, Respawn           |
| `combat_engine.js`        |            4 | Combat Resolve, Damage/Reaction, Region Cache, Combat Timers       |

## 문서 변경

- `docs/99_TASK_REPORT.md` — Task4 결과, State API, Actor 순서와 테스트 기록
- `docs/sprint-dashboard.html` — Task4 완료와 누적 진행률 70% 반영
- `docs/10_SRC_MAP.md` — Run Actor State 등록과 `main.js` 역할 수정
- `docs/src-map.html` — Source inventory, Runtime Flow/그룹, 책임 Audit, 줄 수와 위험도 갱신

## QA 결과

- `npm run check`: 통과 (ESLint, Prettier)
- `git diff --check`: 통과
- `node --test`: 17개 통과, 실패 0개
- HTTP 확인: `index.html`, `setting.html`, `run_actor_state.js` 모두 `200`
- 중복 구현 검색: Runtime Enemy 배열 소유 1곳, `main.js`의 이전 roster helper 0개
- maxAlive Runtime 계산: `enemy_runtime_engine.js` 1곳, State는 API 재사용
- 순환 import: `src` JavaScript 203개 검사, cycle 0개
- 모듈 import: Run Actor State, Enemy Runtime, Combat 통과
- base Actor mutation: State 내부 source 직접 대입 0개, Battle Enemy는 clone만 사용
- SRC Map: 실제 파일 203/203, 누락·오래된 경로·그룹 미등록 없음
- 저장 데이터 변경: 없음
- 브라우저 QA: 현재 세션에 연결 가능한 인앱 브라우저가 없어 미수행

## 발견한 위험 또는 보류 사항

- `main.js`는 751줄이며 Run Lifecycle과 Screen State가 남아 있다. Task5에서 시작·사망·결과·점수 책임만 분리해야 한다.
- Task5에서도 `battleActive`, 사망/결과 상태가 `getActiveActors({ runActive })`에 전달되는 시점을 바꾸면 안 된다.
