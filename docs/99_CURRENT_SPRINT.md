# 99_CURRENT_SPRINT.md

## Sprint 목표

큰 파일을 키우지 않는 범위에서 Action/Pose field value transform helper를 통합한다.

`actionBaseTransform.js`는 `tuningFieldValues.js`에서만 쓰이므로 field display/store 변환 파일 안으로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 field value 변환 책임은 같은 파일로 모은다.
- Setup/Action/Effect field 표시 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/actionBaseTransform.js` 제거.
- Action base display default를 `src/tuningFieldValues.js`로 이동.
- Action/Pose size percent 변환 helper를 `src/tuningFieldValues.js` local helper로 이동.
- Setup part size percent 변환 helper를 `src/tuningFieldValues.js` local helper로 이동.
- `docs/10_SRC_MAP.md`에서 삭제/갱신 파일 항목 반영.

## 변경한 파일과 변경 이유

- `src/tuningFieldValues.js`
  - 단일 소비자였던 Action/Pose field display/store helper 흡수.
- `src/actionBaseTransform.js`
  - 삭제. `tuningFieldValues.js` 외부에서 쓰이지 않았음.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
tuningFieldValues
→ actionBaseTransform
→ Action/Pose display/store transform
```

After:

```text
tuningFieldValues
→ local Action/Pose display/store transform
```

## 제거한 중복 또는 예외 처리

- Field value transform 전용 중간 파일 제거.
- Field value import 경로 1개 축소.
- JS 파일 수: `src` 기준 134개 → 133개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Pose field public API는 유지.
- Part field public API는 유지.
- Effect field public API는 유지.
- 저장 구조는 변경하지 않음.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 완전히 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 완료: `tuningFieldValues.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `actionBaseTransform` 파일 import 없음.
- 완료: `src` 파일 수 133개 확인.
- 제한: 실제 Setup/Action/Effect field 입력 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `tuningFieldValues.js`가 Part/Pose/Effect field 변환을 함께 가진다.
- 현재 138줄이라 파일 크기 위험은 낮음.
- Field value 변경은 실제 property panel QA가 필요하다.

## 다음 Sprint 추천

1. 실제 field QA.
   - Setup Part X/Y/W/H/R/opacity.
   - Action Part X/Y/W/H/R/interactions.
   - Effect frame X/Y/W/H/R/opacity.
2. 큰 파일 분해 기준 수립.
   - `tuningNormalize.js`, `puppetPlayer.js`, `tuningPanel.js`는 추가 흡수보다 책임 분리가 우선.
3. 더 줄일 후보는 신중히 선별.
   - 중심 파일을 키우는 통합은 중단.
   - 같은 책임의 작은 파일 통합만 허용.

## 리팩토링 후보와 이유

- `src/tuningFieldValues.js`
  - 이번 Sprint에서 Action/Pose helper를 흡수함. Field QA 필요.
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

`tuningFieldValues.js`가 138줄이므로 관리 가능하다.

하지만 남은 단일 소비자 후보 대부분은 중심 파일을 키운다.

추가 파일 수 감소는 여기서 멈추는 것이 맞다.

다음부터는 실제 QA와 큰 파일 분해 기준 수립을 우선해야 한다.
