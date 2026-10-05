# 보스 처치 카드 선택과 양쪽 강화 적용 — 2026-10-05

## 완료된 작업

- 보스 한 명 처치마다 10종 중 서로 다른 2종을 균등 무작위로 제시한다. 선택한 효과는 플레이어, 남은 효과는 모든 잡몹/보스에 현재 판 동안 누적한다. 동시에 여러 보스를 처치하면 선택을 순서대로 처리한다.
- 선택 중 전투/생존 시간/실행 타이머를 정지하고 입력을 해제한다. 마우스, 터치 또는 Enter로 선택하면 재개한다. 사망/종료 시 대기 선택과 runtime 효과를 제거하며 새 판에서 횟수를 초기화한다.
- 실제 플레이 화면에 내 강화 / 적 강화 SVG와 ×횟수, 클릭 상세를 연결했다. UI, 누적 상태, 효과 계산과 공격 시간 계산을 별도 모듈로 유지한다.
- 공격 피해/체력은 정수 추가, 이동·범위·밀어내기·점프는 기본값 기준 합산 배율이다. 피해와 밀어내기는 근접/투사체 피해 처리에서 공격자/대상 강화를 반영한다. 근접 범위는 공격 판정만 확장한다.
- 최대 체력은 새로 늘어난 칸만 현재 체력에도 추가한다. 양쪽에 동일 적용하며 죽은 적을 되살리지 않는다. 적 재등장 때 누적 최대 체력을 유지한다.
- 이동/점프 강화는 movement Action의 수식에 적용한다. 점프 속도는 높이 배율의 제곱근을 사용하고 목표 이동의 상승 높이는 높이 배율을 적용한다. 목표 이동은 목적지 가로 거리를 유지하고 시간을 단축한다.
- 피격 경직은 hurt Action, 준비/후딜레이는 실제 공격 판정의 활성 프레임 전/후 구간을 단축한다. 활성 타격 구간은 유지하고 반복 공격도 구간별로 계산한다. 시간과 밀어내기 저항 감소의 하한은 기본값의 20%이며 UI도 -80%에서 멈춘다.
- 제작 tuning / draft / beta / published와 Firestore에는 강화 상태를 저장하지 않는다. 공개 점수 산식은 변경하지 않는다. 코드 변경은 로컬이며 원격 push나 공개 데이터 승격은 수행하지 않았다.

## 검증 결과

- Node 62 + Python 28 = 90개 테스트 통과. ESLint / Prettier 통과.
- 카드 쌍 90개 조합의 중복/범위, 동시 보스 처치 queue, 잘못된/중복 선택, 종료/새 판, 10개 배율과 하한, 실제 피해/저항, 체력/재등장, 범위와 이동, 공격 단계/반복 시간 경계를 회귀 검증했다.
- 임시 복사 snapshot에서 보스 HP와 테스트 공격 범위만 조정하여 실제 베타 공격 → 보스 처치 → 선택 화면을 확인했다. 선택 중 생존 시간이 유지되고 Enter 선택 후 양쪽 횟수 표시와 전투가 재개되었다. 해당 console 오류/경고는 없다. 실제 파일에는 QA 설정을 저장하지 않았다.
- 원본 PSD 9개와 데이터 JSON 4개 해시가 그대로다. JS 상대 import 누락/순환 0.

## 주의사항

- 준비 구간이 없는 공격은 준비 시간 카드로 단축할 구간이 없다. 점프하지 않는 적은 점프 강화가 즉시 드러나지 않는다. 수식/판정이 없는 제작 Action도 해당 강화의 대상 구간이 없다.
- 공격 범위 카드는 판정만 확장하며 원본 캐릭터/무기 이미지를 늘리지 않는다. 점프는 제작 수식과 물리 설정의 영향을 받으므로 실제 체감 수치의 조정이 필요하다.
- 임시 설정의 실제 흐름 확인과 회귀 테스트를 완료했지만 모든 세팅 조합, 모든 모바일 실기기와 장시간 밸런스를 검증한 것은 아니다.

## 리팩토링 권장사항과 다음 작업

새 controller/view/effect/timing 모듈은 각각 150줄 미만이다. main은 681줄, actor runtime은 624줄, Trigger는 599줄로 여전히 검토 기준을 넘으며 작은 변경에도 컨텍스트 비용이 있다. 현재 조립 책임은 유지하고 후속 기능은 별도 controller로 연결한다.

