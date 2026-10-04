# Crow Knight 구조 감사 — 2026-10-04

## 조사 범위

전체 파일 목록과 텍스트 파일 크기, JavaScript 204개의 상대 import 682개를 조사했다. 기본 지침, 설계·데이터·편집 흐름, 현재/완료 Task 기록과 대표 소스를 대조하고 저장/에셋/배포/랭킹 경로를 실제 코드로 추적했다. 모든 함수의 의미나 게임 밸런스를 전수 검증한 보고서는 아니다.

- 상대 import 누락: 0
- 순환 import 그룹: 0
- 소스맵의 실제 JS 파일명 inventory: 204개
- 원본 PSD: 7개, 기존 경로와 SHA-256 보존
- 기존 Storage 프로젝트 prefix의 객체 128개를 백업했다. 사용 이미지 89개와 이전 이미지들은 Git snapshot이며, 예전 PSD/metadata 복사본은 `runtime/firebase-migration-backup`에 보관한다. 원격 객체는 변경하지 않았다.
- 대형 저장 JSON은 전체 출력하지 않고 필요한 key와 경로를 조회했다.

## 이번에 정리한 책임

- Firebase Storage helper 762줄을 runtime dependency에서 제거했다.
- project storage helper는 Firestore 압축/업로드/다운로드 대신 파일 로드와 저장 queue/flush만 담당한다.
- Project State controller는 세팅의 저장과 베타 이동을 연결한다.
- release panel, Python snapshot, Python Git publisher를 별도 파일로 분리했다.
- 기존 3개 미커밋 문서의 작업 내용을 보존했다. 문서 운영 갱신은 해당 기존 내용 위에 추가했다.

## 우선순위별 분리 후보

| 우선순위 | 파일                                    | 줄 수 | 우려와 분리 방향                                                                                                                                 |
| -------- | --------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | `src/action_trigger_engine.js`          |   812 | Trigger matching, Action 실행, Formula 상태가 한 파일에 있다. 조건 판정과 Formula 실행 경계를 먼저 분리하되 기존 Runtime 회귀 테스트를 유지한다. |
| 1        | `src/editor_asset_controller.js`        |   771 | 캐릭터 생성/이동/삭제/PSD UI와 Effect asset UI를 다룬다. character asset controller와 effect asset controller로 나누는 것이 가장 명확하다.       |
| 2        | `src/actor_runtime_engine.js`           |   760 | actor 물리, Action 전환/보간, Interaction source 계산이 함께 있다. 순수 pose/interaction 계산부터 작은 helper로 분리한다.                        |
| 2        | `src/main.js`                           |   689 | 초기화, frame loop, 화면 전환 연결이 함께 있다. runtime loop와 screen lifecycle 조립을 나누되 초기화 순서에 주의한다.                            |
| 2        | `src/project_data_normalizer_helper.js` |   649 | 여러 schema의 기본값/정규화/migration을 담는다. Action/Effect/Interaction별 normalize 경계를 나누고 저장 호환성 테스트를 먼저 만든다.            |
| 3        | `src/combat_engine.js`                  |   611 | overlap, damage, guard, knockback, reaction을 다룬다. 실제 중복 여부와 source of truth를 확인하고 순수 판정부터 분리한다.                        |
| 3        | `src/editor_panel_controller.js`        |   530 | 공통 Editor 조립 코드가 크다. UI 동작을 추가로 쌓지 않고 기존 하위 controller에 연결한다.                                                        |
| 3        | `src/background_renderer.js`            |   526 | PSD layer, parallax, clip과 이미지 cache 책임을 포함한다. PSD/parallax renderer를 별도 모듈로 분리할 후보이다.                                   |
| 3        | `tools/dev_server.py`                   |   525 | character/effect/PSD API handler를 함께 다룬다. 새 배포 계산은 별도 모듈로 두었으며 이후 asset handler를 분리할 수 있다.                         |

## 토큰 사용량이 큰 파일

- `docs/98_SPRINT_HISTORY.md`: 3,401줄. 날짜·Sprint별 기록으로 나누고 인덱스만 유지하는 후보이다.
- `docs/src-map.html`: 약 3,280줄. CSS, Engine/학습 데이터와 렌더링 코드가 함께 있다. 데이터와 UI 코드 분리가 우선이다.
- `src/settingsPanel.css`: 1,852줄. 패널별 기존 CSS 파일로 역할을 나누되 cascade와 선택자 중복을 확인한다.
- `src/rankingScreens.css`: 711줄, `src/style.css`: 657줄. 화면별 책임과 selector 우선순위를 정리할 후보이다.
- `setting.html`: 635줄. 공통 카드·섹션 markup이 반복되지만 이번 저장 전환과 동시에 대규모 UI 생성 방식 변경은 하지 않는다.
- `data/*.json`: 생성된 대형 데이터다. 파일 전체를 읽지 않고 actor/session/action key별로 조회한다. 포맷 검사와 사람이 읽는 source map에서 분리한다.

## 추가 기술 부채

- `local_character_asset_storage_helper.js`는 이전 character index 읽기 helper이다. 현재 bootstrap은 draft를 정식 원본으로 읽는다. 다른 소비자가 없는지 확인하고 별도 cleanup에서 제거할 수 있다.
- 베타와 공개 게임은 동일한 runtime JS를 공유한다. 데이터·이미지는 완전히 분리되지만 JS 기능 변경의 beta-only release는 아직 지원하지 않는다.
- 배포 snapshot 이미지는 이전 버전 복구를 위해 누적한다. 나중에 Git 이력과 공개/베타 참조를 확인한 별도 정리 작업이 필요하다.
- 기존 공개 랭킹은 브라우저 제출값을 사용한다. 서버 점수 검증은 이번 데이터 이전 범위에서 구현하지 않았다.
- 기존 Firebase 공개 규칙은 게임 제작 데이터에 대한 write도 열어 두었다. 실제 클라우드 rules는 별도 확인·적용이 필요하다.
- 베타 결과 화면은 테스트 기록을 세션 메모리에만 저장한다. 공개 랭킹 및 공개 브라우저 캐시에 섞지 않는다.

## 안전한 다음 순서

1. character/effect asset UI 분리
2. Trigger/Formula 계산 분리와 Runtime 회귀 검증
3. 큰 CSS와 소스맵 데이터 분리
4. 필요할 때 runtime code까지 별도 beta release 지원
5. 공개 랭킹 점수 검증과 권한 보완
