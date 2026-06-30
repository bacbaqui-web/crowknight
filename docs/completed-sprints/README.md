# Completed Sprints

완료된 Sprint 기록을 보관하는 폴더다.

## 목적

- `99_CURRENT_SPRINT.md`는 현재 작업 인수인계용으로 계속 갱신한다.
- 완료된 Sprint는 이 폴더에 별도 Markdown으로 보관한다.
- 나중에 같은 영역을 다시 작업할 때 완료 이유, 변경 범위, QA 결과, 남은 결정을 빠르게 복구한다.

## 작성 규칙

- 파일명: `YYYY-MM-DD-short-topic.md`
- 한 파일은 완료된 Sprint 하나만 기록한다.
- 긴 구현 로그보다 다음 작업자가 다시 이어갈 때 필요한 사실을 우선한다.
- 반드시 포함:
  - Sprint 목표
  - 완료 커밋
  - 핵심 변경
  - 변경된 흐름
  - 검증 결과
  - 남은 위험
  - 다음 후보

## 운영 방식

Sprint 완료 후:

1. `99_CURRENT_SPRINT.md`를 최신 상태로 갱신한다.
2. 이 폴더에 완료 Sprint 요약본을 추가한다.
3. 필요하면 `docs/sprint-dashboard.html`에는 최신 상태만 짧게 반영한다.
