# 강화 SVG 아이콘과 누적 현황 UI — 2026-10-04

## 완료된 작업

- 카드 10종을 24×24 viewBox, 공통 선 굵기의 개별 SVG로 직접 제작했다. 파일은 `assets/icons/upgrades/`에 저장했다. 생성형 이미지 대신 repo-native 벡터를 사용했다.
- `upgrade_hud_view.js`는 내 강화 / 적 강화를 두 줄로 분리하고 획득한 아이콘에 ×횟수를 표시한다. 버튼 클릭과 키보드로 효과 이름·횟수·누적 수치를 확인할 수 있다.
- `run_upgrade_state.js`는 선택한 카드의 플레이어 누적과 선택하지 않은 카드의 적 누적, 새 판 reset, 외부 수정으로부터 snapshot 보호를 담당한다. 이 상태는 전투 효과를 적용하는 코드가 아니다.
- `dev/upgrade-icons.html`은 10개 아이콘 목록과 누적 표시/선택/초기화를 조작할 수 있는 로컬 미리보기다. 예시 횟수임을 화면에 명시했다.

## 검증 결과

- Node 52 + Python 28 = 80개 테스트 통과. ESLint / Prettier 통과, SVG 10개 XML 검사 통과.
- 실제 브라우저에서 공격력 선택 → 내 공격력 증가 / 적 이동 속도 증가, 아이콘 클릭 → 누적 설명 표시를 확인했다. 원본 PSD와 제작 설정은 수정하지 않았다.

## 주의사항과 다음 작업

이번 범위는 SVG와 현황 UI 및 누적 상태다. 실제 index/beta 플레이 화면, 보스 처치 후 카드 선택과 전투 수치 적용에는 아직 연결하지 않았다. 표기한 공격력 +1 등 수치는 카드 후보의 초기값이다. 후속 연결 시 시간 감소/밀어내기 저항의 하한, 등장 중/재등장 적의 동일 적용, 새 판 초기화와 랭킹 점수 정책을 함께 검증한다.

추가한 JS는 각각 100줄 미만이며 큰 파일 분리는 필요하지 않다. 기존 대형 main과 문서 이력은 여전히 컨텍스트 비용을 늘리므로 후속 기능은 독립 controller로 연결한다. 현재 Task 보고와 dashboard를 갱신하고 이전 기록/사용자 수정 내용을 보존했다.

---

# 안정성 보강과 기능별 리팩토링 — 2026-10-04

## 상태

완료. 로컬 세팅 → 베타 검증 → 공개 인덱스 배포와 Git 에셋 / Firestore 공개 랭킹 구조를 유지했다. 제작 설정과 공개 데이터를 승격하거나 공개 사이트를 배포하지 않았다.

## 완료된 작업

- 에셋 조작 UI, Action 이동 수식, Actor 자세, Combat 충돌·반응, 데이터 정규화를 기능별 모듈로 분리했다. Editor 이름을 가진 공통 Interaction 모델은 독립 data 모듈로 옮기고 기존 import 호환 entry를 남겼다.
- 로컬 서버에서 배경·캐릭터·이펙트 API를 분리하고 모든 API에 loopback / Origin / 요청 용량 검사를 적용했다. 세팅의 누락된 보호 스크립트 참조를 수정하고 보호 검사 이후 Editor를 로드한다.
- 업로드 원본은 `runtime/asset-sources`에 별도로 보관한다. 임시 폴더 변환 성공 후 파생 파일만 교체하며 원본 PSD는 유지한다. 캐릭터 이동은 복사, 삭제는 목록 제외로 처리한다. 원본 PSD를 직접 수정하면 다음 refresh는 수정한 원본을 사용한다.
- JSON 묶음 저장과 Git 배포에 복구 journal을 도입했다. 변환·파일 저장·Git commit 실패는 이전 상태를 복원하며 push 실패는 이미 생성한 commit으로 재시도한다. 서버 재시작 시 중단된 저장을 복구한다.
- 세팅 저장 queue를 분리하고 실패 재시도, 저장 중 추가 변경 처리와 미저장 종료 경고를 추가했다. PSD에서 없어진 파츠는 편집·snapshot에서 이전 이미지로 되돌아가지 않는다.
- 빈 랭킹 안내에 목록 항목 grid 스타일이 적용되는 CSS 충돌을 수정했다.
- 랭킹을 서버 점수순 상위 100개로 조회한다. 브라우저 캐시 실패가 온라인 제출을 막지 않고 제출 실패 시 중복 로컬 기록 없이 재시도할 수 있다. 포커스 상실 시 입력 키를 해제한다.
- 공개·베타는 Editor 패널을 지연 로드에서 제외했다. 설정 CSS를 기존 순서 그대로 세 파일로 분리했다.

## 검증 결과

