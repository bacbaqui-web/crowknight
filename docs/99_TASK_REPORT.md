# 99 Task Report

## Boss Kill HP Recover 추가

### 1. 보스 처치 회복 연결 위치

- `combat_engine.js`의 사망 확정 콜백 `onEnemyDeath(target)`를 그대로 사용했다.
- `main.js`의 `handleEnemyDeath(actor)`에서 bosses 그룹 처치가 처음 집계될 때 주인공 HP를 1 회복한다.
- 기존 `runtimeBossKillCounted` 플래그를 공유하므로 같은 Boss 사망이 여러 frame 처리되어도 HP가 중복 회복되지 않는다.

### 2. HP 회복 방식

- 회복량은 Boss 1명당 1이다.
- `playerActor.hpPips`를 `playerActor.maxHpPips`까지만 증가시킨다.
- 원본 actor tuning이나 최대 HP 값은 수정하지 않는다.

### 3. HP+1 알림 UI

- `index.html`에 `bossHealNotice` UI 레이어를 추가했다.
- 보스 처치 시 화면 중간 위에 `HP+1`을 약 1.2초 표시한다.
- 알림 queue를 사용해 여러 보스 처치 알림이 동시에 겹치지 않게 했다.
- 새 Run 시작 시 알림 queue와 표시 상태를 초기화한다.

### 4. 난이도 시스템과의 관계

- HP 회복은 난이도 단계 상승 여부와 무관하게 보스 처치마다 실행된다.
- 난이도 상승 경고 `적이 강해집니다!`와 별도 UI를 사용한다.

### 5. QA 결과

- `npm run check` 통과.
- `git diff --check` 통과.
- 브라우저에서 보스 처치 시 HP +1, 최대 HP 초과 없음, `HP+1` 표시 수동 QA가 필요하다.

### 6. 코덱스 의견

- 보스 처치 보상은 기존 Boss death 콜백에 붙이는 것이 가장 안전하다.
- 회복과 난이도 상승은 둘 다 Boss 처치 이벤트를 쓰지만, 효과와 UI가 다르므로 별도 함수/알림으로 분리한 현재 구조가 유지보수에 좋다.
