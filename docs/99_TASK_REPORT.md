# CURRENT TASK REPORT

## 1. Sprint 정보

- Sprint 이름
  - Action Interaction & Modifiers Sprint

- 최종 목표
  - Crow Knight의 Action 제작 흐름을 하드코딩된 Action 추가 방식에서 `Timeline + Interaction + Modifiers + Runtime Rule` 데이터 조립 방식으로 전환한다.
  - Runtime은 Action 이름을 특별 처리하지 않고 Editor에서 만든 Action 데이터를 해석해 실행한다.

---

## 2. 직전 완료 Task 보고

- Task 이름
  - Task Report 파일명 변경

- Task 목표
  - 기존 `docs/99_CURRENT_SPRINT.md` 파일명을 문서 역할에 맞게 `docs/99_TASK_REPORT.md`로 변경한다.
  - 문서, 대시보드, 히스토리, 개발 규칙에 남아 있는 이전 파일명 참조를 새 파일명으로 정리한다.
  - 다음 작업부터 Task Report 갱신 대상이 `docs/99_TASK_REPORT.md`임을 명확히 한다.

- 완료 내용
  - `docs/99_CURRENT_SPRINT.md`를 `docs/99_TASK_REPORT.md`로 이동했다.
  - `AGENTS.md`, `docs/00_MANIFEST.md`, `docs/98_SPRINT_HISTORY.md`, `docs/src-map.html`, `docs/completed-sprints/README.md`, `docs/sprint-dashboard.html`의 참조를 새 파일명으로 바꿨다.
  - `docs/src-map.html`의 문서 링크가 `./99_TASK_REPORT.md`를 가리키도록 갱신했다.
  - 이번 파일명 변경 내역을 `docs/98_SPRINT_HISTORY.md`에 시간 기록과 함께 추가했다.

- 완료된 QA
  - `npx prettier --write docs/99_TASK_REPORT.md docs/98_SPRINT_HISTORY.md docs/sprint-dashboard.html docs/src-map.html docs/00_MANIFEST.md docs/completed-sprints/README.md AGENTS.md` 완료.
  - `npm run check` 통과.
  - `git diff --check` 통과.
  - `test -f docs/99_TASK_REPORT.md`로 새 파일 존재 확인.
  - `test ! -f docs/99_CURRENT_SPRINT.md`로 이전 파일 제거 확인.
  - AGENTS / Manifest / SRC Map / completed-sprints README의 운영 참조가 `99_TASK_REPORT.md`로 바뀐 것 확인.
  - `http://127.0.0.1:4176/docs/sprint-dashboard.html` 200 OK 확인.

---

## 3. 해야 할 QA

### Editor QA

- [ ] `http://127.0.0.1:4176/docs/sprint-dashboard.html`을 열고 대시보드가 정상 표시되는지 확인한다.
- [ ] `docs/src-map.html`을 열고 Task Report 링크가 `99_TASK_REPORT.md`로 이동하는지 확인한다.

### Runtime QA

- [ ] 해당 없음.

### Save / Load QA

- [ ] 해당 없음.

### Regression QA

- [ ] `docs/99_TASK_REPORT.md`가 1번부터 5번까지의 고정 섹션 형식을 유지하는지 확인한다.
- [ ] `docs/98_SPRINT_HISTORY.md`에 이번 파일명 변경 기록이 시간순으로 남아 있는지 확인한다.
- [ ] 앞으로 Task Report 갱신 대상 파일명이 `docs/99_TASK_REPORT.md`로 안내되는지 확인한다.

### Migration QA

- [ ] 오래된 `docs/99_CURRENT_SPRINT.md` 링크를 열었을 때 더 이상 작업 기준 문서로 사용하지 않는다는 점을 확인한다.

### 완료 안 된 QA

- [ ] 대시보드의 `해야 할 QA` 항목 왼쪽에 체크박스가 보이는지 확인한다.
- [ ] QA 체크박스를 클릭했을 때 항목이 체크 완료 상태로 바뀌고, 다시 클릭하면 체크가 해제되는지 확인한다.
- [ ] 체크한 뒤 페이지를 새로고침해도 같은 브라우저에서 체크 상태가 유지되는지 확인한다.
- [ ] QA 문구가 `어디에서`, `무엇을`, `어떤 기준으로` 확인해야 하는지 이해할 수 있을 만큼 구체적인지 확인한다.
- [ ] `99_TASK_REPORT.md`가 새 고정 형식 1~5번 섹션을 유지하는지 확인한다.
- [ ] `98_SPRINT_HISTORY.md`에 누적 기록이 남아 있는지 확인한다.
- [ ] 다음 Task Report를 쓸 때 체크 완료된 QA는 제거하고, 체크되지 않은 QA는 `완료 안 된 QA`로 이월한다는 규칙이 문서에 남아 있는지 확인한다.
- [ ] Setup 화면에서 그룹 드롭다운이 `주인공 / 잡몹 / 보스`로 보이는지 확인한다.
- [ ] Setup 화면에서 그룹을 바꿨을 때 뒤쪽 캐릭터 드롭다운이 해당 그룹 캐릭터만 보여주는지 확인한다.
- [ ] Setup 화면의 `...` 메뉴에서 `새 캐릭터 추가`를 눌렀을 때 영어명 / 한글명 / 폴더 / PSD 선택 모달이 열리는지 확인한다.
- [ ] 새 캐릭터를 만든 뒤 로컬 `assets/characters/{group}/{englishName}` 폴더와 metadata가 생성되는지 확인한다.
- [ ] `player` 캐릭터 삭제가 막히고, 다른 캐릭터 삭제는 휴지통으로 이동하는지 확인한다.
- [ ] 휴지통에서 완전삭제를 실행했을 때 trash 폴더와 metadata가 정리되는지 확인한다.
- [ ] 휴지통으로 보낸 캐릭터가 Canvas나 전투 Runtime actor로 남지 않는지 확인한다.
- [ ] 새 캐릭터 생성 / 휴지통 이동 후 새로고침해도 metadata 상태가 유지되는지 확인한다.
- [ ] Firebase metadata 업로드 / 다운로드 후 캐릭터 그룹과 휴지통 상태가 유지되는지 확인한다.

---

## 4. 다음 작업 후보

1. Setup 캐릭터 휴지통 복구 버튼 추가 여부 결정.
2. Firebase Storage PNG까지 그룹 / 휴지통 경로로 이동할지 정책 확정.
3. 캐릭터 metadata와 Runtime actor 생성 경계를 `11_DATA_MODEL.md` / `03_ARCHITECTURE.md`에 반영.
4. `editor_asset_actions.js`에서 캐릭터 asset 관리 로직을 별도 모듈로 분리.

---

## 5. Sprint 진행 현황

□ 중간 목표 1

Action을 `Timeline + Interaction + Modifiers + Runtime Rule` 데이터 조립 구조로 정리한다.

진행률: 65%

□ 중간 목표 2

Editor에서 Action / Effect 공통 Interaction, Modifiers UI를 유지한다.

진행률: 80%

□ 중간 목표 3

Trigger 기반 Action 실행 구조로 Basic / Custom Action 차이를 줄인다.

진행률: 55%

□ 중간 목표 4

Firebase metadata / asset 저장 흐름을 Setup, Action, Effect, Stage에서 일관되게 만든다.

진행률: 60%