다음에는 실제 기본 세팅으로 카드별 체감/난이도를 플레이하며 초기 수치를 조정한다. 카드 수치의 세팅 편집 지원은 아직 별도 기능이다. Task 보고, dashboard, source map과 구조/Editor 흐름 문서를 갱신했다. 이전 문서의 사용자 수정 내용은 보존한다.

---

# 강화 아이콘 단순화와 카드 이름 개선 — 2026-10-04

## 완료된 작업

- 직접 그린 복합 아이콘을 Lucide SVG 10개로 교체했다. 칼 / 하트 / 발자국 / 양방향 화살표 / 밀기 화살표 / 닻 / 끊어진 연결 / 번개 / 되돌림 / 위쪽 화살표를 사용한다.
- 이름을 예리한 칼날, 강인한 심장, 바람걸음, 길어진 칼끝, 격퇴의 일격, 굳건한 버팀, 끊어진 족쇄, 섬광의 선공, 흐르는 연격, 솟구치는 도약으로 변경했다. 카드 ID와 효과 수치는 유지했다.
- upstream commit을 고정해 로컬 SVG로 저장하고 `assets/icons/upgrades/SOURCES.md`와 `LICENSE-LUCIDE.txt`에 출처와 ISC/해당 Feather MIT 고지를 보관했다. 외부 CDN과 패키지 의존성은 추가하지 않았다.

## 검증 결과

- ESLint / Prettier 통과. SVG 10개 XML 검사와 누적 상태 회귀 테스트 4개 통과.
- 실제 미리보기에서 작은 현황 아이콘과 새 카드 이름을 확인했다. 원본 PSD와 제작 데이터는 변경하지 않았다.

## 주의사항 / 리팩토링 / 다음 작업

효과마다 하나의 상징을 사용했다. 공격 준비와 후딜레이처럼 추상적인 시간 효과는 첫 사용 때 이름/설명을 함께 확인할 수 있도록 기존 클릭 상세 표시를 유지한다. 실제 보스 선택과 전투 효과 연결은 아직 후속 작업이다. 파일은 작은 모듈 구조를 유지하며 추가 리팩토링은 필요 없다. Task 보고와 dashboard를 갱신하고 이전 문서 수정은 보존했다.

---

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

## 2026-10-05 — 수치 체력과 지연 피해 바

- 기본 100 HP / 20 피해. 기존 maxHpPips 저장은 읽을 때 20배 변환하며 새 저장은 maxHp 사용. 원본 JSON은 변경하지 않음.
- HP는 소수 유지. 10 HP 눈금과 0.45초 지연 후 빨간 피해 구간 감소, 연속 피격 표시 유지/재등장 초기화.
- 기존 10개 카드 중 공격력/최대 체력 +10%로 변경. 나머지 8개 효과 유지. 양측 동일 합산 규칙.
- 검증: ESLint/Prettier, Node 66 + Python 28 테스트 통과. beta 실제 눈금 및 dev/health-bars.html 테스트 화면 확인.
- 관련 없는 기존 문서 수정 보존. 공개 배포 미실행.

## 2026-10-05 — 잡몹 조각 회복 하트

- 플레이어가 잡몹을 처치하면 20% 확률로 실제 사망 조각 하나를 하트로 교체. 보스/적이 처치한 대상은 제외.
- 하트는 옆으로 발사되어 착지 후 접근해야 획득. 10 HP 회복, 최대 체력 제한, 10초 만료. 사망자 회복 금지/판 종료 초기화/카드 선택 중 정지.
- 검증: Node 69 + Python 28 테스트, ESLint/Prettier. dev/health-drops.html은 확률을 고정한 조작 테스트이며 실제 게임 확률과 구분 표시.

## 2026-10-05 — 회복 하트 구르기

- 사망 조각의 회전각/회전 속도를 이어받아 비행 중 회전. 바닥 충돌 시 반발 0.24, 수평 감속과 회전 감속 적용.
- 작은 튕김 후 바닥에서 굴러가며 마찰로 정지. 물리 계산을 1/60초 이하로 나눠 느린 프레임에서도 안정화.
- 회복량 10 HP와 20% 확률 유지. 최초 착지 이후 가까이 접근하여 획득.
- 검증: 구르기/정지 회귀 검사 추가, Node 70 + Python 28, ESLint/Prettier 통과. 테스트 화면 회전 확인.

