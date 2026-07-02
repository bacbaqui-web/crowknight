# SPRINT HISTORY

이 문서는 `99_TASK_REPORT.md`에 누적되던 작업 내역을 분리해 기록하는 히스토리 문서다.

규칙:

- Task가 끝날 때마다 시간, Task 이름, 목표, 완료 내용, QA 결과, 남은 확인 사항을 추가한다.
- `99_TASK_REPORT.md`에는 현재 Sprint 상태와 직전 완료 Task 요약만 유지한다.
- 오래된 상세 기록은 이 문서에 누적한다.

---

## 2026-07-02 12:22 KST

### Task

Task Report 파일명 변경

### 목표

- 기존 `docs/99_CURRENT_SPRINT.md` 파일명을 문서 역할에 맞게 `docs/99_TASK_REPORT.md`로 변경한다.
- 문서, 대시보드, 히스토리, 개발 규칙에 남아 있는 이전 파일명 참조를 새 파일명으로 정리한다.
- 다음 작업부터 Task Report 갱신 대상이 `docs/99_TASK_REPORT.md`임을 명확히 한다.

### 완료 내용

- `docs/99_CURRENT_SPRINT.md`를 `docs/99_TASK_REPORT.md`로 이동했다.
- `AGENTS.md`, `docs/00_MANIFEST.md`, `docs/98_SPRINT_HISTORY.md`, `docs/src-map.html`, `docs/completed-sprints/README.md`, `docs/sprint-dashboard.html`의 참조를 새 파일명으로 바꿨다.
- `docs/src-map.html`의 Task Report 링크가 `./99_TASK_REPORT.md`를 가리키도록 갱신했다.
- `docs/99_TASK_REPORT.md`와 `docs/sprint-dashboard.html`의 직전 완료 Task 보고를 이번 파일명 변경 Task로 갱신했다.
- 이전 미확인 QA는 `완료 안 된 QA`로 이월했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 새 파일 존재와 이전 파일 제거를 확인한다.
- AGENTS / Manifest / SRC Map / completed-sprints README의 운영 참조가 새 파일명으로 바뀌었는지 확인한다.
- 대시보드 200 OK 응답을 다시 확인한다.

### 남은 QA

- `docs/src-map.html`에서 Task Report 링크가 `99_TASK_REPORT.md`로 이동하는지 화면 확인.
- 대시보드에서 이번 파일명 변경 Task와 이월 QA가 보이는지 확인.

---

## 2026-07-02 12:17 KST

### Task

QA 체크 표시 / 미완료 QA 이월 규칙 정리

### 목표

- Sprint Dashboard의 `해야 할 QA`를 실제 체크 가능한 QA 목록으로 만든다.
- 다음 Task Report 갱신 때 체크 완료된 QA는 제거하고, 체크되지 않은 QA는 `완료 안 된 QA`로 이월한다.
- QA 문구를 확인 위치와 확인 기준이 보이도록 더 친절하게 작성한다.

### 완료 내용

- `docs/sprint-dashboard.html`의 QA 항목을 체크박스 UI로 변경했다.
- QA 체크 상태를 브라우저 `localStorage`에 저장하도록 했다.
- `docs/99_TASK_REPORT.md`에 `완료 안 된 QA` 섹션을 추가했다.
- 이전 Setup 캐릭터 그룹 / 생성 / 휴지통 QA를 `완료 안 된 QA`로 이월했다.
- QA 문구를 `어디에서`, `무엇을`, `어떤 기준으로` 확인해야 하는지 알 수 있게 풀어서 작성했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 대시보드 200 OK 응답을 다시 확인한다.

### 남은 QA

- 대시보드에서 QA 체크박스 클릭 / 새로고침 유지 동작을 화면에서 확인한다.
- 다음 Task Report 갱신 때 체크 완료 QA는 제거하고, 미체크 QA는 완료 안 된 QA로 이월한다.

---

## 2026-07-02 12:13 KST

### Task

Task Report 반영 방식 보정

### 목표

- 작은 문서 정리 Task도 완료된 작업이면 `99_TASK_REPORT.md`의 직전 완료 Task 보고에 남긴다.
- `docs/sprint-dashboard.html`도 같은 직전 Task 내용을 보여주게 한다.

### 완료 내용

- `99_TASK_REPORT.md`의 직전 완료 Task 보고를 `Current Task Report 표시명 정리` 내용으로 교체했다.
- `docs/sprint-dashboard.html`의 직전 완료 Task 보고도 같은 내용으로 맞췄다.
- 이전 Setup 캐릭터 그룹 / 생성 / 휴지통 작업 기록은 이 히스토리 문서에 유지했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 대시보드 200 OK 응답을 다시 확인한다.

