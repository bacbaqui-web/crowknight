# 99_CURRENT_SPRINT.md

## Sprint 목표

큰 파일을 키우지 않는 범위에서 Edit Handle geometry helper를 통합한다.

`screenGeometry.js`는 `editHandleGeometry.js`에서만 쓰이므로 handle geometry 계산 내부 helper로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 handle geometry 책임은 같은 파일로 모은다.
- Handle geometry 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/screenGeometry.js` 제거.
- Screen vector/point/segment helper를 `src/editHandleGeometry.js` local helper로 이동.
- `src/editHandleGeometry.js`가 handle geometry 계산에 필요한 screen geometry를 직접 소유하도록 정리.
- `docs/10_SRC_MAP.md`에서 삭제 파일 항목 제거.

## 변경한 파일과 변경 이유

- `src/editHandleGeometry.js`
  - 단일 소비자였던 screen geometry helper 흡수.
- `src/screenGeometry.js`
  - 삭제. `editHandleGeometry.js` 외부에서 쓰이지 않았음.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
editHandleGeometry
→ screenGeometry
→ vector/point/segment 계산
```

After:

```text
editHandleGeometry
→ local vector/point/segment 계산
```

## 제거한 중복 또는 예외 처리

- Handle geometry 전용 중간 파일 제거.
- Handle geometry import 경로 1개 축소.
- JS 파일 수: `src` 기준 136개 → 135개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Part/Edit handle geometry API는 유지.
- Effect handle target 구조는 유지.
- Group edit handle geometry는 유지.
- Canvas drag/apply 흐름은 변경하지 않음.
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
- 완료: `editHandleGeometry.js` import smoke test.
- 예정: 삭제 파일 import 검색.
- 완료: `src` 파일 수 135개 확인.
- 제한: 실제 handle hover/drag 브라우저 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `editHandleGeometry.js`가 293줄이 되었다.
- 아직 파일 크기 기준상 위험은 낮지만 300줄 근처라 추가 흡수는 신중해야 한다.
- Handle geometry 변경은 화면 QA가 중요하다.

## 다음 Sprint 추천

1. 실제 화면 QA.
   - Part move/resize/rotate handle hover.
   - InteractionBox handle hover.
   - Effect handle hover.
   - Group edit handle hover.
2. 큰 파일 분해 기준 수립.
   - `tuningNormalize.js`, `puppetPlayer.js`, `tuningPanel.js`는 추가 흡수보다 책임 분리가 우선.
3. 더 줄일 후보는 신중히 선별.
   - 중심 파일을 키우는 통합은 중단.
   - 같은 책임의 작은 파일 통합만 허용.

## 리팩토링 후보와 이유

- `src/editHandleGeometry.js`
  - 이번 Sprint에서 screen geometry helper를 흡수함. 300줄 근처라 추가 흡수 주의.
- `src/tuningNormalize.js`
  - 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`
  - 440줄. Runtime helper 책임 집중.
- `src/tuningPanel.js`
  - 421줄. 추가 흡수보다 분리 기준 검토가 필요.
- `src/puppetPlayerRenderer.js`
  - 394줄. render/edit region 기록 책임 집중.

## 현재 판단

이번 통합은 가능했지만, 이제 비슷한 방식의 추가 흡수는 점점 위험해진다.

특히 `editHandleGeometry.js`는 293줄이므로 더 키우면 경계가 흐려질 수 있다.

다음부터는 파일 수 감소보다 실제 QA와 큰 파일 분해 기준 수립이 더 중요하다.