## 2026-10-05 — 경험치 레벨업과 기술 습득

- 플레이어 처치 경험치 구슬: 잡몹 20, 보스 60. 접근 160px부터 흡수, 24px 수집. 첫 필요 XP 40, 이후 레벨마다 +20. 구슬 60초 만료.
- 레벨업마다 무작위 기술 3종 중 선택. 미습득은 해금, 습득 기술은 강화. 기술은 플레이어만 적용/새 판 초기화. 보스 선택 우선 후 기술 선택, 전투 일시정지.
- 기존 세팅의 공격4/공중점프/백플립 액션 활용, E 방어 액션 생성. 없는 액션에는 편집 가능한 임시 액션 준비. 4타 타격 판정이 없으면 최초 준비 시 임시 판정 생성. 원본 PSD/JSON 변경 없음.
- 패링: E 방어 시작 0.15초 이내 공격 시 대상 피해 차단/공격자 경직. 강화 +0.03초. 백플립 회피 0.25초, 강화 +0.05초. 4타 강화 +20% 피해. 공중 점프 착지 전 1회, 강화 높이 +10%.
- 검증: Node 75 + Python 28 테스트, ESLint/Prettier. 경험치/기술 선택 테스트 화면과 실제 베타 로딩 확인. 장시간 밸런스 및 모든 동작의 실전 검증은 미완료.
- main.js는 500줄 검토 기준을 넘으며 경험치/기술은 별도 모듈 유지. 공개 배포 미실행.

## 2026-10-05 — 경험치 구슬 비행과 캐릭터 경험치 바

- 구슬은 처치 위치에서 사망 조각과 함께 튀어나와 바닥에 튕기고 감속. 원거리 자동 흡수 제거, 착지 후 24px 접근 수집.
- 화면 아래 경험치 HUD 대신 플레이어 HP 바 바로 아래 3px 경험치 바와 레벨 표시. 세팅 HP 위치에 함께 이동.
- 검증: 103개 테스트와 ESLint/Prettier, 실제 베타 HUD 확인.

## 2026-10-05 — 경험치/하트 거리별 자석 흡수

- 착지 후 경험치 140px/420px·s, 하트 40px/260px·s 유인. 캐릭터까지 도달하면 지급, 유인 시작 후 범위 밖으로 이동해도 추적.
- 비행 중 유인 방지/사망자 수집 금지/중복 지급 방지. 공통 pickup_magnet_helper 모듈 사용.
- 검증: Node 77 + Python 28, ESLint/Prettier 통과.

## 2026-10-05 — 기술 선택 한 줄/숫자키

- 기술 후보 최대 4종을 한 줄로 표시하고 1~4 배지/숫자키 선택. 좁은 화면은 가로 스크롤. Tab/Enter 및 클릭 유지.
- 반복 키 입력은 추가 선택 방지. 보스 카드 UI는 기존 유지. 검증: 105개 테스트/ESLint/Prettier, 테스트 화면 숫자키 선택 확인.

## 2026-10-05 — Q 충전 강공격 기술

- 응축된 일격 기술 추가. 습득 후 지상 Q: 짧게 누르고 놓으면 기존 기본 공격, 0.25초부터 충전 동작, 1.2초 최대 충전 후 놓으면 최대 3배 피해. 강화당 강공격 피해 +20%.
- 공중 기본 Q 유지. 피격/공중 전환/포커스 이탈/선택 창/판 종료 시 충전 취소. 충전 게이지 링 표시.
- 세팅에 기 모으기/강공격 액션 준비. 기존 포즈 활용과 임시 타격 판정, 직접 애니메이션 수정 가능.
- 검증: Node 79 + Python 28, ESLint/Prettier 통과. 짧은 입력/최대 충전/피격 취소 단위 검사. 실전 밸런스와 애니메이션 조정은 추가 필요.

## 2026-10-05 — 보스 강화 숫자키 선택

- 보스 카드에 1/2 번호와 키보드 선택 추가. 키 반복 입력 방지, 클릭/Tab/Enter 유지.
- 검증: ESLint/Prettier와 기존 107개 테스트.

## 2026-10-05 — 충전 1타 첫 프레임/범위 강화

