# 99 Task Report

## 1. 이번에 확인한 것

- Attack Interaction의 `knockback` 값은 `interaction_region_engine.js`에서 attack region의 `reaction.knockback`으로 들어간다.
- Combat hit가 성공하면 `combat_engine.js`의 `applyKnockback()`이 호출된다.
- 최소 재현에서 `damage=1`, `knockback=7`일 때 대상 `vx`가 `7`로 증가하는 것을 확인했다.

## 2. 원인

- 넉백은 즉시 위치 이동이 아니라 `target.player.vx`에 impulse를 더하는 방식이다.
- Combat은 현재 frame의 물리 이동이 끝난 뒤 실행된다.
- 다음 frame 물리에서 `worldPhysics.inertia`가 먼저 적용된 뒤 위치가 이동한다.
- `inertia`가 0 또는 1처럼 낮으면 넉백 `vx`가 위치 이동에 쓰이기 전에 0으로 감쇠될 수 있다.

## 3. 수정 내용

- `src/combat_engine.js`의 `applyKnockback()`에서 넉백 후 `target.player.velocityControl.x = true`를 설정했다.
- 이로써 다음 physics frame에서 x축 넉백 속도가 최소 한 번은 감쇠 전에 위치 이동에 사용된다.
- Combat 판정, damage, hit once, Interaction 저장 구조는 변경하지 않았다.

## 4. QA 결과

- 데이터 QA: hit 성공 후 `target.player.vx = 7` 확인.
- 데이터 QA: hit 성공 후 `target.player.velocityControl.x = true` 확인.
- `npm run check` 통과.
- `git diff --check` 통과.

## 5. 주의사항

- 현재 작업 중 `assets/characters/index.json`의 `updatedAt`이 dev server에 의해 자동 갱신되었다.
- `assets/effects/custom/effect_jumpattack.png`가 untracked 상태로 존재한다. 사용자가 업로드한 에셋일 수 있어 이번 작업에서는 건드리지 않았다.

## 6. 코덱스 의견

- 이번 문제는 넉백 값이 region이나 Combat에 전달되지 않는 문제가 아니라, velocity impulse가 첫 이동 전에 inertia로 죽을 수 있는 frame order 문제다.
- 넉백은 hit impulse 성격이 강하므로 최소 한 frame은 감쇠 없이 이동에 쓰이게 하는 현재 보정이 자연스럽다.
- 장기적으로는 knockback 전용 `vx`/`vy` 채널을 분리하면 World Physics 관성과 더 명확하게 역할을 나눌 수 있다.
