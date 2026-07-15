# 99 Task Report

## Runtime 구조 리팩토링 계획안

> 상태: 구현 전 검토 초안
>
> 목적: GPT와 구조·순서·위험을 검토한 뒤 사용자 승인 후 별도 Task로 구현한다.

### 1. 대상과 근거

| 대상                   | 현재 크기 | 현재 책임                                                                  | 문제                                                                                 |
| ---------------------- | --------: | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/main.js`          |     839줄 | 앱 초기화, Runtime loop, Run 상태, Actor 목록, 화면 상태, Editor 연결      | Entry point에 상태와 세부 기능이 계속 누적되어 작은 변경도 넓은 컨텍스트를 요구한다. |
| `src/combat_engine.js` |     893줄 | 적 AI, Actor update, 근접·투사체 전투, Interaction 겹침, damage, 적 리스폰 | 전투 판정과 적 생명주기 및 순수 기하 계산이 한 파일에 섞여 있다.                     |

두 파일 모두 프로젝트의 리팩토링 권장 기준인 800줄을 넘는다. 현재 합계는 1,732줄이며, 수정 시 불필요한 AI 컨텍스트와 토큰 사용량이 커질 가능성이 있다.

### 2. 목표

- 기능과 저장 데이터 형식을 변경하지 않고 책임만 이동한다.
- `main.js`는 앱 bootstrap, update 순서, draw 순서를 조립하는 Entry 역할에 집중한다.
- `combat_engine.js`는 근접·투사체의 공통 전투 규칙과 damage 처리의 Source of Truth로 유지한다.
- 적 AI·리스폰과 Interaction 겹침 계산을 전투 damage 처리에서 분리한다.
- Runtime과 Editor의 역할을 섞지 않는다.
- 각 단계가 독립적으로 검증·커밋·되돌리기 가능하도록 한다.

목표 크기는 절대 기준이 아니지만 `main.js` 450~600줄, `combat_engine.js` 550~700줄을 예상한다.

### 3. 비목표

- 새로운 게임 기능이나 난이도 시스템을 만들지 않는다.
- 전투 수치, 판정 우선순위, AI 확률, 리스폰 시간, 점수 산식을 변경하지 않는다.
- 저장 데이터 schema나 `runtime/project-default-state.json`을 변경하지 않는다.
- 근접 공격과 투사체 공격을 성급하게 하나의 함수로 합치지 않는다.
- 관련 없는 Editor, Asset, Timeline 구조를 리팩토링하지 않는다.
- 파일 수를 줄이거나 줄 수 목표를 맞추기 위한 기계적인 분리는 하지 않는다.

### 4. 먼저 재사용할 기존 공통 시스템

| 기존 시스템                                 | 유지·재사용할 역할                                   |
| ------------------------------------------- | ---------------------------------------------------- |
| `actor_runtime_engine.js`                   | Actor별 physics와 action runtime update              |
| `actor_frame_state.js`                      | frame 시작 snapshot과 paused Actor update            |
| `interaction_region_engine.js`              | 현재 frame의 Attack/Hurt/Collision/Guard Region 계산 |
| `interaction_swept_region_helper.js`        | trace 공격을 위한 이전·현재 Region 연결              |
| `projectile_runtime_engine.js`              | 투사체 pool, 이동, 제거, Attack Region 생성          |
| `enemy_ai_settings_helper.js`               | Enemy AI 설정 normalize와 runtime 설정 해석          |
| `run_hud_view.js`                           | Run 점수 계산과 HUD 표시                             |
| `ranking_controller.js`                     | 결과 화면과 랭킹 흐름                                |
| `input_control_controller.js`               | keyboard/touch 입력 집합 관리                        |
| `camera_view.js`, `canvas_layout_helper.js` | 카메라와 canvas layout                               |

새 Engine은 마지막 선택으로 둔다. 다만 적 AI·리스폰은 기존 공통 모듈 어느 곳에도 안전하게 들어맞지 않는다. `actor_runtime_engine.js`에 넣으면 범용 Actor physics와 Enemy 도메인이 섞이고, `enemy_ai_settings_helper.js`에 넣으면 설정 helper가 mutable runtime을 소유하게 된다. 이 검토가 유지될 경우에만 `enemy_runtime_engine.js` 신설을 허용한다.

### 5. 변경 전 고정할 동작

리팩토링 전후 비교 기준은 다음과 같다.

- Editor와 게임 페이지가 같은 저장 데이터를 정상 로드한다.
- Run 시작, 수동 종료, 재시작 흐름이 같다.
- 플레이어 선택과 Actor 표시 순서가 같다.
- 일반 적의 방향 전환, Action 선택, AI 쿨다운이 같다.
- Actor별 최초 `maxAlive`와 리스폰 위치·시간이 같다.
- Attack/Hurt/Guard/Collision 판정 우선순위가 같다.
- trace 공격, 근접 공격, 투사체 공격 결과가 같다.
- mobs 공격이 bosses에게 damage를 주지 않는 규칙이 같다.
- hit cancel, invincible time, knockback, camera shake가 같다.
- 일반 적·보스 사망, ragdoll, 리스폰이 같다.
- 플레이어 사망, 결과 화면, 점수와 랭킹 집계가 같다.
- 보스 처치 시 HP 회복과 난이도 증가가 다시 생기지 않는다.

### 6. 단계별 구현 계획

#### 0단계: 작업 기준점 격리

현재 작업 트리에는 난이도 기능 제거와 캐릭터 PNG·PSD 변경이 함께 남아 있다.

- 난이도 기능 제거 변경을 먼저 독립된 기준점으로 확정한다.
- 캐릭터 Asset과 PSD 변경은 리팩토링 커밋에서 제외한다.
- PSD를 이동·삭제·이름 변경하지 않는다.
- 각 리팩토링 단계는 한 가지 목적의 별도 커밋으로 만든다.

중단 조건: 현재 기능 변경과 리팩토링 diff를 안전하게 구분할 수 없으면 구현을 시작하지 않는다.

#### 1단계: Characterization Test 추가

외부 의존성을 추가하지 않고 Node 내장 `node:test`와 `node:assert` 사용을 우선 검토한다.

우선 테스트 대상:

- Interaction 사각형·다각형 겹침과 비겹침
- trace 공격의 frame 사이 통과 판정
- Actor별 `maxAlive` 해석
- mobs, bosses, player의 Runtime 정렬
- 일반 적·보스 처치 수 분리와 중복 집계 방지
- Run 상태의 시작·사망·결과·재시작 전환

DOM, Canvas, Firebase가 필요한 흐름은 억지로 단위 테스트하지 않고 로컬 실행 QA 목록으로 유지한다.

완료 조건: 기존 동작을 설명하는 테스트가 먼저 통과하며, 이 단계에는 Runtime 구현 이동이 없다.

#### 2단계: Enemy Runtime 분리

검토 후 신설이 승인되면 `enemy_runtime_engine.js`로 다음 책임을 이동한다.

- NPC가 플레이어를 바라보는 방향 계산
- lock Formula 방향 적용
- Enemy AI Action 후보 선택과 실행
- Enemy AI 쿨다운 update
- 적 그룹화와 활성 수 계산
- 숨김, 리스폰 timer, 리스폰 위치와 Actor 상태 초기화
- Actor별 spawn rule 해석

`combat_engine.js`는 기존 공개 함수를 한 번에 없애지 않는다. 첫 이동에서는 호환 wrapper를 둘 수 있지만, 모든 호출처를 새 모듈로 전환한 같은 단계 안에서 wrapper와 죽은 코드를 제거한다.

주의점:

- 플레이어 `player.update()` 호출 순서를 바꾸지 않는다.
- 전투 timer와 AI timer가 같은 frame에서 갱신되는 순서를 바꾸지 않는다.
- `resetPlayerActionState()`와 HP capacity 초기화 경로를 유지한다.

완료 조건: AI·리스폰 QA가 같고 `combat_engine.js`에 Enemy Flow 중복 구현이 없다.

#### 3단계: Interaction 겹침 계산 분리

새 Engine 대신 작은 순수 함수 모듈 `interaction_overlap_helper.js`를 우선 사용한다.

이동 후보:

- 사각형 overlap
- 볼록 다각형 SAT overlap
- 축 projection
- Attack/Hurt/Guard Region overlap
- trace 공격의 swept overlap

Region frame cache와 `previousAttackRegions` 갱신은 호출 순서 의존성이 크므로 첫 단계에서는 `combat_engine.js`에 유지한다. 이동 후 구조가 더 명확해지는 경우에만 별도 검토한다.

완료 조건: 순수 함수 테스트가 통과하고 Guard·trace·일반 공격 결과가 이전과 같다.

#### 4단계: Run Actor 목록 분리

`main.js`의 Actor 목록과 Runtime clone 책임을 `run_actor_state.js` 또는 더 적합한 기존 state 모듈로 분리한다. 구현 직전 이름과 역할을 다시 검토한다.

이동 후보:

- base Actor 필터
- 기본·선택 플레이어 해석
- Runtime 적 clone 생성과 초기화
- Actor별 최초 생성 수 해석
- mobs → bosses 순서 정렬
- Run 활성 상태에 따른 active Actor 목록

단일 Source of Truth:

- `runtimeEnemyActors`는 새 state 한 곳만 소유한다.
- Editor의 `selectedActor`와 Run의 `playerActor`를 합치지 않는다.
- `PuppetPlayer` 생성과 tuning 적용 방식은 변경하지 않는다.

완료 조건: Actor 수, 순서, identity, 선택 플레이어와 clone 상태가 이전과 같다.

#### 5단계: Run 생명주기 분리

`main.js`의 Run 상태와 전환을 `run_lifecycle_controller.js`로 분리하는 방안을 검토한다. 단순 함수 이동으로 충분하면 Controller를 만들지 않는다.

대상 상태:

- `battleActive`
- `playerDeathPending`
- `resultOpen`
- `deathSequenceTime`
- `runSurvivalTime`
- `runKills`, `bossKills`
- `lastRecordedScore`

대상 전환:

- Run 시작과 종료
- 플레이어 사망 시작과 사망 연출 update
- 결과 화면 전환
- 일반 적·보스 처치 집계
- 최종 Run 결과 반환

Controller를 만들 경우 DOM element를 직접 조회하지 않고 필요한 callback과 기존 view/controller를 주입한다. `main.js`는 update/draw 순서와 앱 조립을 유지한다.

완료 조건: Run 상태가 한 곳에서만 변경되고 기존 점수·사망·결과 흐름이 같다.

#### 6단계: 추가 분리 여부 결정

앞 단계 완료 후 `main.js`가 여전히 600줄 이상이거나 세부 UI 책임이 명확히 남을 때만 다음을 검토한다.

- 화면 배율 binding과 session sync
- 조작법 열기·닫기와 입력 초기화
- 시작·결과 화면 표시 helper

이미 충분히 단순해졌다면 여기서 중단한다. 파일 수를 늘리기 위한 분리는 하지 않는다.

#### 7단계: 문서 및 최종 QA

- `docs/10_SRC_MAP.md`에 실제 파일 책임을 반영한다.
- `docs/src-map.html`의 오래된 파일 크기와 구조 위험 정보를 갱신한다.
- `docs/99_TASK_REPORT.md`를 계획에서 실제 작업 결과로 교체한다.
- Sprint 진행 상황에 영향이 있으므로 `docs/sprint-dashboard.html`을 갱신한다.
- `runtime/project-default-state.json`은 저장 데이터 확인이 필요하지 않으면 읽거나 수정하지 않는다.

### 7. 단계별 검사

각 단계마다 다음을 반복한다.

1. 해당 단계의 단위·characterization test
2. `npm run check`
3. `git diff --check`
4. 제거·이동한 함수의 잔여 참조와 중복 구현 검색
5. 순환 import 확인
6. 개발 서버에서 `index.html`, `setting.html`, 주요 module HTTP 200 확인
7. 가능한 경우 실제 게임과 Editor 화면 QA

한 단계가 실패하면 다음 단계로 진행하지 않고 해당 단계 diff만 되돌릴 수 있어야 한다.

### 8. 예상 파일 변화

| 파일                                | 예상 변화                                                |
| ----------------------------------- | -------------------------------------------------------- |
| `src/main.js`                       | Entry, update, draw, bootstrap 중심으로 축소             |
| `src/combat_engine.js`              | 공통 combat resolve와 damage/reaction 중심으로 축소      |
| `src/enemy_runtime_engine.js`       | 검토 승인 시 Enemy AI·방향·리스폰 Source of Truth로 신설 |
| `src/interaction_overlap_helper.js` | 순수 Interaction overlap 계산으로 신설                   |
| `src/run_actor_state.js`            | 검토 후 Runtime Actor 목록 state로 신설 가능             |
| `src/run_lifecycle_controller.js`   | 단순 이동으로 해결되지 않을 때만 신설 가능               |
| `tests/`                            | Node 내장 test 기반 characterization test 추가 가능      |

파일명은 확정안이 아니다. 구현 직전 `10_SRC_MAP`의 접미사 규칙과 실제 책임을 다시 대조한다.

### 9. 주요 위험과 대응

| 위험                           | 대응                                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| update 호출 순서 변경          | 호출 순서를 characterization하고 이동 전후 diff를 비교한다.             |
| 근접·투사체 사망 callback 중복 | 공통 `applyInteractionDamage()`는 한 곳에 유지한다.                     |
| Region cache 수명 변경         | cache는 frame 단위로 생성하는 기존 위치를 우선 유지한다.                |
| Runtime과 Editor Actor 혼합    | `selectedActor`와 Run player state의 경계를 유지한다.                   |
| 순환 import                    | Entry가 하위 모듈을 조립하고 하위 모듈은 `main.js`를 import하지 않는다. |
| 테스트를 위한 과도한 구조 변경 | 순수 함수와 state transition만 우선 테스트한다.                         |
| 기존 Asset 변경 유실           | 리팩토링 대상 파일만 stage하고 PSD 존재·크기·해시를 별도 확인한다.      |

### 10. GPT 검토 요청 사항

1. `enemy_runtime_engine.js` 신설이 기존 `actor_runtime_engine.js` 확장보다 책임 분리에 적절한가?
2. Interaction overlap을 별도 helper로 두는 범위가 과하거나 부족하지 않은가?
3. Region cache와 이전 Attack Region 갱신을 `combat_engine.js`에 유지하는 결정이 안전한가?
4. Run Actor state와 Run lifecycle을 둘로 나누는 것이 필요한가, 하나로 묶는 편이 단순한가?
5. `run_lifecycle_controller.js` 없이 함수 이동만으로 `main.js`를 충분히 단순화할 수 있는가?
6. 근접·투사체 combat을 계속 같은 Engine에 두는 것이 Source of Truth 원칙에 맞는가?
7. 빠진 회귀 테스트나 중요한 호출 순서가 있는가?
8. 단계 순서가 작은 diff와 안전한 rollback에 적합한가?

### 11. 승인 전 결정할 사항

- 현재 난이도 기능 제거 변경과 Asset 변경을 어떤 기준점으로 격리할지
- Node 내장 test script를 프로젝트에 추가할지
- Enemy Runtime 신설 모듈의 최종 이름과 공개 API
- Run state와 lifecycle의 최종 분리 단위
- 자동 브라우저 QA가 불가능할 경우 필요한 수동 QA 범위

이 문서는 계획 초안이며 아직 Runtime 코드를 변경하지 않았다.

### 12. SRC Map 사전 정비 완료

리팩토링 구현 전에 구조 판단 기준이 되는 문서를 실제 코드와 다시 동기화했다.

- `docs/10_SRC_MAP.md`의 누락 파일 4개와 삭제된 파일 참조 1개를 정리했다.
- `_registry` 접미사와 `formula_registry.js` 역할을 명시했다.
- `main.js`, `combat_engine.js`, Formula Runtime, 배포·모바일 UI의 실제 책임을 반영했다.
- `docs/src-map.html`에 실제 `src` JS 200개 전체 인벤토리를 추가했다.
- HTML 구조 그룹의 실제 파일 등록 결과를 200/200으로 맞췄다.
- 구조 위험 파일 목록에 `combat_engine.js`를 추가하고 하드코딩된 줄 수를 현재 값으로 갱신했다.
- 오래된 Modifier MVP 설명을 Action Formula / Effect legacy Modifier 경계 설명으로 교체했다.
- SRC Map inline script 문법, ESLint, Prettier, `git diff --check`를 통과했다.

이제 리팩토링 구현 시 `10_SRC_MAP`, `11_DATA_MODEL`, `13_ACTION_MODEL`을 우선 기준 문서로 사용할 수 있다.