- Q 유지 중 1타 첫 프레임 포즈 고정, Q 해제 시 1타 기반 강공격. 충전 시간 진행과 애니메이션 시간을 분리.
- 강화당 피해 보너스를 범위/히트박스/이펙트 +20%로 변경. 충전 피해 최대 3배 유지. 세팅 데이터 기본 강공격을 1타에서 최초 한 번 준비, 이후 편집 보존.
- 검증: Node 81 + Python 28, ESLint/Prettier. 충전 포즈 고정/시간 정지/히트박스 배율/피해 배율 검사. 실전 손맛 추가 확인 필요.

## 2026-10-05 — 충전 습득 후 Q/W 입력 차단 수정

- 원인: Q 누름 즉시 충전 액션 실행/모든 입력 Set 비우기/짧은 입력을 해제 때 재전달. 기본 공격과 W를 막음.
- 수정: 처음 Q는 기본 공격으로 즉시 전달, 0.35초 유지 후에만 충전 전환. W 등 다른 동작 입력은 충전 취소 후 그대로 전달. 짧은 Q 해제 때 중복 공격 없음.
- 포즈 고정/시간 정지는 실제 충전 진입 후에만 적용. 포커스 이탈과 선택 창에서 충전 액션 상태까지 정리.
- 검증: Node 82 + Python 28 테스트, ESLint/Prettier. Q 즉시 전달/0.35초 전환/W 취소 전달/해제 중복 방지 회귀 검사. 전체 실전 QA는 별도 필요.

## 2026-10-05 — 충전 전 선행 1타 제거

- Q 누름을 기본 공격에 즉시 넘기던 수정이 선행 1타를 만들었음. 누름은 Q만 보류하고, 짧게 놓으면 기본 공격 1회/0.35초 유지하면 선행 공격 없이 충전/놓으면 강공격으로 분기.
- W 등 다른 입력은 그대로 전달하고 충전을 취소. 취소 후 Q를 놓기 전에는 새 공격을 발동하지 않음.
- 검증: 충전 관련 5개 회귀 검사 통과. 전체 테스트 재실행 대신 수정 입력 경로에 집중.

## 2026-10-05 — 세팅 공격 목록 응축된 일격

- 기존 강공격 액션을 응축된 일격 이름으로 정리하고 공격 그룹 연결. 충전/강공격 runtime 연결 키 유지, 기존 애니메이션 보존.
- 변경 관련 경험치/기술 및 충전 검사 실행.

## 2026-10-05 — 사용자 응축된 일격 애니메이션을 충전으로 연결

- 직접 작성한 응축된 일격 액션을 충전 포즈로 연결. 애니메이션/키프레임 데이터는 보존하며 기존 공격1을 충전 해제 공격으로 사용.
- 첫 프레임 고정 제거, 충전 애니메이션 재생. 충전 중 공격 판정 차단.
- 충전 피해/범위 보너스는 Q 해제로 시작한 공격1에만 적용. 일반 공격1에 보너스가 남지 않도록 액션 시작 때 충전 공격 상태 초기화.
- 관련 충전/기술 검사 10개 실행. 기존 PSD/JSON 직접 수정 없음.

## 2026-10-05 — 특수 충전 액션 명칭과 연결

- 미연결 특수 기 모으기를 응격 - 기모으기로 변경, Q 유지 충전에 연결. 해제는 공격 응축된 일격으로 연결.
- 두 액션의 원본 키프레임/포즈 보존, runtime 연결만 갱신. 관련 검사 10개 통과.

## 2026-10-05 — 응격 공격 액션 이름

- 공격 응축된 일격 액션을 응격 - 공격으로 변경. 기술 카드명과 실행 연결/애니메이션 보존. 관련 충전 검사 5개 통과.

## 2026-10-05 — 게임 진행 기능 공개 배포

- 수치 HP/피해 바, 회복 하트, 경험치 구슬/자석 흡수, 레벨업 기술, 응격 입력/애니메이션 연결, 숫자키 선택을 공개 코드에 반영.
- 최신 beta snapshot을 published로 승격하고 main push 후 Pages revision 확인.
- 배포 전 Node 82개/Python 28개 검사, ESLint/Prettier, diff 공백 검사 통과.
- 별도 Engine Map 문서 변경은 로컬 보존. main.js 730줄/actor_runtime_engine.js 625줄은 추후 기능 단위 분리 검토.

## 2026-10-05 — 기본 전투 효과음

