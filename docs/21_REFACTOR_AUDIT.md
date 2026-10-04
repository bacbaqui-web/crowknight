# 리팩토링 반영 결과 — 2026-10-04

점검에서 확인한 원본 PSD 손상, 로컬 API 검사 누락, 세팅 guard 참조, 랭킹 캐시·제출 복구와 서버 상위 조회, 파일 묶음 저장 및 Git 실패 복구를 수정했다. 기능별 분리와 CSS 순서 유지 분리를 완료했다. 검증 결과는 `99_TASK_REPORT.md`에 기록한다.

이하 내용은 **리팩토링 전 점검 당시의 원문**이다. 해당 문제의 재현 기록을 현재 미해결 문제로 해석하지 않는다. 남은 검토 대상은 Firestore 점수 검증과 규칙, 모바일/저성능 QA, 500줄 이상 잔여 모듈 및 3000줄 이상 문서 분리다.

---

# Crow Knight 전체 구조와 위험요소 점검 — 2026-10-04

## 결론과 작업 범위

현재 구조를 유지한다. `setting.html`에서 로컬 제작, `beta.html`에서 로컬 검증, 배포 버튼으로 `index.html`의 공개 데이터를 갱신한다. 이번 작업은 조사와 문서 갱신이며 실행 코드, 데이터, 에셋, 클라우드 규칙이나 배포 설정을 수정하지 않았다.

대규모 파일 분리보다 **PSD 원본 보호 → 저장·배포 실패 처리 → 랭킹 정확성·실패 처리**가 먼저다. 큰 파일을 분리해도 현재의 데이터 손실 경로는 없어지지 않는다.

- 파일 inventory 531개: `src` 214, `tools` 9, `test` 7, `docs` 75, `assets` 118, `release-assets` 84, `data` 4, 루트·기타 20개. `.git`, `node_modules`, `.venv`, Git 제외 `runtime`은 수량에서 제외했다.
- JavaScript 204개, 상대 JS import 682개를 전수 조사했다. 누락 0, 순환 import 0이다.
- HTML의 상대 파일 참조는 별도로 조사했다. **세팅의 보호 스크립트 참조 1개가 누락**되었다.
- 기본 지침, Manifest, Decisions, Architecture, Source Map, Data Model, Editor Flow, Action Model, Roadmap, Future Tasks와 현재·완료 기록을 대조했다.
- 저장·배포·PSD·랭킹·메인 루프와 주요 대형 모듈의 책임을 직접 추적했다. 모든 함수, 게임 밸런스, 모든 편집 UI를 전수 검증한 것은 아니다.
- 대형 JSON은 key·파일 크기만 필요한 범위로 조회했다. 현재 draft/beta/published는 각각 약 2.4 MB이다.
- 로컬 PSD 9개는 조사 전후 경로와 SHA-256이 모두 같다. 실제 PSD에 업로드·삭제·이동 테스트를 수행하지 않았다.

## 현재 파일 구조

