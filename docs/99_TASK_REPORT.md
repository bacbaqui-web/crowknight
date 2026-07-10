# 99 Task Report

## 고정 Formula 반대 방향 옵션

### 1. 변경한 UI

- 고정 Formula 방향 선택에 `반대` 옵션을 추가했다.
- 기존 `왼쪽` / `오른쪽` 옵션은 유지했다.

### 2. 저장 구조

- `direction: "away"`를 추가했다.
- 기존 direction 없는 데이터는 계속 `right`로 normalize한다.

### 3. Runtime 적용 방식

- `left` / `right`는 기존 고정 Formula facing 계산을 유지한다.
- `away`는 플레이어 위치가 필요한 옵션이라 NPC motion 단계에서 플레이어와 actor 위치를 비교해 계산한다.
- 플레이어가 actor 왼쪽에 있으면 actor는 오른쪽을 보고, 플레이어가 actor 오른쪽에 있으면 actor는 왼쪽을 본다.

### 4. AI 자동 주시보다 우선 적용

- `mobs` / `bosses` actor의 자동 플레이어 주시보다 활성 고정 Formula를 먼저 확인한다.
- 따라서 궁수 / 보스처럼 기본적으로 플레이어를 바라보는 actor도 고정 `반대` 구간에서는 플레이어 반대 방향을 본다.

### 5. QA 결과

- `npm run check` 통과.
- `git diff --check` 통과.
- 브라우저 수동 QA는 아직 별도 실행하지 않았다.

### 6. 코덱스 의견

- `away`는 target actor 위치가 필요한 값이라 Formula 정의에 계산을 넣지 않고 Runtime motion에서 계산하는 것이 맞다.
- 장기적으로는 `left` / `right` / `away` 같은 facing resolve를 별도 helper로 빼면 Action Trigger와 NPC motion 양쪽의 중복을 더 줄일 수 있다.
