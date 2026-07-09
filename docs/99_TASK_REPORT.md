# 99 Task Report

## 흔들림 Formula 추가

### 1. 추가한 Formula

- `src/formulas/shake_formula.js`를 추가했다.
- 수식 라이브러리에 `흔들림`이 표시된다.
- 저장 구조는 기존 Action Formula와 같은 `actionSettings[actionKey].formulas[]`를 사용한다.

### 2. UI

- Mini Timeline은 사용하지 않는다.
- 옵션은 한 줄 입력으로 구성했다.
  - `발동 프레임`
  - `흔들림 강도`
  - `흔들림 시간`

### 3. Runtime 적용 경로

- `src/shake_formula_runtime_helper.js`를 추가했다.
- Runtime update에서 각 actor의 현재 `actionKey`와 현재 frame을 확인한다.
- 현재 frame이 `triggerFrame`에 도달하면 `particleEffects.shakeScreen()`을 한 번 호출한다.
- 같은 frame에 머무는 동안 반복 발동하지 않도록 actor별 `formulaShakeState`를 저장한다.

### 4. World Physics 흔들림과의 관계

- World Physics hit camera shake는 그대로 유지했다.
- 흔들림 Formula는 Action frame 기반 수동 흔들림이다.
- 공격박스/피격박스 hit 여부와 무관하게 지정 action frame에서 발동한다.

### 5. QA 결과

- `npm run check`: 통과.
- `git diff --check`: 통과.
- Formula Registry import QA: `formulaDef('shake')` 로딩 확인.
- 브라우저 수동 QA는 실행하지 못했다.

### 6. 코덱스 의견

- 이번 구조는 기존 Formula Registry / Formula Editor / particle effect shake API를 그대로 재사용하므로 작다.
- 흔들림을 Action frame 연출로 쓰고, World Physics 흔들림은 hit 공통 반응으로 유지하는 분리가 현재 구조에서 가장 단순하다.