| 영역               | 주요 파일                                                                                                                                            | 책임과 연결                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 진입 화면          | `index.html`, `beta.html`, `setting.html`                                                                                                            | 같은 `src/main.js`를 사용한다. body class로 published/beta/editor를 결정한다. |
| 조립과 실행        | `main.js`, `main_dom_helper.js`, `run_lifecycle_controller.js`, `run_actor_state.js`                                                                 | 데이터 로드, Actor 생성, 화면 연결, 입력, frame loop와 Run 상태를 조립한다.   |
| 캐릭터와 행동      | `actor_factory.js`, `actor_runtime_engine.js`, `actor_action_helper.js`, `action_trigger_engine.js`                                                  | 캐릭터 생성, pose/타이밍, 입력 Trigger와 Action 실행을 처리한다.              |
| 전투               | `combat_engine.js`, `interaction_region_engine.js`, `interaction_overlap_helper.js`, `projectile_runtime_engine.js`                                  | Interaction 영역, 공격/방어/피격과 투사체 판정이다.                           |
| 제작 UI            | `editor_panel_controller.js`, `editor_asset_controller.js`, `part_editor_controller.js`, `timeline_*`, `property_*`, `transform_*`, `stage_*`        | Setup/Action/Effect/Stage 조립과 공통 숫자·선택·Timeline·Transform 편집이다.  |
| 데이터와 수식      | `project_data_normalizer_helper.js`, `action_authoring_data.js`, `animation_frame_data.js`, `formula_registry.js`, `formulas/`                       | 저장 호환성, 기본값, Frame 데이터, 16개 Formula 정의와 편집 필드다.           |
| 화면과 연출        | `actor_canvas_renderer.js`, `actor_renderer.js`, `background_renderer.js`, `world_renderer.js`, `*_runtime_helper.js`, CSS 10개                      | Canvas 렌더링, 배경, 후광/색상/흔들림, 패널·랭킹 스타일이다.                  |
| 저장과 배포        | `project_storage_helper.js`, `project_state_controller.js`, `release_panel_controller.js`, `tools/release_snapshot.py`, `tools/release_publisher.py` | draft 저장, 이미지 hash snapshot, beta 검증, 공개 승격과 Git push다.          |
| 로컬 에셋 API      | `tools/dev_server.py`, `export_character_psd_parts.py`, `psd_preview_exporter.py`, `effect_asset_exporter.py`, `asset_refresh_helper.js`             | PSD 업로드/변환과 캐릭터 폴더 생성·복사·이동·삭제다.                          |
| 랭킹과 업데이트    | `firebase_ranking_storage_helper.js`, `ranking_controller.js`, `ranking_view.js`, `deployment_version_controller.js`, `sw.js`                        | 공개 Firestore 기록, 브라우저 cache, 공개 버전 확인이다.                      |
| 원본과 배포 데이터 | `assets/`, `release-assets/`, `data/`                                                                                                                | 제작 원본, 내용 hash가 붙은 파생 이미지, draft/beta/published다.              |
| 개발 운영          | `AGENTS.md`, `docs/`, `test/`, npm/ESLint/Prettier 설정                                                                                              | 지침, 현재·과거 작업, 회귀 테스트와 정적 검사다.                              |

```text
setting → project state → 저장 queue → 로컬 API → draft + frozen beta
beta → 해당 revision 로드 → PLAY → 공개 배포 API
공개 배포 API → revision/이미지 검증 → published + version → Git commit/push
index → published + release-assets → 게임 실행 → Firestore 랭킹
```

## 우선 수정할 위험요소

### P1 — 잘못된 PSD 업로드가 기존 원본을 덮어쓴다

**임시 파일로 재현했다.** `tools/dev_server.py:131`은 배경 업로드를 원래 PSD 경로에 먼저 기록한 뒤 변환한다. 입력이 손상돼 변환이 500으로 실패해도 기존 PSD 내용은 이미 교체되어 있었다. 이펙트도 `:308`, `:334`에서 원본에 먼저 기록한다. 캐릭터는 임시 PSD를 사용하지만 PNG 내보내기는 실제 폴더에 순차 기록하고, 성공 후 원래 PSD를 교체한다(`:206`).

배경은 업로드 이름이 달라도 `.psd`라는 이유로 기본 배경 원본을 선택한다. 업로드 전 백업이나 실패 시 원복이 없다. PSD 원본 보호 지침과 직접 관련되는 문제다.

권장: 업로드·변환을 임시 폴더에서 끝내고, 검증 성공 후 파생 PNG만 교체한다. 원본 교체는 명확한 별도 동작과 복구 가능한 사본을 마련한다. 삭제된 PSD 레이어의 기존 PNG도 exporter가 제거하지 않으므로 이전 파츠가 남을 수 있다.

### P1 — 기존 에셋 API에 동일한 로컬 요청 검사가 없다

**임시 서버로 재현했다.** 프로젝트 저장/배포 API만 client/Host/Origin 검사와 32 MB 한도를 적용한다(`tools/dev_server.py:77-101`). 캐릭터 삭제·이동·업로드와 배경·이펙트 API는 그 검사를 통과하지 않는다.