- CC0 remaxim/qubodup Melee, Kenney Impact Sounds, artisticdude RPG Sound Pack 중 6개 파일(약 264 KiB)을 로컬 assets/audio/combat에 저장. 출처/원본명/해시/라이선스 기록. 몽둥이 타격은 둔탁한 타격+나무 소리를 합성.
- 공격 판정 시작에 주인공 몽둥이/잡몹 칼/보스 낮은 휘두르기, 실제 피해에 타격, Guard 판정/기술 방어에 막기/패링. 회피에는 타격음을 내지 않고 동일 판정의 반복 재생 차단.
- Web Audio 클릭/키 입력 해제, 음량/미세 음정 변형, 20 voice 제한/압축기, 음소거 버튼. 편집 미리보기에는 전투음 재생하지 않음. dev/combat-sounds.html에서 종류별 청음 가능.
- 관련 7개 검사/변경 JS 문법 검사/diff 공백 검사 통과. 브라우저 WAV 6개 디코딩 및 청음 버튼 재생 경로 확인. ESLint/Prettier 미실행(사용자 요청). 실제 스피커 음색 평가는 사용자 플레이로 확인 필요.
- main.js 738줄로 검토 기준 초과; 오디오/판정 모듈을 분리해 추가 코드를 최소화. 공개 배포 전 로컬 베타에 적용.

## 2026-10-05 — 게임 OST

- 사용자 제공 꿈에서 본 호랑이 MP3를 원본 그대로 복사, 원본 파일 유지/해시 일치 확인.
- 플레이 시작부터 15% 볼륨 반복 재생, 전투 종료 시 정지. 배경 탭 일시정지/복귀 재개. 효과음과 독립적인 OST 켜기/끄기 버튼 추가.
- 변경 JS 문법 검사, 브라우저 재생/음소거 확인. ESLint/Prettier 미실행, 이 변경에는 추가 자동 테스트 불필요. 로컬 베타 적용, 공개 배포 전.

## 2026-10-05 — 효과음·OST 공개 배포

- 전투 효과음/OST 및 개별 음소거 버튼을 main에 커밋·푸시하고 현재 beta snapshot을 공개 인덱스로 반영.
- 직전 관련 7개 검사와 브라우저 재생/음소거 검증 결과를 사용. ESLint/Prettier 및 불필요한 전체 테스트 미실행.
- 별도 Engine Map 문서 변경은 로컬 보존.

## 2026-10-05 — 질주 Shift 입력

- 주인공 질주를 방향키 두 번에서 Shift 유지/해제 방식으로 변경. 좌우 Shift 지원, 세팅 Trigger 입력/녹화 및 공개·베타 조작 안내 갱신. 현재 draft/beta 설정 반영, 기존 공개 설정은 로딩 시 구형 질주 Trigger만 호환 변환.
- 실제 PuppetPlayer로 Shift 시작/해제 정지 확인. 관련 회귀 13개 통과. ESLint/Prettier 미실행. 공개 커밋/푸시 전.

## 2026-10-05 — Shift 질주 공개 배포

- Shift 유지/해제 질주와 좌우 Shift 입력 지원, 조작법과 README 설명을 공개 코드/설정에 반영하고 커밋·푸시. 직전 실제 액션 검증 및 관련 회귀 결과 사용.

## 2026-10-05 — 경험치 속도/기술 계열 성장

- 필요 경험치 10배: 첫 레벨업 400 XP, 이후 600/800/1000 XP. 구슬 지급량 유지.
- 첫 레벨업 공격/방어/점프/구르기 4계열 선택과 기본 기술 습득. 이후 선택 계열 기술만 습득/강화, 새 판에서 계열 초기화. 공격은 4타/응격, 방어는 패링, 점프는 이단점프, 구르기는 백플립을 사용.
- 현재 방어/점프/구르기 계열은 기존 기술 한 종류만 있으므로 이후에는 해당 기술 강화 1개가 표시됨. 추가 기술은 progression data에 확장 가능.
- 관련 경험치 검사 6개 통과. ESLint/Prettier 미실행. 로컬 베타 적용, 공개 배포 전.

## 2026-10-05 — 계열 색상과 스킬 모션 제작

