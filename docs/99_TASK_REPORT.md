# 99 Task Report

## Player Death Result Delay 재조정

### 1. 변경 내용

- 주인공 사망 후 점수판이 뜨기까지의 지연 시간을 2초로 변경했다.

### 2. 수정 파일

- `src/game_config_data.js`

### 3. 실제 적용 값

- `DEATH_RESULT_DELAY = 2`

### 4. 이유

- 3초는 체감상 길어서, 사망 Action 20프레임 / 10fps 기준에 맞춰 2초로 조정했다.

### 5. QA 결과

- `npm run check` 통과.
- `git diff --check` 통과.
- 브라우저 수동 QA는 아직 별도 실행하지 않았다.

### 6. 코덱스 의견

- 현재 사망 모션 길이와 가장 직접적으로 맞는 값은 2초다.
- 이후 사망 Action 길이가 바뀌면 상수 대신 Action frame 길이 기반 자동 계산을 검토할 수 있다.