다른 Origin 헤더가 붙은 캐릭터 삭제 요청도 200이었고, 임시 원본 PSD가 포함된 폴더가 삭제됐다. 기본 bind가 `127.0.0.1`이라는 보호는 있으나 요청 출처를 확인하지 않는다. 실제 다른 웹사이트에서 공격 가능한지는 브라우저의 localhost 접근 정책에도 달리며, 그 공격 자체는 수행하지 않았다. `--host 0.0.0.0`으로 열면 기존 API의 접근 범위가 더 커진다.

권장: 모든 변경 API에 공통 로컬 요청 검사·크기 제한을 적용한다. GET refresh도 파생 파일을 쓰므로 함께 검토한다. 폴더 삭제·이동은 PSD까지 포함하므로 UI 확인만으로 원본 보존 정책을 대신하지 않는다.

### P1 — 브라우저 저장 실패가 공개 랭킹 제출도 막는다

**독립 Node 실행으로 재현했다.** `ranking_view.js:52`의 `localStorage.setItem` 예외를 처리하지 않는다. 저장 용량 초과를 주입하자 제출 함수가 실패했고 Firestore 요청은 0회였다. `:100-104`에서 버튼을 먼저 비활성화한 뒤 await하므로 실패 이후 제출 버튼도 계속 비활성화된다.

또한 Firestore 실패는 helper가 null로 바꾸고 로컬 결과만 남기므로 사용자에게 온라인 제출 실패가 명확히 표시되지 않는다.

권장: 브라우저 cache 실패와 온라인 제출을 독립적으로 처리하고, 온라인 성공/실패를 표시한다. 실패 시 버튼 복구와 중복 제출 방지 정책을 함께 정한다.

### P1 — 현재 랭킹 조회는 전체 상위 100위를 보장하지 않는다

**코드 경로 확인.** `firebase_ranking_storage_helper.js:11`은 `pageSize=100`으로 문서를 읽고 그 응답 내부에서만 점수순 정렬한다. 서버 점수 정렬도 없고 `nextPageToken` 처리도 없다. 기록이 100개를 넘으면 읽지 못한 문서의 더 높은 점수가 랭킹에서 빠질 수 있다.

권장: 서버에서 `score DESC`와 limit으로 조회한다. 동점 순서를 정하고 필요한 인덱스를 확인한다. 실제 101개 문서 생성이나 클라우드 변경은 하지 않았다.

### P2 — 세팅의 보호 스크립트 이름이 잘못 연결돼 있다

**정적 참조 및 실제 HTTP 404 확인.** `setting.html:632`는 존재하지 않는 `src/editor_local_only_guard.js`를 요청한다. 실제 파일은 `src/editor_local_only_helper.js`이다. 별도 module script의 실패가 `main.js` 실행을 자동 중단하지도 않는다.

세팅은 로컬에서 보이지만 기대한 local-only 보호는 실행되지 않는다. HTML 참조 오류는 현재 ESLint·Prettier와 JS import 검사만으로 잡히지 않는다. `.firebaseignore`도 옛 guard 이름이며 현재 GitHub Pages 배포에 적용되는 접근 제어가 아니다.

권장: 실제 파일명과 entry 연결을 통일하고 HTML의 로컬 script/style 참조 검사를 추가한다. 클라이언트 guard는 서버 권한 검사의 대체 수단이 아니다. 공개 세팅·베타 파일을 유지하는 현재 결정은 변경하지 않는다.

### P2 — 배포 실패 후 로컬 published는 이미 바뀔 수 있다

**임시 저장소 데이터와 Git 실패 주입으로 재현했다.** `release_publisher.py:41`이 published/version을 먼저 바꾼 뒤 `git add/commit/push`한다. `git add` 실패 시에도 로컬 published는 새 베타였다. 실제 웹 공개 데이터는 push·Pages 성공 전까지 그대로다.

push 실패 이후 같은 commit 재시도는 기존 테스트가 확인한다. add/commit 실패 뒤 스테이징이 남는 경우에는 재시도가 '다른 staged 변경' 검사에 막힐 수도 있다. 단일 commit만 push하는 것이 아니라 브랜치의 모든 미전송 commit을 함께 push하므로 버튼의 데이터 변경 범위와 원격 전송 범위도 구분해야 한다.

