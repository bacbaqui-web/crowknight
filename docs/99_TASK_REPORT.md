# 99 Task Report

## Attack Interaction Knockback Mode 추가

### 1. 재사용한 Velocity UI

- Velocity Formula의 SET / ADD mode 토글 버튼을 export해서 Attack Interaction UI에서 그대로 재사용했다.
- 새 아이콘이나 별도 mode 컴포넌트는 만들지 않았다.

### 2. Knockback Mode 저장 위치

- `attackInteractionObject.knockbackMode`에 `"add"` 또는 `"set"`으로 저장한다.
- 기본값은 `"add"`다.

### 3. ADD Runtime

- 기존 구현을 유지한다.
- 무기박스 이동 벡터 기반 넉백 + facing 기준 추가 X + 추가 Y를 합산한다.

### 4. SET Runtime

- 무기박스 이동 벡터를 사용하지 않는다.
- 공격자 facing 기준 `knockback` + facing 기준 추가 X + 월드 기준 추가 Y만 적용한다.

### 5. QA 결과

- `npm run check` 통과.
- `git diff --check` 통과.

### 6. 코덱스 의견

- 방향 선택 UI 없이 SET을 추가하는 현재 요구에서는 `knockback`을 공격자 전방 px/f로 해석하는 것이 가장 단순하다.
- 나중에 상하/대각 고정 넉백이 필요하면 방향 프리셋을 별도 옵션으로 추가하는 편이 안전하다.
