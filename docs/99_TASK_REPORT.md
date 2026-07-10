# 99 Task Report

## Projectile Landing Marker 추가

### 1. 변경 내용

- 투사체가 날아가는 동안 고정된 목표 위치에 흰색 반짝임 marker를 표시한다.
- marker는 작은 흰 점과 십자 sparkle로 그린다.

### 2. 적용 위치

- `src/projectile_runtime_engine.js`
- `drawProjectiles()`에서 landing marker를 먼저 그리고 projectile 이미지를 그린다.

### 3. Runtime 영향

- Combat / hitbox / projectile 이동 계산은 변경하지 않았다.
- marker는 시각 표시 전용이며 충돌에는 사용하지 않는다.

### 4. QA 결과

- `npm run check`: 실행 예정.
- `git diff --check`: 실행 예정.

### 5. 코덱스 의견

- 목표 위치는 projectile 생성 순간 이미 `targetX/targetY`로 고정되어 있으므로, 별도 저장 구조 없이 marker를 그리는 방식이 가장 단순하다.
- 나중에 옵션이 필요해지면 Projectile Formula에 `landingMarker` ON/OFF 정도만 추가하면 된다.