권장: 승격 전 준비·검증, 실패 상태와 복구를 명시하고 본 작업에서 만든 스테이징만 식별한다. 사용자의 다른 변경을 reset하거나 history를 재작성하지 않는다. 베타/공개는 JS를 공유하므로 코드 자체의 beta-only 배포는 지원하지 않는다.

### P2 — draft/beta와 published/version은 파일 묶음으로 원자적이지 않다

**임시 파일로 재현했다.** `release_snapshot.py:144-148`에서 각 파일은 atomic replace이지만 두 파일 전체는 한 transaction이 아니다. beta 쓰기 실패를 주입하자 draft는 HP 3, beta는 HP 2가 됐다. published/version에도 동일한 쓰기 순서가 있다.

또한 `project_storage_helper.js`는 300 ms debounce와 비동기 queue를 사용하고 종료 시 flush/경고가 없다. 변경 직후 탭을 닫으면 마지막 변경이 디스크에 반영되지 않을 수 있다. localStorage backup은 만들어도 로드는 파일만 사용하여 자동 복구 경로가 없다. 이것은 종료 race의 코드상 위험이며 실제 탭 강제 종료 테스트는 하지 않았다.

권장: revision별 준비 파일과 마지막 pointer 전환 또는 명시적 복구 기록을 마련한다. 미저장 상태에서 이탈 경고를 제공한다. 실패한 queue에 대한 재시도·복구 기준을 문서화한다.

## 확인이 더 필요한 위험

- **랭킹 신뢰성:** 클라이언트가 score/kills 등을 계산해서 익명 REST 요청으로 보낸다. 서버 점수 검증은 없다. 문서에 과거 `allow read, write: if true` 예제가 남지만 실제 클라우드 rules의 현재 상태는 확인하지 않았다. 점수 조작 가능 범위, delete/update 권한과 입력 한도는 실제 규칙 점검이 필요하다. API key 공개 자체를 취약점으로 판단한 것은 아니다.
- **입력 해제:** `input_control_controller.js`에는 키보드 blur/visibilitychange에서 keys를 비우는 처리가 없다. keyup을 놓치는 탭 전환에서 이동·방어가 유지될 가능성이 있다. 터치 pointercancel/lostpointercapture 처리는 있다.
- **낮은 FPS:** `main.js:274`는 dt를 0.033초로 자른다. 지속적인 15 FPS에서는 시뮬레이션 시간이 실제 경과 시간의 약 절반이 된다. 배경 탭/느린 기기의 생존 시간과 속도 정책을 정하고 측정해야 한다. 이번에는 실제 저성능 기기 측정을 하지 않았다.
- **초기 에셋 실패:** `main.js:115-118`은 공개에서도 휴지통 포함 모든 정의를 로드하며 `createActors`는 `Promise.all`이다. 불필요한 캐릭터 이미지 한 개가 누락돼도 bootstrap 전체를 중단할 수 있다. 현재 data의 이미지 누락은 확인되지 않았다.
- **원본 에셋 처리:** 캐릭터 삭제는 디스크 폴더 삭제 응답의 boolean을 확인하지 않고 메모리 정의를 제거한다(`editor_asset_controller.js:413`). 폴더 변경과 metadata 저장은 transaction이 아니며 실패 시 복구가 없다. 사용자 확인창은 있지만 원본 PSD의 안전한 보관 경로가 없다.
- **공개 범위:** 현재 root/main 정적 배포는 베타·세팅·제작 데이터·원본 assets도 포함한다. 비공개 관리자 저장소는 아니다. 사용자가 현재 공개 범위를 유지하기로 했으므로 제외 작업을 하지 않았다.
- **누적 용량:** immutable 이미지는 이전 hash 파일을 남긴다. Git 전체 이력 및 이전 공개 버전 복구와 맞춰 정리 정책을 정해야 한다. PSD는 원본 보존 지침 때문에 임의 정리하지 않는다.
- **의존성 재현성:** npm은 lockfile이 있지만 Python은 `Pillow>=12.0`, `psd-tools>=1.17` 하한만 있다. 새 환경 설치 시 PSD 변환 결과가 달라질 수 있어 검증된 버전 기록이 필요하다.

