# Crow Knight Manifest

이 문서는 프로젝트의 최상위 문서다.

다른 모든 문서는 이 문서를 기준으로 작성한다. 새로운 구조나 기능은 먼저 이 문서의 원칙을 만족해야 한다.

이 문서는 구현보다 프로젝트 방향을 정의한다. 거의 바뀌지 않는다.

## Vision

Crow Knight는 횡스크롤 액션 게임을 만드는 프로젝트가 아니다.

횡스크롤 액션 게임을 만들 수 있는 제작툴을 만드는 프로젝트다.

모든 설계는 이 목표를 우선한다.

## 프로젝트 목적

Crow Knight는 횡스크롤 액션 로그라이트를 만들기 위한 프로젝트다.

프로젝트의 중심은 게임 기능 자체보다, 캐릭터와 동작과 효과와 스테이지를 안정적으로 제작할 수 있는 제작툴이다.

Crow Knight는 데이터 기반 액션 제작 툴이다. Action은 코드에 하드코딩된 동작이 아니라 Timeline, Interaction, Modifiers 데이터로 제작되는 것을 목표로 한다.

## 개발 철학

- 게임보다 제작툴을 먼저 안정화한다.
- 새 기능보다 구조와 유지보수성을 우선한다.
- 한 번에 크게 갈아엎기보다 작은 반복 개선으로 경계를 넓힌다.
- Crow Knight는 기능을 하드코딩으로 늘리는 프로젝트가 아니라, 공통 블록을 조립해 액션과 효과와 스테이지 규칙을 만드는 제작툴이다.
- 새 기능은 먼저 `Timeline`, `Interaction`, `Modifiers`, `Runtime Rule` 중 어디에 속하는지 분류한다.
- 새 기능은 먼저 기존 공통 블록으로 표현 가능한지 검토한다.
- 같은 사용자 경험은 같은 내부 시스템을 사용한다.
- 새 편집 기능은 먼저 공통 시스템에 붙이고, 특정 영역 전용 구현은 마지막 선택으로 둔다.
- 사용자가 이해하는 개념과 코드 구조가 멀어지지 않게 한다.
- 사람이 읽기 쉬운 코드가 똑똑해 보이는 코드보다 중요하다.
- 저장 가능한 데이터와 실행 중 Runtime 상태를 분리한다.

## AI Development Workflow

이 프로젝트는 GPT와 Codex가 협업하여 개발한다.

- GPT는 설계자다. 프로젝트 방향, 구조 설계, Sprint 계획, 코드 리뷰, 문서 운영, 기술부채 우선순위를 결정한다.
- Codex는 구현 담당이다. 기능 구현, 리팩토링, 버그 수정, 테스트, 문서 갱신, Sprint 보고서를 담당한다.
- 개발 순서는 `사용자 → GPT → Sprint 계획 → Codex → 구현 → 테스트 → 99_CURRENT_SPRINT 갱신 → GPT 리뷰 → 다음 Sprint`를 따른다.
- Codex는 구현 전에 필요한 문서를 읽고, 가능한 기존 구조를 재사용한다.
- Codex는 새 기능 구현 전에 기능 분류, 공통 시스템 재사용 가능성, 새 Engine 필요 여부, 재사용 범위, 가장 단순한 MVP를 먼저 보고한다.
- 새로운 구조가 필요하면 먼저 GPT가 검토할 수 있도록 제안한다.
- 작업이 끝나면 반드시 `99_CURRENT_SPRINT.md`를 최신 상태로 갱신한다.
- Workflow 자체도 프로젝트의 일부이며, 더 나은 방식이 발견되면 Sprint를 통해 개선한다.

## AI Documentation Principles

문서는 AI가 최소 토큰으로 최대 정보를 이해하도록 작성한다.

- 한 문서는 하나의 책임만 가진다.
- 같은 내용은 두 문서에 반복하지 않는다.
- 긴 설명보다 관련 문서 참조를 우선한다.
- Sprint 문서는 이번 변경사항만 기록한다.
- 사실과 추측을 구분한다.
- 새 문서는 기존 문서가 답하지 못하는 새 질문이 있을 때만 만든다.
- 문서는 다음 AI가 5분 안에 작업을 시작할 수 있을 만큼만 작성한다.
- 짧은 문장, 중복 제거, 명확한 이름, 단순한 구조를 우선한다.

## 절대 원칙

- Setup은 Base다.
- Action은 Timeline + Interaction + Modifiers다.
- 새 기능은 Timeline / Interaction / Modifiers / Runtime Rule 조합으로 먼저 설명한다.
- Action의 움직임은 Timeline이다.
- Effect는 Timeline이다.
- Stage는 World다.
- 모든 editable object는 interaction 대상이 될 수 있다.
- Editor와 Runtime은 분리한다.
- Runtime은 Editor 원본을 직접 수정하지 않는다.
- Runtime 데이터는 Editor 원본에서 실행 중 계산한다.
- Runtime은 Action을 만드는 곳이 아니라 Action 데이터를 해석해서 실행하는 곳이다.
- Runtime은 Action 이름을 보고 새 동작을 특별 처리하지 않는다.
- 공통 UI는 공통 시스템을 사용한다.
- 모든 편집 기능은 가능한 한 하나의 공통 경로로 모든 editable object에 적용한다.
- 저장 구조 변경은 별도 Sprint에서만 한다.
- Tool, Game, Engine 대이동은 별도 Sprint에서만 한다.

## 하지 말아야 하는 것

- 새 기능을 이유로 구조적 부채를 늘리지 않는다.
- 같은 UX를 영역마다 다른 시스템으로 만들지 않는다.
- 같은 기능을 Action용, Effect용, Projectile용으로 따로 만들지 않는다.
- 새 Action 이름별 Runtime 분기를 추가하지 않는다.
- 기존 공통 블록으로 표현 가능한 기능에 새 Engine을 만들지 않는다.
- Runtime 요구 때문에 Editor 원본 구조를 흐리지 않는다.
- 임시 UI를 영구 구조처럼 굳히지 않는다.
- 대규모 이동과 기능 추가를 한 Sprint에 섞지 않는다.
- 저장 구조 변경, Runtime 대개편, UI 대개편을 한 Sprint에 함께 넣지 않는다.

## 개발 우선순위

1. Tool 안정성
2. Editor UX
3. 데이터 구조 정리
4. Runtime 연결
5. Game 기능 확장
6. Optimization