### 남은 QA

- 대시보드에서 `Current Task Report`와 `직전 완료 Task 보고`가 보이는지 화면 확인.

---

## 2026-07-02 12:09 KST

### Task

Current Task Report 표시명 정리

### 목표

- `99_TASK_REPORT.md`와 대시보드가 실제로는 직전 Task를 보고하는 문서라는 점이 제목에서 드러나게 한다.
- 파일명은 기존 작업 루틴과 호환되도록 유지한다.

### 완료 내용

- `docs/99_TASK_REPORT.md`의 최상단 제목을 `CURRENT TASK REPORT`로 변경했다.
- `직전 완료 Task` 섹션 이름을 `직전 완료 Task 보고`로 변경했다.
- `docs/sprint-dashboard.html`의 `<title>`, H1, 섹션 제목을 Current Task Report 기준으로 변경했다.
- 기존 캐릭터 그룹 / 생성 / 휴지통 Task의 QA 항목은 유지했다.

### 완료된 QA

- 문서 포맷 / 정적 검사를 다시 실행한다.
- 대시보드 200 OK 응답을 다시 확인한다.

### 남은 QA

- 없음.

---

## 2026-07-02 12:04 KST

### Task

Setup 캐릭터 그룹 / 생성 / 휴지통 구조 정리

### 목표

- Setup 캐릭터 선택을 `주인공 / 잡몹 / 보스` 그룹으로 나눈다.
- 새 캐릭터 생성 시 영어명 / 한글명 / 그룹 / PSD를 명확히 입력하게 한다.
- 삭제한 캐릭터는 즉시 제거하지 않고 휴지통으로 보낸다.
- 휴지통 캐릭터는 Runtime actor가 아니라 metadata로 관리한다.

### 완료 내용

- `src/character_group_data.js`를 추가해 캐릭터 그룹과 휴지통 group key를 공통화했다.
- Setup 선택 UI에 `actorGroupSelect`를 추가하고 그룹별 캐릭터 필터링을 연결했다.
- 새 캐릭터 생성 모달을 추가했다.
- 새 캐릭터 폴더를 `assets/characters/{group}/{englishName}`로 만들도록 했다.
- Firebase Storage PSD 경로가 `characters/{group}/{englishName}/{englishName}.psd`를 보존하도록 slash path sanitizer를 보정했다.
- 로컬 dev server에 `/api/character/move`, `/api/character/delete`를 추가했다.
- 캐릭터 삭제를 휴지통 이동으로 바꾸고, 휴지통 UI에서 완전삭제할 수 있게 했다.
- `99_TASK_REPORT.md`를 새 고정 템플릿으로 재작성했다.
- `sprint-dashboard.html`을 현재 Sprint 문서 요약만 보여주는 구조로 개편했다.

### 완료된 QA

- `npm run check` 통과.
- `python3 -m py_compile tools/dev_server.py` 통과.
- `git diff --check` 통과.
- `http://127.0.0.1:4176/setting.html` 200 OK 확인.
- `http://127.0.0.1:4176/docs/sprint-dashboard.html` 200 OK 확인.
- 임시 폴더로 `/api/character/move`, `/api/character/delete` nested path 이동 / 삭제 확인.

### 남은 QA

- 실제 브라우저에서 새 캐릭터 모달과 PSD 파일 선택 흐름 확인.
- 휴지통 이동 후 새로고침 / Firebase metadata 업로드 / 다운로드 확인.
- 기존 `player`, `enemy*` fallback asset 경로와 새 그룹 경로의 공존 확인.

---

## 이전 누적 기록 요약

### Action Interaction & Modifiers Sprint에서 이미 반영된 큰 흐름

- Property / Interaction / Modifiers를 같은 Timeline Target 아래 형제 패널로 분리했다.
- Property Engine은 Transform 전용으로 유지했다.
- Interaction Editor Engine은 충돌 / 피격 / 공격 / 방어 체크와 Box 편집을 담당한다.
- Modifiers Editor Engine은 수식 라이브러리와 적용된 수식 UI를 담당한다.
- 수식 MVP는 `이동`, `가속`, `감속` 3개로 축소했다.
- Action Trigger Editor는 녹화 기반 single / sequence / hold combo 입력을 지원한다.
- Action / Effect 상단 UI와 Timeline toolbar를 정리했다.
- Setup / Action / Effect Property scrub UI를 compact 숫자형 구조로 통일했다.
- Firebase metadata는 Firestore 단일 문서 저장 흐름으로 정리했다.
- Firebase asset은 backgrounds / characters / effects / icons root 규칙을 따른다.