## 리팩토링 우선순위

줄 수만이 아니라 책임과 회귀 위험을 기준으로 정렬했다. 아래 분리는 이번에 수행하지 않았다.

| 순서 | 파일                                                            |     줄 수 | 분리 방향과 선행 검증                                                                                                                      |
| ---- | --------------------------------------------------------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `tools/dev_server.py`                                           |       525 | 공통 요청 검사, PSD/character/effect handler 분리. 원본 보존과 실패 복구 검증부터 한다.                                                    |
| 2    | `src/editor_asset_controller.js`                                |       771 | character/effect 편집 분리. 파일 작업과 metadata commit 경계를 정하고 실패 시 원복을 검증한다.                                             |
| 3    | `src/action_trigger_engine.js`                                  |       812 | 입력 history/Trigger 판정, 실행 조건, Formula 이동 실행을 나눈다. 연계·중단·cooldown 회귀 검증이 먼저다.                                   |
| 4    | `src/actor_runtime_engine.js`                                   |       760 | pose/interaction 보간부터 순수 helper로 분리한다. Player class의 상태 관리 경계는 유지한다.                                                |
| 5    | `src/project_data_normalizer_helper.js`                         |       649 | Action/Effect/Interaction normalize를 분리한다. 과거 데이터 → 현재 데이터 fixture와 저장 왕복 검증이 필요하다.                             |
| 6    | `src/main.js`                                                   |       689 | 공통 game bootstrap, editor bootstrap, Run screen lifecycle, frame loop를 분리한다. 공개에서도 editor module graph를 읽는 의존성을 줄인다. |
| 7    | `src/combat_engine.js`                                          |       611 | overlap source, damage/guard/reaction 적용을 분리한다. 현재 SAT 테스트는 전체 damage/guard 규칙을 검증하지 않는다.                         |
| 8    | `src/editor_panel_controller.js` / `src/background_renderer.js` | 530 / 526 | 하위 controller 조립 / PSD·parallax·cache 책임을 더 구분한다.                                                                              |

좋은 경계도 있다. `run_lifecycle_controller`, `run_actor_state`, SAT helper, Timeline 공통 필드와 배포 snapshot/publisher는 이미 역할이 나뉘어 있다. 기존 모듈을 무시하고 전부 다시 설계할 필요는 없다.

### 큰 CSS·문서와 토큰 사용량

- `src/settingsPanel.css`: 1,852줄. 강한 분리 경고 대상이다. 패널별 CSS로 옮기되 cascade와 중복 selector를 확인한다.
- `src/rankingScreens.css`: 711줄, `src/style.css`: 657줄. 화면별 역할과 우선순위를 정리한다.
- `setting.html`: 635줄. 카드·섹션 반복이 있으나 UI 재작성은 에셋 안전성 수정과 분리한다.
- `docs/98_SPRINT_HISTORY.md`: 3,401줄. 기존 completed-sprints 방식으로 기록별 파일과 짧은 인덱스를 검토한다.
- `docs/src-map.html`: 3,277줄. 화면 CSS, 학습 데이터와 렌더링 코드를 분리하면 작은 변경의 AI context 비용이 줄어든다. 현재 사용자의 미커밋 변경을 보존했다.
- `data/*.json`: 생성된 2.4 MB 데이터는 작은 key만 조회한다. 줄 수를 줄이려고 minify한 데이터를 설계 문서 대신 읽지 않는다.

### 남은 경계와 미사용 후보

