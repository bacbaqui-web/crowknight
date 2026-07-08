# 99 Task Report

## 1. 변경 내용

- `목표이동` Formula에 `moveFrames` 값을 추가했다.
- `moveFrames=0`은 목표 좌표로 즉시 이동한다.
- `moveFrames=1~10`은 해당 Action Timeline frame 수 동안 시작 위치에서 목표 좌표까지 보간한다.

## 2. UI

- 목표이동 카드의 기존 `발동 프레임 / X / Y` 입력 아래에 `도달 프레임` 슬라이더를 추가했다.
- 슬라이더 범위는 `0~10`이며, `0`은 `즉시`, 나머지는 `Nf`로 표시한다.
- 기존 Formula 카드 / 공통 field 구조를 재사용했다.

## 3. 저장 구조

- 저장 위치는 기존과 같은 `actionSettings[actionKey].formulas[]`다.
- `targetMove` Formula에 `moveFrames` 필드를 추가했다.
- 기본값은 `1`이다.

## 4. Runtime 적용 방식

- 목표이동 발동 시점의 actor 위치를 `startX/startY`로 저장한다.
- 목표 좌표는 기존처럼 그림자 / 발밑 기준과 mirror X 반전을 유지한다.
- 매 frame `timelineFrameDelta(dt)`만큼 진행해 `moveFrames` 동안 목표 좌표까지 보간한다.
- `moveFrames=0`이면 기존 즉시 이동처럼 바로 목표 좌표로 이동한다.

## 5. QA 결과

- 데이터 QA: `moveFrames=0` 즉시 도달 확인.
- 데이터 QA: `moveFrames=1` 1 Action frame에 목표 도달 확인.
- 데이터 QA: `moveFrames=2` 첫 frame 50%, 두 번째 frame 목표 도달 확인.
- 데이터 QA: mirror 상태에서 X 반전 이동 확인.
- 데이터 QA: 공중에서 `Y=0` 목표 이동 시 그림자 위치로 보간 확인.
- `npm run check` 통과.
- `git diff --check` 통과.
- 브라우저 수동 체감 QA는 아직 별도로 진행하지 않았다.

## 6. 코덱스 의견

- `목표이동`은 순간이동과 속도 Formula 사이의 중간 역할이므로 `moveFrames`를 0~10으로 제한한 현재 구조가 안전하다.
- 이후 필요하면 `curve` 옵션을 추가해 목표까지 선형 / 감속 / 가속 이동을 고를 수 있지만, 지금은 단순 frame 수 조절만 두는 것이 좋다.