- ESLint / Prettier 통과. Node 48 + Python 28 = 테스트 76개 통과.
- 이전 구현에서 생성한 정규화 fixture 3개의 해시가 동일하다. 저장 실패·동시 수정·중단 복구·Git 실패·원본 보호·상위 랭킹·입력 해제 회귀를 확인했다.
- 실제 배경/캐릭터 PSD의 임시 복사본을 새 API로 변환했다. 실제 원본 PSD 9개와 draft/beta/published/storage-migration JSON 4개의 SHA-256은 작업 전과 같다.
- 브라우저에서 세팅 Setup/Action 패널과 베타 플레이 → 사망 → 결과 화면을 확인했다. 해당 화면 console 오류/경고는 없다. 공개 랭킹 읽기 전용 Firestore 조회 HTTP 200을 확인했으며 기록은 제출하지 않았다.
- JS 상대 import 누락·순환 0, HTML/CSS 참조 검사와 Python AST 문법 검사 통과.

## 파일 크기와 남은 위험

| 파일                              | 이전 → 이후 줄 수 | 변경                            |
| --------------------------------- | ----------------- | ------------------------------- |
| editor_asset_controller.js        | 771 → 48          | UI / 캐릭터 / 이펙트 분리       |
| project_data_normalizer_helper.js | 649 → 119         | schema별 정규화 분리            |
| combat_engine.js                  | 611 → 275         | 충돌 / 반응 / cache / rule 분리 |
| tools/dev_server.py               | 525 → 237         | API별 모듈 분리                 |
| action_trigger_engine.js          | 812 → 596         | 이동 수식 분리                  |
| actor_runtime_engine.js           | 760 → 623         | 자세 계산 분리                  |
| settingsPanel.css                 | 1852 → 4          | 기존 순서 유지하는 import entry |

`main.js` 659줄, Actor 623줄, Trigger 596줄과 CSS 분리 파일 중 713/737줄은 여전히 검토 대상이다. Sprint 기록과 소스맵 HTML은 3000줄 이상이며 작은 수정에도 컨텍스트 비용이 크다. 후속 작업에서 문서 이력과 화면 데이터를 별도 파일로 분리하는 것이 좋다.

Firestore 규칙과 점수 위변조 방지, 모바일/저성능 기기와 모든 편집 조합은 이번 검증 범위 밖이다. 런타임 코드는 세 화면이 공유하므로 데이터 승격만으로 코드 배포를 분리할 수 없다. 이번 검증은 로컬 기준이며 공개 반영은 별도 배포가 필요하다.

## 다음 작업

새 기능 개발을 진행할 수 있다. 해당 기능과 직접 관련된 잔여 대형 모듈만 추가로 분리하고, 이후 공개 랭킹 검증 경계와 문서 이력 분리를 검토한다. 기존 미커밋 문서와 점검 기록은 아래에 보존한다.

---

## 이전 작업 보고 — 전체 점검 원문 보존

# 전체 구조와 위험요소 점검 — 2026-10-04

## 상태

완료. 현재 로컬 세팅·베타와 공개 인덱스 구조를 유지한다. 이번 작업은 점검과 문서 갱신이며 실행 코드·데이터·에셋을 변경하거나 배포하지 않았다.

## 완료된 점검

- 전체 inventory 531개, JavaScript 204개 / 상대 JS import 682개를 조사했다. 누락·순환 import는 없다.
- HTML 경로는 별도 확인했으며 세팅의 `editor_local_only_guard.js` 참조가 실제 파일명과 달라 404임을 확인했다.
- 구조, 저장·승격·Git push, PSD 처리, 랭킹, 입력·frame loop와 현재/과거 개발 문서를 대조했다.
- 전체 결과와 근거, 재현 여부, 수정 순서를 `21_REFACTOR_AUDIT.md`에 갱신했다.
- `AGENTS.md`와 구현 규칙에 옛 GPT → VS Code 전달 절차는 강제되지 않는다. 원본 PSD 보호 및 대규모 리팩토링 제한은 유효하다.

## 검증 결과

- ESLint / Prettier 통과. Node 31 + Python 12 = 테스트 43개 통과.
- Python 도구 9개 AST 문법 검사 통과. HTML에서 script 참조 누락 1개 발견.
- 실제 브라우저에서 세팅 초기 화면, 베타 PLAY 준비 상태와 배포 버튼 초기 비활성 상태 확인.
- 임시 폴더·임시 서버와 mock만 사용해 손상 PSD 업로드의 원본 교체, 외부 Origin 헤더 삭제 수락, Git 실패 후 로컬 published 변경, draft/beta 부분 저장, ranking cache 실패를 재현했다.
- 실제 PSD 9개의 경로와 SHA-256 보존. 실제 설정 변경·게임 기록 제출·공개 배포는 수행하지 않았다.

## 우선 위험

