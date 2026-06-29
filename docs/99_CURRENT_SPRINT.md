# 99_CURRENT_SPRINT.md

## Sprint 목표

큰 파일을 키우지 않는 범위에서 Actor render 책임을 통합한다.

`actorEffectsRenderer.js`가 actor render 계열의 단일 보조 파일로 남아 있어, actor body/HUD/effect draw 책임을 `actorRenderer.js`로 모은다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 Actor render 책임은 같은 파일로 모은다.
- Render 순서는 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/actorEffectsRenderer.js` 제거.
- `drawAttackTrail()`을 `src/actorRenderer.js`로 이동.
- `drawSelectedPartGlow()`를 `src/actorRenderer.js` local helper로 이동.
- `drawHitFlash()`를 `src/actorRenderer.js` local helper로 이동.
- `src/main.js`의 `drawAttackTrail()` import를 `actorRenderer.js`로 변경.
- `docs/10_SRC_MAP.md`에서 삭제/갱신 파일 항목 반영.
- `docs/12_EDITOR_FLOW.md`에서 Effect runtime draw 참조 갱신.

## 변경한 파일과 변경 이유

- `src/actorRenderer.js`
  - Actor body/HUD/effect/shadow draw 책임을 한 파일로 통합.
- `src/main.js`
  - `drawAttackTrail()` import 경로 변경.
- `src/actorEffectsRenderer.js`
  - 삭제. 기능은 `actorRenderer.js`로 이동.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/12_EDITOR_FLOW.md`
  - Effect runtime draw 경로 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
main
→ actorEffectsRenderer.drawAttackTrail

actorRenderer
→ actorEffectsRenderer.drawSelectedPartGlow / drawHitFlash
```

After:

```text
main
→ actorRenderer.drawAttackTrail

actorRenderer
→ local drawSelectedPartGlow / drawHitFlash
```

## 제거한 중복 또는 예외 처리

- Actor render 계열이 `actorRenderer.js`와 `actorEffectsRenderer.js`로 나뉘어 있던 구조 제거.
- Main actor effect import 경로 제거.
- JS 파일 수: `src` 기준 138개 → 137개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Main render order는 유지.
  - Actor draw 후 hit/death particle 후 attack trail.
- Effect frame 읽기는 `effectFrameAt()` 유지.
- Effect region record는 `recordPuppetImageRegion()` 유지.
- Actor HUD layout은 `characterHudLayout.js` 유지.
- 저장 구조는 변경하지 않음.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 완전히 흡수되지 않았다.

## 검증 방법 및 결과

- 예정: `npm run check`.
- 예정: `git diff --check`.
- 예정: `actorRenderer.js` import smoke test.
- 예정: 삭제 파일 import 검색.
- 예정: `src` 파일 수 137개 확인.
- 제한: 실제 브라우저 canvas render QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `actorRenderer.js`가 actor body/HUD/shadow/effect draw를 함께 가진다.
- 현재 209줄이라 파일 크기 위험은 낮음.
- Actor render가 300줄 이상 커지면 effect/HUD 경계를 재검토한다.

## 다음 Sprint 추천

1. 실제 화면 QA.
   - Actor HUD/shadow.
   - Hit flash.
   - Selected part glow.
   - Attack trail effect.
2. 큰 파일 분해 기준 수립.
   - `tuningNormalize.js`, `puppetPlayer.js`, `tuningPanel.js`는 추가 흡수보다 책임 분리가 우선.
3. 더 줄일 후보는 신중히 선별.
   - 중심 파일을 키우는 통합은 중단.
   - 같은 책임의 작은 파일 통합만 허용.

## 리팩토링 후보와 이유

- `src/tuningNormalize.js`
  - 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`
  - 440줄. Runtime helper 책임 집중.
- `src/tuningPanel.js`
  - 421줄. 추가 흡수보다 분리 기준 검토가 필요.
- `src/puppetPlayerRenderer.js`
  - 394줄. render/edit region 기록 책임 집중.

## 현재 판단

이번 통합은 무리한 수준이 아니다.

`actorRenderer.js`가 209줄이므로 아직 관리 가능하다.

다만 다음 단계부터는 중심 파일 비대화 위험이 커진다. 더 줄이려면 먼저 후보를 분석하고, 같은 책임으로 묶이는 경우에만 진행해야 한다.
