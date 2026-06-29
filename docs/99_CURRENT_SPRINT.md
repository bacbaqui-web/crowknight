# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

큰 파일을 키우지 않고 중복된 Timeline controller control 책임을 하나의 공통 파일로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 책임은 같은 파일로 모은다.
- Timeline controller 동작은 유지한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/timelineControllerControls.js` 추가.
- Timeline selection controls를 새 공통 controls 파일로 이동.
- Timeline clipboard controls를 새 공통 controls 파일로 이동.
- Timeline playback controls를 새 공통 controls 파일로 이동.
- `src/timelineControllerSelectionControls.js` 제거.
- `src/timelineControllerClipboardControls.js` 제거.
- `src/tuningTimelinePlaybackControls.js` 제거.
- `src/timelineControllerCore.js` import를 공통 controls 파일로 변경.
- `docs/10_SRC_MAP.md`에서 삭제/추가 파일 항목 갱신.

## 변경한 파일과 변경 이유

- `src/timelineControllerControls.js`
  - Timeline controller의 selection/clipboard/playback control helper를 한 파일로 통합.
- `src/timelineControllerCore.js`
  - 세 control helper import를 공통 controls 파일 하나로 변경.
- `src/timelineControllerSelectionControls.js`
  - 삭제. 기능은 `timelineControllerControls.js`로 이동.
- `src/timelineControllerClipboardControls.js`
  - 삭제. 기능은 `timelineControllerControls.js`로 이동.
- `src/tuningTimelinePlaybackControls.js`
  - 삭제. 기능은 `timelineControllerControls.js`로 이동.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
timelineControllerCore
→ timelineControllerSelectionControls
→ timelineControllerActions

timelineControllerCore
→ timelineControllerClipboardControls
→ timelineControllerActions

timelineControllerCore
→ tuningTimelinePlaybackControls
→ tuningTimelineSettings / tuningNumberInputs
```

After:

```text
timelineControllerCore
→ timelineControllerControls
→ timelineControllerActions / tuningTimelineSettings / tuningNumberInputs
```

## 제거한 중복 또는 예외 처리

- Timeline controller controls가 세 파일로 갈라져 있던 구조 제거.
- Core import 경로 3개를 1개로 축소.
- JS 파일 수: `src` 기준 146개 → 144개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Timeline action 함수는 `timelineControllerActions.js` 유지.
- Timeline state 계산은 `timelineState.js` 유지.
- Timeline renderer/view/drag 구조는 유지.
- `timelineControllerCore.js`에는 control 구현을 직접 넣지 않음.
- 저장 구조는 변경하지 않음.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect runtime renderer는 아직 `actorEffectsRenderer.js`에 별도 존재.
- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: `timelineControllerCore.js` import smoke test.
- 통과: `timelineControllerControls.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `timelineControllerSelectionControls` 참조 없음.
  - `src`에서 `timelineControllerClipboardControls` 참조 없음.
  - `src`에서 `tuningTimelinePlaybackControls` 참조 없음.
- 통과: `src` 파일 수 144개 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `timelineControllerControls.js`가 selection/clipboard/playback 세 control 책임을 함께 가진다.
- 모두 Timeline controller 내부 control 책임이라 현재 통합 경계는 자연스럽다.
- 이 파일이 300줄 이상 커지면 selection/playback 경계를 다시 검토한다.

## 다음 Sprint 추천

1. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`
2. 작은 파일 통합 후보 검토.
   - StageRules panel/controller 파일 중 같은 책임으로 합칠 수 있는지 확인.
   - Firebase asset/storage 파일이 같은 저장 책임으로 합쳐질 수 있는지 확인.
3. Effect runtime renderer 공통화 검토.
   - `actorEffectsRenderer.js`가 editable object render/source와 더 합쳐질 수 있는지 확인.
4. Master/root transform 정리 설계.
   - `anchorX/anchorY`를 editable transform 규칙에 맞출지 결정.

## 리팩토링 후보와 이유

- `src/timelineControllerControls.js`
  - 이번 Sprint에서 control helper 3개를 통합함. 크기 추적 필요.
- `src/actorEffectsRenderer.js`
  - Runtime Effect render entry가 아직 별도.
- `src/editableObjectModel.js`
  - 미사용 export 후보가 남아 있음.
- `src/tuningInteractionObjects.js`
  - 미사용 source helper 후보가 남아 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningPanel.js`: 421줄. 추가 흡수 시 파일 비대화 주의.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
- `src/timelineControllerControls.js`: 184줄. 이번 Sprint에서 Timeline control helper 3개를 통합함.