- 첫 레벨업 4계열 및 후속 카드: 공격 빨강/방어 파랑/점프 초록/구르기 보라 테두리·배경·제목 색상.
- 세팅 Action 탭 스킬 모션 패널: 공격4/응격 충전/응격 공격, 방어·패링, 이단점프, 백플립의 실제 runtime binding을 기존 타임라인 편집기로 연결. 원본 애니메이션 덮어쓰기 없음. 수정은 기존 자동 저장으로 beta 반영.
- 관련 검사 6개/변경 모듈 문법 검사 통과. 브라우저 첫 4카드 및 세팅 제작 버튼 연결 확인. ESLint/Prettier 미실행, 공개 배포 전.

## 2026-10-05 — 기술 계열 성장/모션 제작 공개 배포

- 필요 경험치 10배, 첫 4계열 선택/후속 계열 기술, 카드 색상과 세팅 스킬 모션 제작을 현재 beta snapshot과 함께 공개 반영. 직전 관련 6개 검사와 브라우저 검증 결과 사용, 추가 전체 검사 및 ESLint/Prettier 미실행.

## 2026-10-05 — 게임 화면 글자 선택 차단

- 공개/베타 게임 화면과 스킬·보스 강화 선택창에 user-select 및 WebKit 선택 차단 적용. 랭킹 이름 입력 및 세팅 편집은 유지.
- 브라우저 스킬 카드 제목/선택창의 computed user-select none 확인, 변경 CSS 공백 검사 통과. ESLint/Prettier 및 추가 자동 테스트 미실행. 공개 배포 진행.
- style.css는 672줄로 검토 기준 초과; 기존 모바일 조작 스타일을 추후 분리하면 탐색 비용을 줄일 수 있음. 이번 변경은 CSS 규칙만 추가.

## 2026-10-05 — 보스 강화창 대기와 등장 연출

- 보스 처치 후 0.65초 게임 진행으로 처치 연출 유지, 이후 강화 선택 일시정지. 대기 중 경험치 선택창 중복 표시 방지.
- 배경 페이드/패널 이동·확대/카드 순차 등장, 동작 줄이기 설정 지원. 새 판/중단은 대기 취소.
- 관련 검사 11개 및 변경 JS 문법/공백 검사 통과. 로컬 브라우저 접속 실패로 시각 검증 제한, 공개 파일 확인 예정. ESLint/Prettier 미실행.
- main.js 기존 검토 기준 초과 상태로 1줄 추가에 제한; 런 진행 조정은 추후 별도 모듈 분리 권장.

## 2026-10-05 — 강화 선택 숫자키 포커스 의존 수정

- 스킬/보스 선택창 내부의 keydown만 받던 처리를 공통 window capture 리스너로 변경. 창 밖 포커스에서도 Digit1~4/Numpad1~4 선택, 반복 입력/수정키/숨긴 창 차단.
- 관련 검사 8개 및 변경 JS 문법/공백 검사 통과. ESLint/Prettier 미실행. 공개 배포 진행.

## 2026-10-05 — 적 피해 잔상 노란색

- 잡몹/보스 체력바의 지연 피해 잔상을 노랑(#facc15)으로 변경해 현재 체력과 구분. 주인공 피해 잔상 유지.
- 실제 그리기 함수의 세 그룹 색상/잔상 너비 확인, 문법 검사 통과. ESLint/Prettier 및 불필요한 자동 테스트 추가 없음. 공개 배포 진행.

## 2026-10-05 — 스킬트리 설계 페이지

- docs/skill-tree.html: 실제 SKILL_PATHS/RUN_SKILLS로 네 계열과 다섯 기술 표시. 선행 관계/발동 조건/습득 효과/강화/모션/메모 설계 및 기술 추가. 현재 구현과 추가 계획 구분. 세팅 모션 패널에 진입 링크.
- 설계는 브라우저 localStorage에 저장, JSON 내보내기/불러오기 지원. 게임 설정/런타임에는 자동 적용하지 않으며 기획 선행 관계도 게임 해금 조건과 구분.
- Edge에서 카드 표시/기술 추가/효과·강화·모션 저장/새로고침 유지 확인, 임시 기술 정리. 콘솔 오류 없음, 변경 JS 문법/공백 검사 통과. ESLint/Prettier 및 불필요한 테스트 추가 없음. 공개 배포 진행.
- HTML/CSS/JS 분리로 새 파일은 검토 기준 미만. 설계 메모의 기기 간 이동은 JSON 백업 사용.