- `game_config_data.js`는 55개 모듈이 import한다. 현재 122줄이므로 크기만으로 나눌 대상은 아니지만 상수 하나를 바꿀 때 영향 범위를 확인해야 한다.
- Runtime/normalizer가 `interaction_object_editor_controller.js`라는 파일에서 상수와 순수 helper를 가져온다. 실제 내용은 DOM controller가 아닌 데이터 모델에 가까워 이름이 책임을 오해하게 한다. 먼저 naming/source-map을 맞추는 작은 작업이 적절하다.
- Formula registry는 normalize/default와 editor field 정의를 같은 객체로 묶는다. 공개 runtime도 편집 코드 import graph에 연결된다. Runtime metadata와 editor renderer를 나눌 후보이다.
- `main.js`에서 도달하지 않는 JS 10개: `editor_local_only_helper`, `local_api_helper`, `local_character_asset_storage_helper`, `modifier_editor_engine`, `pose_action_authoring_controller`, `pose_action_authoring_helper`, `property_scrub_helper`, `timeline_pose_adapter`, `timeline_pose_controller`, `timeline_pose_panel_view`.
- 이 10개가 모두 삭제 대상이라는 뜻은 아니다. 보호 helper는 HTML 연결 오류이며, 남은 모듈은 과거 흐름·직접 entry·QA 의도를 확인한 다음 정리해야 한다. 정적 import 외 dynamic JS import는 src에서 발견되지 않았다.

## 검증과 검사 범위

- `npm run check`: ESLint / Prettier 통과.
- `npm test`: Node 31개 + Python 12개 = 43개 통과.
- Python tool 9개의 AST 문법 검사 통과. JS import 682개 누락/순환 없음.
- HTML 상대 참조는 보호 스크립트 1개 누락. 실제 로컬 HTTP 404와 일치한다.
- 로컬 세팅 기본 화면 로딩, 베타 PLAY 준비 상태와 초기 비활성 배포 버튼을 실제 브라우저에서 확인했다. 이번에는 설정 변경·게임 플레이·공개 배포·랭킹 제출을 수행하지 않았다.
- 임시 root/임시 서버/실패 mock으로 PSD 손상 업로드, 다른 Origin 삭제, Git 실패 후 local published 변경, 파일 묶음 저장 실패, ranking localStorage 실패를 재현했다. 실제 프로젝트 데이터는 재현 대상으로 사용하지 않았다.
- PSD 9개의 SHA-256 보존. 기존 Storage 128개 백업 및 원격 원본 보존 상태는 이전 이전 작업의 기록이며, 이번에 원격 전수 재검증하지 않았다.
- 현재 테스트는 Run lifecycle, enemy flow, Actor clone, SAT, release 저장·승격 중심이다. Trigger/Formula 연계, PSD handler 실패 복구, editor 변경 왕복, 온라인 랭킹 오류, HTML entry 참조 검증은 충분하지 않다.
- 실제 클라우드 rules, 저성능·모바일 기기 QA와 모든 편집 UI 조합은 미검증이다.

## 문서 운영 위험

- `AGENTS.md`와 `20_IMPLEMENTATION_RULES.md`는 Codex 앱 개발을 막는 옛 GPT 전달 절차를 요구하지 않는다. 대규모 리팩토링 제한과 원본 PSD 보존은 현재 작업에도 유효하다.
- Roadmap의 Save가 아직 '대기'이며 `97_FUTURE_TASKS.md`에는 현재 Formula/공통 편집 코드와 중복될 수 있는 과거 TODO가 남아 있다. 실제 완료·미완료를 확인해 갱신해야 한다. 이번 audit만으로 TODO를 임의 완료 처리하지 않았다.
- 현재 Task 문서는 과거 Task 원문까지 여러 개 포함하고 있다. 향후 완료 기록으로 이동하고 현재 요약만 남길 후보다. 기존 미커밋 내용을 삭제하거나 재정리하지 않았다.

## 안전한 다음 작업 순서

1. PSD 원본 보호와 모든 에셋 API의 공통 요청 검사, 손상 입력·부분 실패 재현 테스트.
2. 세팅의 누락 entry 참조와 HTML 정적 경로 검사.
3. 랭킹 cache 실패 분리, 온라인 성공 표시와 서버 점수순 조회. 실제 rules는 별도 read-only 확인 후 변경 범위를 정한다.
4. 저장·승격·Git 실패 상태 복구와 마지막 미저장 변경의 보호.
5. character/effect controller 분리 및 Trigger/Formula 회귀 검증 후 엔진 분리.
6. CSS·소스맵·Sprint 기록 정리, 필요할 때 editor/runtime entry 분리.
