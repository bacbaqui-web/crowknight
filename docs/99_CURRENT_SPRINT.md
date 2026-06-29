# 99_CURRENT_SPRINT.md

## Sprint 목표

큰 파일을 키우지 않는 범위에서 Runtime combat geometry helper를 통합한다.

`combatGeometry.js`는 `combatSystem.js`에서만 쓰이므로 전투 판정 계산 내부 helper로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 combat overlap 책임은 같은 파일로 모은다.
- Runtime combat 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- 전투 규칙 자체는 변경하지 않는다.

## 완료한 작업

- `src/combatGeometry.js` 제거.
- `interactionRegionsOverlap()`을 `src/combatSystem.js` local helper로 이동.
- Rect/convex polygon overlap helper를 `src/combatSystem.js` local helper로 이동.
- `docs/10_SRC_MAP.md`에서 삭제/갱신 파일 항목 반영.
- `docs/12_EDITOR_FLOW.md`에서 combat overlap 참조 갱신.

## 변경한 파일과 변경 이유

- `src/combatSystem.js`
  - 단일 소비자였던 combat overlap geometry helper 흡수.
- `src/combatGeometry.js`
  - 삭제. `combatSystem.js` 외부에서 쓰이지 않았음.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/12_EDITOR_FLOW.md`
  - Runtime combat overlap 경로 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
combatSystem
→ combatGeometry
→ rect/polygon overlap
```

After:

```text
combatSystem
→ local rect/polygon overlap
```

## 제거한 중복 또는 예외 처리

- Combat overlap geometry 전용 중간 파일 제거.
- Combat system import 경로 1개 축소.
- JS 파일 수: `src` 기준 135개 → 134개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Attack/hurt/guard/collision 판정 규칙은 유지.
- Damage/reaction/knockback 흐름은 변경하지 않음.
- Interaction region runtime 구조는 유지.
- 저장 구조는 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 완전히 흡수되지 않았다.

## 검증 방법 및 결과

- 예정: `npm run check`.
- 예정: `git diff --check`.
- 완료: `combatSystem.js` import smoke test.
- 예정: 삭제 파일 import 검색.
- 완료: `src` 파일 수 134개 확인.
- 제한: 실제 전투 충돌/공격/방어 브라우저 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `combatSystem.js`가 330줄이 되었다.
- 아직 파일 크기 기준상 위험은 낮지만 전투 로직은 영향도가 높다.
- Runtime combat는 실제 플레이 QA가 필요하다.

## 다음 Sprint 추천

1. 실제 전투 QA.
   - Attack/hurt overlap.
   - Guard block.
   - Collision push.
   - Knockback/reaction.
2. 큰 파일 분해 기준 수립.
   - `tuningNormalize.js`, `puppetPlayer.js`, `tuningPanel.js`는 추가 흡수보다 책임 분리가 우선.
3. 더 줄일 후보는 신중히 선별.
   - 중심 파일을 키우는 통합은 중단.
   - 같은 책임의 작은 파일 통합만 허용.

## 리팩토링 후보와 이유

- `src/combatSystem.js`
  - 이번 Sprint에서 geometry helper를 흡수함. 전투 QA 필요.
- `src/tuningNormalize.js`
  - 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`
  - 440줄. Runtime helper 책임 집중.
- `src/tuningPanel.js`
  - 421줄. 추가 흡수보다 분리 기준 검토가 필요.
- `src/puppetPlayerRenderer.js`
  - 394줄. render/edit region 기록 책임 집중.

## 현재 판단

이번 통합은 가능했지만, 전투 로직이라 실제 QA 중요도가 높다.

다음부터는 단순 파일 수 감소보다 큰 파일 관리와 브라우저 QA가 더 중요하다.