1. 배경·이펙트 PSD를 검증 전에 원본에 기록하여 변환 실패해도 원본이 바뀔 수 있다.
2. 프로젝트 저장/배포 외 기존 에셋 API에는 동일한 로컬 요청 검사·용량 제한이 없다.
3. ranking localStorage 실패가 온라인 제출까지 막고 제출 버튼이 복구되지 않는다.
4. 서버 점수 정렬/페이지 처리가 없어 전체 상위 100위가 보장되지 않는다.
5. 저장·승격은 파일 묶음으로 원자적이지 않고 Git 실패 후 로컬 published가 먼저 바뀔 수 있다.

## 리팩토링과 다음 순서

원본 보호 / API 검사 → 세팅 entry 참조 → 랭킹 정확성·실패 처리 → 저장·배포 복구 → character/effect UI 및 Trigger/Formula 분리 순서가 안전하다. 대형 CSS 1,852줄, Sprint 기록 3,401줄, 소스맵 HTML 3,277줄은 토큰 사용량을 늘리므로 이후 분리 후보이다.

클라우드 rules, 저성능·모바일 기기, 모든 편집 UI 조합과 모든 함수는 전수 검증하지 않았다. 현재 테스트 통과만으로 이번 위험이 해소됐다고 판단하지 않는다. 기존 미커밋 문서 내용은 아래에 보존한다.

---

## 이전 작업 보고 — Storage 전환 원문 보존

# Storage 제거와 세팅 / 베타 / 공개 배포 — 2026-10-04

## 상태

완료. 아래 이전 작업 원문은 기존 미커밋 내용을 보존한다.

## 변경

- 기존 공개 Firebase metadata와 Storage 이미지 참조 89개를 Git 관리 snapshot으로 이전했다.
- Storage 프로젝트 prefix의 전체 객체 128개(31,997,942 bytes)를 백업했다. 예전 PSD/metadata 복사본은 Git 제외된 `runtime/firebase-migration-backup`에 보존했다.
- `setting.html` → `data/draft.json`, `beta.html` → `data/beta.json`, `index.html` → `data/published.json`으로 데이터 source를 분리했다.
- 이미지도 내용 hash snapshot으로 분리했다. 세팅·PSD 갱신은 공개 snapshot을 변경하지 않는다.
- 로컬 세팅 저장은 debounce/queue/flush하며, 저장 오류를 표시한다.
- 베타 플레이 후 배포 버튼은 현재 revision을 확인하고 snapshot만 Git commit/push한다. 실제 Pages 반영과 push 성공을 구분한다.
- Firebase Storage runtime helper와 Firestore project metadata 코드를 제거했다. 공개 랭킹만 Firestore를 사용한다.
- 베타/세팅의 기록은 공개 랭킹과 브라우저 캐시에 섞이지 않는다.
- GPT와 VS Code Codex 사이의 수동 전달 workflow를 Codex 앱 단일 작업 흐름으로 갱신했다.
- 전체 파일 규모와 import graph를 조사하고 `21_REFACTOR_AUDIT.md`에 단계별 분리 후보를 기록했다.

## 검증

- Node 테스트 31개(기존 25 + 신규 6)와 Python release 테스트 12개, 총 43개 통과.
- immutable image, stale revision 차단, 손상된 snapshot 차단, 실패 저장 보존, temp Git remote push/retry와 다른 작업 보존을 확인했다.
- 실제 브라우저에서 세팅 변경 → beta 저장, published 불변, 베타 플레이와 배포 버튼 활성화를 확인했다.
- 원본 PSD 7개의 SHA-256과 경로가 작업 전과 같다.
- ESLint / Prettier, Python syntax, JS import 경로와 `git diff --check` 통과.
- 브라우저에서 미커밋 runtime code의 배포 차단, 로컬 호스트/Origin 제한, 베타의 외부 Firebase 호출 없음과 공개 화면 로딩을 확인했다.
- GitHub Pages가 `f04197e`를 배포한 상태를 확인했다. 공개 게임 실행과 이미지 71개의 실제 응답 SHA-256 일치를 검증했다.
- 베타 테스트 중 공개 설정 파일은 바뀌지 않았다. 새 베타 설정은 사용자가 배포 버튼을 누르기 전까지 공개에 적용하지 않는다.
- 기존 원격 Git에 있던 PSD 2개도 원래 경로와 동일한 바이트로 복원하여 보존했다.

## 제한

- 베타/공개는 runtime code를 공유한다. 데이터·이미지 승격을 구현했으며 코드 자체의 beta-only release는 별도 개선이다.
- 기존 Storage 파일과 Firestore projectSettings 원본은 원격에서 삭제하지 않았다.
- 배포에는 기존 `origin/main` push 권한이 필요하다. 다른 staged 변경, 미커밋 game code가 있으면 배포를 막는다.

---

## 이전 작업 보고 — 원문 보존

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
