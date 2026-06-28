# Crow Knight Decisions

이 문서는 왜 이런 구조를 선택했는지만 기록한다.

새로운 구조적 결정이 생기면 구현 전에 먼저 이 문서를 갱신한다.

## 제작툴 우선

- 결정: 게임 기능 확장보다 제작툴 안정화를 먼저 한다.
- 이유: 제작 흐름이 안정되어야 게임 기능도 반복 개발할 수 있다.
- 대체안: 게임 기능을 먼저 늘리는 방식은 채택하지 않는다.

## GPT / Codex 협업 Workflow

- 결정: GPT는 설계와 리뷰를 맡고, Codex는 구현과 검증과 Sprint 보고를 맡는다.
- 이유: 방향 결정과 구현 책임을 분리해야 구조 변경, 기능 추가, 저장 구조 변경이 한 Sprint에 섞이는 위험을 줄일 수 있다.
- 대체안: Codex가 계획 없이 바로 구현하거나 GPT가 직접 구현까지 담당하는 방식은 기본 흐름으로 채택하지 않는다.

## AI 문서 원칙

- 결정: 프로젝트 문서는 사람이 감탄하는 설명보다 AI가 빠르게 이어서 작업할 수 있는 정보 구조를 우선한다.
- 이유: 중복 설명과 장황한 Sprint 기록은 다음 작업의 토큰 비용과 오해 가능성을 높인다.
- 대체안: 모든 배경을 매 문서와 매 Sprint에 반복하는 방식은 채택하지 않는다.

## Workflow Session 구조

- 결정: 제작 흐름을 Setup, Action, Effect, Stage로 나눈다.
- 이유: 기능 목록보다 사용자가 만드는 순서가 더 중요하다.
- 대체안: 기능별 설정 패널을 계속 늘리는 방식은 채택하지 않는다.

## Setup은 Base

- 결정: Setup은 캐릭터의 기본 상태를 만드는 공간이다.
- 이유: 이후 모든 제작 영역이 같은 출발점을 공유해야 한다.
- 대체안: Action마다 기본 배치를 따로 저장하는 방식은 채택하지 않는다.

## Action은 Timeline

- 결정: Action의 움직임은 Timeline keyframe으로 정의한다.
- 이유: 움직임의 원천이 하나여야 사용자가 결과를 예측할 수 있다.
- 대체안: 자동 움직임 슬라이더와 Timeline을 함께 쓰는 방식은 채택하지 않는다.

## Effect는 Timeline

- 결정: Effect도 Timeline 기준으로 편집한다.
- 이유: 행동과 시각 효과의 타이밍을 같은 방식으로 다룰 수 있어야 한다.
- 대체안: 효과만 별도 timing 시스템으로 편집하는 방식은 채택하지 않는다.

## InteractionBox

- 결정: 충돌/피격/공격/방어 박스는 `InteractionBox` 계열로 다룬다.
- 이유: 네 박스는 모두 parent part에 붙은 판정 geometry와 Runtime role을 가진다.
- 대체안: 판정 박스별 별도 편집/preview/source를 유지하는 방식은 채택하지 않는다.

## InteractionBox Timeline State

- 결정: 전투/방어/충돌 규칙은 Action Timeline에서 frame value로 조정할 수 있게 한다.
- 이유: 공격 ON/OFF, 방어, 피격 가능 여부 같은 판정 상태는 동작 프레임과 함께 제작되어야 한다.
- 대체안: Runtime 판정 박스가 별도 위치/크기를 갖고 Action과 따로 움직이는 방식은 채택하지 않는다.

## Editable Transform Model

- 결정: 모든 editable object는 After Effects Transform 모델을 따른다.
- 규칙: `x/y`는 Position, `ax/ay`는 Anchor Point, `w/h`는 Size, `rot`는 Anchor 기준 Rotation이다.
- 계산: `translate(x, y) → rotate(rot) → drawRect(-ax, -ay, w, h)`.
- 이유: Setup, Action, Effect, Stage, InteractionBox가 같은 좌표/핸들/resize 규칙을 공유해야 한다.
- 대체안: 대상별로 `x/y` 의미와 resize 계산을 다르게 유지하는 방식은 채택하지 않는다.

## Editor와 Runtime 분리

- 결정: Editor 원본 데이터와 Runtime 실행 데이터를 분리한다.
- 이유: 제작 편의성과 실행 계산은 서로 다른 요구를 가진다.
- 대체안: Runtime 데이터를 Editor 원본으로 직접 편집하는 방식은 채택하지 않는다.

## Runtime 데이터는 계산값

- 결정: Runtime 판정 데이터는 저장하지 않고 Editor 원본에서 실행 중 계산한다.
- 이유: 원본과 mirror가 동시에 존재하면 Editor/Preview/Combat source가 어긋난다.
- 대체안: Runtime mirror 필드를 저장하거나 Editor source처럼 쓰는 방식은 채택하지 않는다.

## HUD는 하나의 그룹

- 결정: 이름과 HP Bar는 하나의 HUD 그룹으로 다룬다.
- 이유: UI 요소를 개별 판정 대상처럼 편집하면 제작 흐름이 복잡해진다.
- 대체안: 이름과 HP Bar를 각각 드래그 target으로 두는 방식은 채택하지 않는다.

## Selection Palette

- 결정: Setup의 선택 UI는 편집 대상 선택 surface다.
- 이유: 기준, 파츠, 판정 박스를 같은 방식으로 선택해야 한다.
- 대체안: 파츠 선택과 판정 박스 선택을 별도 패널로 나누는 방식은 채택하지 않는다.

## 공통 Numeric Input

- 결정: 숫자 입력은 공통 UX를 사용한다.
- 이유: 입력 방식이 영역마다 다르면 제작 속도와 신뢰성이 떨어진다.
- 대체안: 각 패널이 숫자 입력을 따로 구현하는 방식은 채택하지 않는다.

## 작은 반복 개선

- 결정: 큰 리팩토링보다 작은 경계 분리를 반복한다.
- 이유: 현재 동작을 유지하면서 구조적 위험을 줄일 수 있다.
- 대체안: 한 번에 전체 구조를 갈아엎는 방식은 채택하지 않는다.
