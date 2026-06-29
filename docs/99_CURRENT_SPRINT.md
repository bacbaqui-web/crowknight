# 99_CURRENT_SPRINT.md

## Sprint 목표

Property 입력과 Transform drag가 사용하는 W/H 기준 크기 계산을 공통화한다.

이번 작업은 새 기능 추가가 아니다.

목표:

- Setup Part W/H percent 변환과 Transform direct drag가 같은 기준 크기 helper를 사용한다.
- Action Pose W/H percent 변환과 Transform pose drag가 같은 기준 크기 helper를 사용한다.
- W/H percent 변환 수식을 이름 있는 helper로 모은다.
- W/H percent 제한값 5% / 300%를 같은 상수로 공유한다.
- Effect W/H percent 변환도 같은 helper를 사용한다.
- Master / control group의 scale percent 변환을 이름 있는 helper로 모은다.
- Property scrub UI의 숫자 표시와 toggle 판단도 공통 helper를 사용한다.
- Number input step 자리수 포맷도 공통 숫자 formatter를 사용한다.
- Background / speed / run motion link의 소수 자리 포맷도 공통 숫자 formatter를 사용한다.
- Background / speed / run motion link의 clamp 계산도 공통 `utils.clamp`를 사용한다.
- Background / speed의 NaN fallback + clamp 패턴은 공통 `utils.clampFinite`를 사용한다.
- 기존 UI 동작, 저장 구조, Runtime 동작은 변경하지 않는다.

## 완료된 작업

### 1. Setup Part size base 공통화

변경 파일:

- `src/property_value_helper.js`
- `src/transform_value_helper.js`

변경 내용:

- `partSizeBase(part, prop, fallbackPart)` 추가.
- Setup Part W/H percent 변환이 `partSizeBase()`를 사용.
- Transform direct drag의 W/H 기준 크기도 `partSizeBase()`를 사용.

의미:

- Property 입력창에서 보는 W/H 기준과 Canvas/Transform drag가 사용하는 W/H 기준이 같은 helper를 공유한다.

### 2. Action Pose size base 공통화

변경 파일:

- `src/property_value_helper.js`
- `src/transform_value_helper.js`

변경 내용:

- `posePartSizeBase(basePart, prop)` 추가.
- Action Pose W/H percent 변환이 `posePartSizeBase()`를 사용.
- Transform pose drag의 W/H 기준 크기도 `posePartSizeBase()`를 사용.

의미:

- Action에서 입력창으로 크기를 바꾸는 흐름과 Canvas drag로 크기를 바꾸는 흐름이 같은 base size 계산을 사용한다.

### 3. W/H percent 변환 helper 공통화

변경 파일:

- `src/editable_property_helper.js`
- `src/part_source_registry.js`
- `src/property_value_helper.js`
- `src/transform_value_helper.js`

변경 내용:

- `SIZE_PERCENT_MIN` 추가.
- `SIZE_PERCENT_MAX` 추가.
- `sizeValueToPercent(value, baseValue)` 추가.
- `sizeValueFromPercent(baseValue, percent, minValue)` 추가.
- `sizeOffsetToPercent(offset, baseValue)` 추가.
- `sizeOffsetFromPercent(baseValue, percent)` 추가.
- Setup Part W/H percent 표시/저장이 위 helper를 사용.
- Action Pose W/H offset/percent 변환이 위 helper를 사용.
- Effect W/H percent 표시/저장이 위 helper를 사용.
- Transform resize limit의 5% / 300% 계산이 같은 helper를 사용.
- InteractionObject W/H 저장도 같은 percent helper를 사용.
- Property field limit의 size percent 범위도 같은 상수를 사용.

의미:

- “현재 크기 ÷ 기준 크기”, “기준 크기 × 퍼센트” 계산을 Property와 Transform이 같은 이름으로 공유한다.
- Setup / Action / Effect의 W/H percent 변환이 같은 기본 helper를 사용한다.
- 5% / 300% 제한값을 바꿀 때 여러 파일을 따로 찾을 필요가 줄었다.
- 앞으로 W/H percent 변환 규칙을 찾을 때 수식 조각을 여러 곳에서 찾지 않아도 된다.

### 4. Master / Control Group scale percent helper 공통화

변경 파일:

- `src/property_value_helper.js`
- `src/transform_value_helper.js`

변경 내용:

- `scaleValueToPercent(value)` 추가.
- `scaleValueFromPercent(percent, minScale)` 추가.
- `scaleOffsetToPercent(offset)` 추가.
- `scaleOffsetFromPercent(percent)` 추가.
- Setup control group W/H 표시/저장이 scale helper를 사용.
- Action Master W/H offset/percent 변환이 scale offset helper를 사용.
- Transform 쪽 control group 판정이 `isControlGroupPartKey()`를 사용.

의미:

- 일반 Part는 실제 W/H 크기를 percent로 보여준다.
- Control group은 scale 값을 percent처럼 보여준다.
- Master는 size offset을 percent처럼 보여준다.
- 이 차이를 직접 수식이 아니라 helper 이름으로 읽을 수 있게 했다.

### 5. Dashboard QA 중심 구조 개선

변경 파일:

- `docs/sprint-dashboard.html`

변경 내용:

- 상단을 `직전 Task 보고`로 정리.
- `완료된 작업`을 가장 크게 표시.
- 완료 항목마다 코드 의미를 모르는 사람도 이해할 수 있는 설명을 추가.
- `QA 해야 하는 파트`를 완료된 작업 바로 아래에 크게 배치.
- QA 항목마다 “무엇을 보면 정상인지”를 적음.
- `검증 결과 / 주의사항`은 작은 카드로 낮춤.
- `다음 작업 추천`은 1순위, 2순위, 3순위로 표시.
- 하단에 현재 진행 중인 Sprint의 목표, 완료된 작업, 아직 못한 작업을 체크 목록으로 표시.

### 6. Property Scrub 표시/토글 규칙 공통화

변경 파일:

- `src/editable_property_helper.js`
- `src/property_scrub_helper.js`
- `src/property_numeric_input_helper.js` 사용

변경 내용:

- `isToggleProp(prop)` 추가.
- `isTogglePropOff(prop, value)` 추가.
- `togglePropFallback(prop)` 추가.
- Property scrub의 opacity / interaction toggle 판단이 위 helper를 사용.
- Property scrub의 일반 숫자, interaction decimal, rotation 나머지 표시가 `formatNumericInputValue()`를 사용.
- Property scrub의 percent 입력값도 표시 문자열을 다시 파싱하지 않고 `formatNumericInputValue()`로 직접 표시.
- Property scrub 내부의 `formatDecimalValue()` 제거.

의미:

- Scrub UI가 “토글인지”, “꺼진 상태인지”, “기본값이 무엇인지”를 직접 판단하지 않는다.
- 숫자 표시 규칙을 `property_numeric_input_helper.js`와 공유한다.
- Percent 입력값 표시도 같은 숫자 formatter를 직접 사용한다.
- Property 입력창과 scrub 표시가 더 같은 규칙을 보게 됐다.

### 7. Number input step 포맷 공통화

변경 파일:

- `src/property_numeric_input_helper.js`
- `src/number_input_helper.js`

변경 내용:

- `formatNumericInputValue(value, step, options)`에 `trim` 옵션 추가.
- 기존 호출은 `trim: true` 기본값을 유지.
- `number_input_helper.formatInputNumber()`는 `formatNumericInputValue(value, step, { trim: false })`를 사용.

의미:

- 숫자 input drag/stepper와 Property scrub이 같은 step 자리수 계산을 공유한다.
- `number_input_helper`는 기존처럼 `0.05` step에서 trailing zero를 유지한다.
- 표시 동작은 유지하면서 자리수 계산 중복만 줄였다.

### 8. Decimal formatter 공통화

변경 파일:

- `src/property_numeric_input_helper.js`
- `src/background_panel_view.js`
- `src/control_value_transform_helper.js`
- `src/run_motion_link_helper.js`

변경 내용:

- `formatNumericDecimalValue(value, decimals, options)` 추가.
- `formatNumericInputValue()`가 내부에서 `formatNumericDecimalValue()`를 사용.
- Background compact input 표시가 `formatNumericDecimalValue()`를 사용.
- Speed 표시 변환이 `formatNumericDecimalValue()`를 사용.
- Run motion link 자동 보정값 표시/저장이 `formatNumericDecimalValue()`를 사용.

의미:

- 직접 `toFixed()`로 소수 자리를 만드는 UI/컨트롤 보조 코드가 줄었다.
- Background / tuning control / run motion link가 같은 소수 자리 formatter를 공유한다.
- 기존처럼 필요한 곳은 숫자로 다시 변환하고, Background는 문자열 표시를 유지한다.

### 9. Clamp 계산 공통화

변경 파일:

- `src/background_panel_view.js`
- `src/control_value_transform_helper.js`
- `src/run_motion_link_helper.js`

변경 내용:

- Background compact input clamp가 `utils.clamp()`를 사용.
- Speed level/value clamp가 `utils.clamp()`를 사용.
- Run motion link 자동 보정 clamp가 `utils.clamp()`를 사용.

의미:

- 직접 `Math.min(Math.max())` 패턴을 줄였다.
- NaN fallback 동작은 기존처럼 각 파일에서 유지한다.
- 실제 min/max 제한 의미는 변경하지 않았다.

### 10. Finite clamp fallback 공통화

변경 파일:

- `src/utils.js`
- `src/background_panel_view.js`
- `src/control_value_transform_helper.js`

변경 내용:

- `clampFinite(value, min, max, fallback = min)` 추가.
- Background compact input clamp가 `clampFinite()`를 사용.
- Speed level/value clamp가 `clampFinite()`를 사용.

의미:

- “숫자가 아니면 fallback, 숫자면 min/max 제한” 패턴을 한 helper로 묶었다.
- Background와 speed는 기존처럼 NaN일 때 `min`으로 돌아간다.
- Run motion link는 기존 NaN 처리 의미를 건드리지 않기 위해 `utils.clamp()` 사용을 유지했다.

### 11. Playwright headless QA 실행 중간 결과

변경 파일:

- `docs/qa/2026-06-30-headless-setting/`
- `docs/99_CURRENT_SPRINT.md`
- `docs/sprint-dashboard.html`

실행 방식:

- 프로젝트 의존성에는 Playwright가 없었다.
- `package.json`을 수정하지 않고 `/tmp/crow-knight-playwright-qa`에 임시 Playwright를 설치했다.
- Playwright Chromium browser cache를 설치했다.
- 로컬 Chrome GUI는 조작하지 않았다.
- `python3 -m http.server 4173`으로 `setting.html`을 열었다.
- Playwright headless Chromium으로 자동 QA를 실행했다.

당시 결과:

- PASS: `setting.html` 로드.
- PASS: 설정 패널 열기.
- PASS: Setup weapon 선택 시 W/H 표시.
- PASS: Setup weapon W stepper 변경.
- PASS: Action 첫 키프레임 자동 선택.
- PASS: Action weapon 선택 시 W/H 표시.
- 당시 FAIL: Action weapon W stepper 클릭 후 W 값이 `100%`에서 변하지 않음.
- PASS: `actorScale` number input `1` → `1.25` 변경.
- PASS: Effect 섹션 로드 및 keyframe 표시.
- 당시 FAIL로 기록: `/runtime/project-default-state.json` 404.
- 사용자 실제 테스트: Action W stepper 미동작 재현.

스크린샷:

- `docs/qa/2026-06-30-headless-setting/01-setting-html-load.png`
- `docs/qa/2026-06-30-headless-setting/02-settings-panel-open.png`
- `docs/qa/2026-06-30-headless-setting/03-setup-weapon-size-fields.png`
- `docs/qa/2026-06-30-headless-setting/04-setup-weapon-w-stepper.png`
- `docs/qa/2026-06-30-headless-setting/05-action-first-keyframe-select.png`
- `docs/qa/2026-06-30-headless-setting/06-action-weapon-size-fields.png`
- `docs/qa/2026-06-30-headless-setting/07-action-weapon-w-stepper.png`
- `docs/qa/2026-06-30-headless-setting/08-number-input-formatting.png`
- `docs/qa/2026-06-30-headless-setting/09-effect-section-load.png`
- `docs/qa/2026-06-30-headless-setting/10-console-and-network-check.png`
- `docs/qa/2026-06-30-headless-setting/results.json`

당시 의미:

- Setup 쪽 Property W/H 표시와 stepper 변경은 headless QA 기준 통과했다.
- Action 쪽 W/H 필드 표시는 통과했지만, W stepper가 값을 바꾸지 못했다.
- 같은 Action W stepper 문제는 사용자 실제 테스트에서도 재현됐다.
- 이 중간 실패는 이후 Stepper/Scrub 입력 경로 수정과 최종 자동 QA에서 해소됐다.
- `/runtime/project-default-state.json` 404도 이후 optional seed fallback으로 확인되어 QA 실패에서 제외했다.
- Canvas resize drag는 이번 자동 QA에서 아직 수행하지 않았다.

### 12. Stepper / Scrub 입력 경로 수정

변경 파일:

- `src/property_numeric_input_helper.js`
- `src/number_input_helper.js`
- `src/part_editor_controller.js`
- `src/timeline_pose_controller.js`
- `docs/qa/2026-06-30-stepper-scrub-fix/`
- `docs/99_CURRENT_SPRINT.md`
- `docs/sprint-dashboard.html`

원인:

- Setup HP / 크기 number input drag는 `bindNumericInputUx()`의 pointerdown capture lock이 `bindNumberDragInput()`보다 먼저 걸리면서 drag 시작을 막았다.
- Action Pose scrub stepper는 `renderPosePartFields()`가 렌더 시점의 `offset`을 read closure에 붙잡고 있었다.
- Stepper가 값을 써도 `syncScrubValues()`가 오래된 `offset`으로 다시 읽어서 `W100%`를 덮어썼다.

수정:

- Number input은 pointerdown에서 즉시 lock하지 않고 focus/blur 기준으로 edit lock을 관리하게 했다.
- Drag가 시작된 뒤에는 focus lock 때문에 drag가 취소되지 않게 했다.
- Action Pose scrub read 함수가 렌더 시점 `offset`이 아니라 `poseTimeline.currentFrameValue(partKey)`를 매번 다시 읽게 했다.
- `timeline_pose_controller.updateOffset()`도 write 후 최신 frame value를 다시 읽어 반환하게 했다.

검증:

- Playwright headless QA 재실행.
- PASS: Setup HP number drag `5 -> 20`.
- PASS: Setup actorScale number drag `1 -> 2.4`.
- PASS: Action weapon W stepper `W100% -> W101%`.
- Screenshot dir: `docs/qa/2026-06-30-stepper-scrub-fix/`.

의미:

- Setup numeric input stepper / scrub drag / Action scrub stepper가 더 같은 공통 입력 경로를 사용한다.
- “값 쓰기 후 최신 값을 다시 읽는다”는 규칙이 Action Pose에도 적용됐다.
- 성공한 QA는 Dashboard의 “QA 해야 하는 파트”에서 제거하고 검증 결과에만 남긴다.

### 13. Dashboard 남은 QA / Sprint 완료 조건 정리

변경 파일:

- `docs/sprint-dashboard.html`
- `docs/99_CURRENT_SPRINT.md`

변경 내용:

- Dashboard 상단 문구를 “통과한 QA 결과” 중심에서 “현재 Sprint 목표” 중심으로 변경.
- `QA 해야 하는 파트`를 `남은 QA`로 변경.
- 이미 통과한 Setup HP scrub drag, Setup 크기 scrub drag, Action W stepper QA 항목과 재확인 안내를 Dashboard에서 제거.
- Dashboard의 `검증 결과` 카드도 `남은 확인`으로 바꾸고, 앞으로 확인해야 할 항목만 표시.
- `Sprint 완료 조건` 카드를 추가.

Sprint 완료 조건:

- Property와 Transform이 같은 W/H 기준 크기, percent 제한, 저장 변환 helper를 사용한다.
- Setup / Action / Effect의 크기 입력 규칙이 같은 helper 계열로 정렬된다.
- Stepper / scrub / 숫자 표시 규칙이 같은 포맷 규칙을 사용한다.
- 공통화 묶음이 쌓인 뒤 Setup / Action / Effect / 특수 그룹 / Background 관련 QA를 한 번에 통과한다.
- `99_CURRENT_SPRINT.md`는 기술 기록, `sprint-dashboard.html`은 남은 확인과 다음 작업 중심으로 유지한다.

의미:

- Dashboard는 완료된 QA 히스토리나 재확인 안내를 보여주지 않는다.
- 통과한 QA 기록은 99 보고서에 남기고, Dashboard는 사용자가 앞으로 봐야 할 것만 보여준다.
- 이번 Sprint가 언제 끝나는지 판단할 수 있는 기준을 명확히 세웠다.

### 14. 잔여 Property / Transform / Timeline 공통화

변경 파일:

- `src/property_value_helper.js`
- `src/transform_value_helper.js`
- `src/property_numeric_input_helper.js`
- `src/property_scrub_helper.js`
- `src/timeline_drag_helper.js`
- `src/timeline_pose_controller.js`
- `src/timeline_effect_controller.js`
- `src/timeline_playback_helper.js`
- `src/timeline_settings_helper.js`
- `src/timeline_control_helper.js`
- `src/number_input_helper.js`
- `docs/99_CURRENT_SPRINT.md`
- `docs/sprint-dashboard.html`

변경 내용:

- `partSizeScale()` 추가.
- `positiveScaleValue()` 추가.
- Transform anchor scale 계산이 직접 `baseW/baseH` 계산을 하지 않고 `partSizeScale()`을 사용하게 정리.
- control group anchor scale 안전값은 `positiveScaleValue()`를 사용.
- `formatRotationInputValue()` 추가.
- `parseNumericTextValue()` 추가.
- `parseRotationInputValue()` 추가.
- Property scrub 내부에 있던 rotation 표시/파싱 함수를 제거하고 `property_numeric_input_helper.js`로 이동.
- `createTimelineKeyframeDragHandler()` 추가.
- Pose / Effect timeline controller가 keyframe drag 바인딩을 같은 helper로 생성하게 정리.
- Timeline playback rate 제한값을 `timeline_playback_helper.js`의 `TIMELINE_PLAYBACK_RATE_MIN/MAX`와 `clampTimelinePlaybackRate()`로 이동.
- `number_input_helper.js`에서 Timeline 전용 `clampPlaybackRateInput()` 제거.
- `timeline_settings_helper.js`와 `timeline_control_helper.js`가 같은 playback rate clamp helper를 사용.

의미:

- Property scrub은 회전값 표시/파싱 규칙을 직접 갖지 않는다.
- Transform anchor 보정은 Part size 기준 helper와 같은 계산 흐름을 사용한다.
- Action / Effect Timeline keyframe drag는 같은 생성 helper를 공유한다.
- Timeline playback rate 규칙은 숫자 입력 helper가 아니라 Timeline playback helper에 있다.
- 이번 변경은 동작 변경 목적이 아니라 같은 기능이 같은 helper를 쓰게 만드는 공통화다.

### 15. Timeline controller glue 마무리 공통화

변경 파일:

- `src/timeline_command_helper.js`
- `src/timeline_controller.js`
- `src/timeline_pose_controller.js`
- `src/timeline_effect_controller.js`
- `docs/99_CURRENT_SPRINT.md`
- `docs/sprint-dashboard.html`

변경 내용:

- `createTimelineFrameCommands()`가 clipboard getter/setter/clear 함수를 따로 받지 않고 `clipboardState`를 직접 받게 정리.
- Pose / Effect controller에서 반복되던 clipboard command 연결 파라미터를 제거.
- `createTimelineControllerCommonApi()` 추가.
- Pose / Effect controller의 return common API 목록을 `createTimelineControllerCommonApi()`로 생성하게 정리.

의미:

- Action / Effect Timeline controller가 같은 controller API 구성을 공유한다.
- Timeline frame command는 clipboard 상태 접근 방식을 한 경로로 사용한다.
- 남은 Timeline 차이는 Action과 Effect의 실제 역할 차이인 settings view, field render, preview 생성 방식 중심이다.
- 이번 변경으로 현재 Sprint의 “공통화 구현”은 QA 전 단계까지 마무리됐다.

### 16. project-default-state 404 fallback 확인

확인한 파일:

- `src/project_storage_helper.js`
- `src/main.js`
- `src/actor_factory.js`
- `src/scene_session_data.js`
- `tools/dev_server.py`
- `.gitignore`

확인 내용:

- `src/project_storage_helper.js`의 `loadSavedState()`가 `./runtime/project-default-state.json`을 요청한다.
- 요청 순서는 localStorage → Firebase remote project state → optional project default file → code default fallback이다.
- `loadSavedState()` 내부에 `// The project default file is optional.` 주석이 있다.
- 파일이 없거나 응답이 `ok`가 아니면 `normalizeSavedState(null)`로 fallback한다.
- `normalizeSavedState(null)`는 `normalizeSceneSessions()`를 통해 기본 scene session을 만든다.
- `createActors(savedState, world)`는 `savedState.actors`가 없어도 `defaultTuningFor(def)`와 기본 actor 정의로 캐릭터를 만든다.
- `runtime/`은 `.gitignore` 대상이다. 따라서 `runtime/project-default-state.json`은 저장소에 항상 존재해야 하는 파일이 아니다.
- `tools/dev_server.py`는 `/api/state/default` POST로 `runtime/project-default-state.json`을 생성할 수 있다. 즉 이 파일은 프로젝트 기본 상태를 따로 저장하고 싶을 때 쓰는 optional seed다.

검증:

- Playwright headless로 localStorage를 비우고 Firebase project state 응답을 404로 막은 뒤 `setting.html`을 로드했다.
- `runtime/project-default-state.json`도 404가 발생했다.
- 결과: `setting.html` title, canvas, Setup UI가 정상 로드됐다.
- page error 없음.
- 스크린샷: `docs/qa/project-default-state-fallback.png`.

판정:

- `/runtime/project-default-state.json` 404는 버그가 아니다.
- 이 404는 optional seed file이 없을 때 발생하는 의도된 fallback 경로다.
- 브라우저 콘솔에는 404 resource message가 남지만 앱 동작 실패는 아니다.
- 앞으로 QA에서 이 항목은 FAIL로 세지 않는다.
- 네트워크 QA에서 이 URL은 allowlist 처리한다.

## 변경한 파일과 이유

- `src/property_value_helper.js`
  - W/H percent 변환 기준 크기 계산을 `partSizeBase()`와 `posePartSizeBase()`로 명명.
  - anchor scale 계산용 `partSizeScale()` 추가.
  - control group scale 안전값용 `positiveScaleValue()` 추가.
  - W/H percent 변환 수식을 `sizeValueToPercent()`, `sizeValueFromPercent()`, `sizeOffsetToPercent()`, `sizeOffsetFromPercent()`로 명명.
  - Master/control group의 scale percent 변환을 `scaleValueToPercent()`, `scaleValueFromPercent()`, `scaleOffsetToPercent()`, `scaleOffsetFromPercent()`로 명명.
  - Effect W/H percent 변환도 같은 helper를 사용하게 함.
  - Property 입력과 Transform drag가 같은 기준을 공유할 수 있게 함.

- `src/transform_value_helper.js`
  - 직접 계산하던 direct/pose W/H 기준 크기를 `property_value_helper.js`의 helper로 대체.
  - anchor scale 계산이 `partSizeScale()`과 `positiveScaleValue()`를 사용하게 함.
  - Transform resize limit과 InteractionObject W/H 저장이 같은 percent helper를 사용하게 함.
  - control group 판정이 `part_source_registry.js`의 `isControlGroupPartKey()`를 사용하게 함.

- `src/editable_property_helper.js`
  - W/H percent 공통 제한값 `SIZE_PERCENT_MIN`, `SIZE_PERCENT_MAX` 추가.
  - Scrub UI가 쓰는 toggle 판단 helper 추가.

- `src/part_source_registry.js`
  - Size field limit이 `SIZE_PERCENT_MIN`, `SIZE_PERCENT_MAX`를 사용하게 함.

- `src/property_scrub_helper.js`
  - 로컬 toggle 판단과 decimal 표시 함수를 제거.
  - `editable_property_helper.js`와 `property_numeric_input_helper.js`를 사용하게 함.
  - 로컬 rotation 표시/파싱 함수를 제거하고 `property_numeric_input_helper.js`의 helper를 사용하게 함.

- `src/property_numeric_input_helper.js`
  - Property scrub 숫자 표시에서 기존 `formatNumericInputValue()`를 재사용.
  - `formatNumericInputValue()`에 `trim` 옵션 추가.
  - `formatNumericDecimalValue()` 추가.
  - `formatRotationInputValue()`, `parseNumericTextValue()`, `parseRotationInputValue()` 추가.
  - Number input pointerdown lock이 scrub drag를 막지 않도록 lock 타이밍 조정.

- `src/number_input_helper.js`
  - `formatInputNumber()`가 step 자리수 계산을 직접 하지 않고 `formatNumericInputValue()`를 사용.
  - Drag 시작 후 focus lock 때문에 drag가 취소되지 않게 조정.
  - Timeline 전용 playback rate clamp 책임을 제거.

- `src/part_editor_controller.js`
  - Action Pose scrub read가 렌더 시점 `offset`이 아니라 현재 frame value를 다시 읽게 함.

- `src/timeline_pose_controller.js`
  - Action Pose value write 후 최신 frame value를 다시 읽어 반환하게 함.
  - keyframe drag 바인딩을 `createTimelineKeyframeDragHandler()`로 생성하게 함.
  - controller common API를 `createTimelineControllerCommonApi()`로 생성하게 함.

- `src/timeline_effect_controller.js`
  - keyframe drag 바인딩을 `createTimelineKeyframeDragHandler()`로 생성하게 함.
  - controller common API를 `createTimelineControllerCommonApi()`로 생성하게 함.

- `src/timeline_drag_helper.js`
  - Pose / Effect가 공유하는 `createTimelineKeyframeDragHandler()` 추가.

- `src/timeline_command_helper.js`
  - Frame command가 `clipboardState`를 직접 받아 copy/paste/reset clipboard 접근 방식을 통일.

- `src/timeline_controller.js`
  - Pose / Effect가 공유하는 `createTimelineControllerCommonApi()` 추가.

- `src/timeline_playback_helper.js`
  - playback rate min/max 상수와 `clampTimelinePlaybackRate()` 추가.

- `src/timeline_settings_helper.js`
  - playback rate 저장이 `clampTimelinePlaybackRate()`를 사용하게 함.

- `src/timeline_control_helper.js`
  - playback rate 입력 반영이 `clampTimelinePlaybackRate()`를 사용하게 함.

- `src/background_panel_view.js`
  - Background compact input 숫자 표시가 `formatNumericDecimalValue()`를 사용.
  - Background compact input clamp가 `utils.clampFinite()`를 사용.

- `src/control_value_transform_helper.js`
  - Speed 표시값 소수 자리 보정이 `formatNumericDecimalValue()`를 사용.
  - Speed level/value clamp가 `utils.clampFinite()`를 사용.

- `src/run_motion_link_helper.js`
  - Run motion link 자동 보정값 소수 자리 보정이 `formatNumericDecimalValue()`를 사용.
  - Run motion link 자동 보정 clamp가 `utils.clamp()`를 사용.

- `src/utils.js`
  - `clampFinite()` 추가.

- `docs/99_CURRENT_SPRINT.md`
  - 최신 작업 기준 보고서로 갱신.

- `docs/sprint-dashboard.html`
  - 사용자가 직전 작업 결과와 QA 대상을 빠르게 이해할 수 있게 정리.
  - 상단은 직전 Task 보고, 중간은 QA 체크리스트, 하단은 현재 Sprint 목표/완료/미완료 상태를 보여주게 정리.
  - Playwright headless QA의 PASS/FAIL과 다음 QA 대상을 반영.
  - 성공한 QA는 “QA 해야 하는 파트”에서 제거하고 검증 결과에만 남김.
  - Dashboard 상단 `완료된 작업`은 누적 히스토리가 아니라 직전 Task만 표시하도록 재정리.
  - Dashboard 하단 Current Sprint 완료 목록은 세부 로그가 아니라 큰 묶음 요약만 유지.
  - 완료된 QA를 Dashboard에서 제거하고, 남은 QA와 Sprint 완료 조건만 보이게 정리.

## 변경된 데이터 흐름

저장 데이터 구조는 변경 없음.

Setup:

```text
Property input W/H
Transform direct drag W/H
        ↓
property_value_helper.partSizeBase()
property_value_helper.sizeValueToPercent()
property_value_helper.sizeValueFromPercent()
        ↓
tuning.rig
```

Action:

```text
Property input W/H
Transform pose drag W/H
        ↓
property_value_helper.posePartSizeBase()
property_value_helper.sizeOffsetToPercent()
property_value_helper.sizeOffsetFromPercent()
        ↓
tuning.poseOffsets
```

Master / Control Group:

```text
Master W/H offset
Control group W/H scale
        ↓
property_value_helper.scaleValueToPercent()
property_value_helper.scaleValueFromPercent()
property_value_helper.scaleOffsetToPercent()
property_value_helper.scaleOffsetFromPercent()
```

Effect:

```text
Effect W/H input
        ↓
property_value_helper.effectSizeBase()
property_value_helper.sizeValueToPercent()
property_value_helper.sizeValueFromPercent()
        ↓
tuning.effectOffsets
```

Size percent limits:

```text
editable_property_helper.SIZE_PERCENT_MIN/MAX
        ↓
part_source_registry.sizePercentFieldLimits()
transform_value_helper.canvasVisualSizeLimits()
property_value_helper.effectSizeFromPercent()
```

Property Scrub:

```text
Property scrub display
        ↓
editable_property_helper.isToggleProp()
editable_property_helper.isTogglePropOff()
editable_property_helper.togglePropFallback()
property_numeric_input_helper.formatNumericInputValue()
property_numeric_input_helper.formatRotationInputValue()
property_numeric_input_helper.parseRotationInputValue()
```

Number Input:

```text
number_input_helper.formatInputNumber()
        ↓
property_numeric_input_helper.formatNumericInputValue(trim: false)
```

Decimal Formatting:

```text
background_panel_view.formatBackgroundInputValue()
control_value_transform_helper.formatDisplayNumber()
run_motion_link_helper.normalizeLinkedControlValue()
        ↓
property_numeric_input_helper.formatNumericDecimalValue()
```

Clamp:

```text
background_panel_view.clampBackgroundNumber()
control_value_transform_helper.clampNumber()
        ↓
utils.clampFinite()

run_motion_link_helper.normalizeLinkedControlValue()
        ↓
utils.clamp()
```

Timeline Drag:

```text
Pose keyframe drag
Effect keyframe drag
        ↓
timeline_drag_helper.createTimelineKeyframeDragHandler()
        ↓
timeline_drag_helper.bindTimelineKeyframeDragWithPreview()
```

Timeline Playback Rate:

```text
Timeline playback input
Timeline setting write
        ↓
timeline_playback_helper.clampTimelinePlaybackRate()
```

Timeline Controller API:

```text
Pose timeline controller
Effect timeline controller
        ↓
timeline_controller.createTimelineControllerCommonApi()
```

## 제거한 중복

- Setup Part W/H 기준 크기 계산 중복.
- Action Pose W/H 기준 크기 계산 중복.
- Transform drag 쪽의 직접 base size 계산 일부.
- W/H percent 변환 수식 중복.
- Transform resize limit의 5% / 300% 직접 계산.
- Property field limit의 5% / 300% 직접 숫자.
- Effect size percent 변환 수식 일부.
- Master size offset percent 직접 수식.
- Control group scale percent 직접 수식.
- Transform 쪽 control group 판정 local helper.
- Property scrub의 toggle 판단 local helper.
- Property scrub의 decimal number 표시 local helper.
- Property scrub의 rotation 표시/파싱 local helper.
- Property scrub의 percent 표시 후 재파싱 흐름.
- Transform anchor scale의 직접 `baseW/baseH` 기준 계산.
- Number input의 step 자리수 직접 계산.
- Number input helper 안에 있던 Timeline playback rate 전용 clamp 책임.
- Background compact input의 직접 `toFixed(2)` 표시.
- Speed 표시값의 직접 `toFixed()` 보정.
- Run motion link 보정값의 직접 `toFixed()` 보정.
- Background/control/run motion의 직접 `Math.min(Math.max())` clamp 패턴.
- Background/speed의 직접 `Number.isFinite()` fallback + clamp 패턴.
- Action W/H 필드 존재 여부를 수동 확인해야 하던 상태.
- Pose / Effect timeline keyframe drag 바인딩 반복.
- Pose / Effect timeline controller common API 목록 반복.
- Pose / Effect timeline frame command clipboard 연결 반복.

## 유지한 구조

- `tuning.rig` 저장 구조.
- `tuning.poseOffsets` 저장 구조.
- Runtime.
- Stage/HUD.
- 기존 W/H percent 의미.
- 기존 Transform drag 동작.
- 기존 resize limit 값.
- Effect 기본 크기 기준.
- Master/control group의 기존 scale 의미.

## 아직 남아있는 예외 처리

- Group Pose는 아직 `w/h`가 아니라 `scale` 중심이다.
- Master part는 일반 part와 다른 offset 기반 size 규칙을 유지하지만 helper 이름으로 분리됐다.
- Effect size base는 effect 기본 크기 기준을 그대로 사용한다.
- Scrub의 rotation 입력 파싱은 `property_numeric_input_helper.js`로 이동했다.
- Canvas handle resize와 Background 계열 QA는 아직 필요하다.

## 검증 방법 및 결과

- `npm run check`: 통과.
- `git diff --check`: 통과.
- HTTP 200 확인: 통과.
  - `/setting.html`
  - `/docs/sprint-dashboard.html`
  - `/docs/99_CURRENT_SPRINT.md`
  - `/docs/qa/common-final/results.json`
- project-default-state fallback 확인: 통과.
  - 요청 파일: `/runtime/project-default-state.json`.
  - 요청 위치: `src/project_storage_helper.js`.
  - 이 파일은 optional seed 파일이다.
  - 파일이 없으면 `normalizeSavedState(null)` fallback으로 기본 scene/session/tuning을 만든다.
  - 404는 의도된 optional fallback 경로라 QA 실패로 세지 않는다.
  - Screenshot: `docs/qa/project-default-state-fallback.png`.
- Playwright headless 자동 QA: 통과.
  - 조건: `setting.html` 로드 후 설정 패널을 실제로 열고 QA.
  - 결과 파일: `docs/qa/common-final/results.json`.
  - Screenshot dir: `docs/qa/common-final/`.
  - PASS: Setup Part W stepper `W100% -> W101%`.
  - PASS: Setup Part W scrub drag `W101% -> W137%`.
  - PASS: Setup Control Group W stepper `W100% -> W101%`.
  - PASS: Setup Control Group W scrub drag `W101% -> W137%`.
  - PASS: Action Pose W stepper `W100% -> W101%`.
  - PASS: Action Pose W scrub drag `W100% -> W136%`.
  - PASS: Action InteractionObject W stepper `W100% -> W101%`.
  - PASS: Effect W stepper `W100% -> W101%`.
  - PASS: Effect W scrub drag `W101% -> W137%`.
  - PASS: Effect 표시 형식 `rot=R0x +0°`, `opacity=O보임`, `active=ON꺼짐`.
  - PASS: Action timeline keyframe 생성 `2 -> 3`.
  - PASS: Effect timeline keyframe 생성 `2 -> 3`.
  - PASS: Timeline playback rate clamp `pose=4`, `effect=4`.
  - PASS: unexpected network failure 없음.
  - PASS: page runtime error 없음.

### QA 중 확인한 자동화 조건

- Headless 기본 상태에서는 설정 패널이 닫혀 있어 scrub 대상 DOM이 화면 밖에 있다.
- Scrub drag QA는 반드시 `#settingsToggle`로 패널을 연 뒤 실행해야 한다.
- Timeline keyframe 선택은 `click`이 아니라 `pointerdown` 흐름을 사용한다.
- Action field QA는 먼저 첫 프레임 keyframe을 실제 pointer 이벤트로 선택해야 한다.
- 위 조건을 맞춘 뒤 Action W/H stepper와 scrub drag가 통과했다.

### Action stepper 사용자 보고 재확인

- 사용자 보고:
  - Setup과 Effect stepper는 정상.
  - Action stepper는 실제 화면에서 동작하지 않는 것으로 보임.
- 재확인 결과:
  - 기존 QA는 일부 구간에서 DOM `click()`을 사용했으므로 실제 사용자 클릭 검증으로는 부족했다.
  - Playwright 실제 pointer 클릭으로 다시 확인했다.
  - `attack1 / weapon / first frame`에서 Action W stepper는 `W100% -> W101%`로 변경됐다.
  - `attack1 / attackInteractionObject / first frame`도 `W100% -> W101%`로 변경됐다.
  - `idle / weapon / first frame`도 `W100% -> W101%`로 변경됐다.
  - 중간 keyframe을 새로 만든 뒤 `weapon` W stepper도 `W100% -> W101%`로 변경됐다.
  - Action 전체 prop stepper 확인:
    - PASS: `ax`, `ay`, `x`, `y`, `w`, `h`, `rot`, `active`.
    - NOTE: `opacity`는 이미 `1`이라 위 stepper를 눌러도 표시가 `O보임`으로 유지된다. 값이 max라서 표시 변화가 없는 정상 케이스다.
- 현재 판단:
  - Action도 stepper UI 자체는 `property_scrub_helper.js` 공통 경로를 탄다.
  - Action writer는 Setup/Effect와 달리 `timeline_pose_controller.js -> timeline_pose_adapter.js -> tuning.poseOffsets` 경로를 탄다.
  - 사용자 재연결 후 기존 QA가 맞았던 것으로 확인됐다.
  - Action stepper 항목은 다시 완료 처리한다.

### Action W/H 100% 왕복 흔들림 코드 확인

- 사용자 보고:
  - Action W/H가 100%인데 다른 keyframe을 눌렀다 돌아오면 99% 또는 101%처럼 보이는 경우가 있다.
- 코드 확인:
  - Action Pose W/H 저장값은 `tuning.poseOffsets[poseKey][partKey][frameId].w/h`에 raw offset으로 저장된다.
  - 100%의 raw offset은 일반 Part 기준 `0`이다.
  - 표시값 read helper:
    - `timeline_pose_controller.js`
    - `readPoseFrameDisplayValue()`
    - `property_value_helper.js`
    - `posePartSizeBase()`
    - `sizeOffsetToPercent()`
  - 입력값 write helper:
    - `timeline_pose_controller.js`
    - `poseFrameValueFromInput()`
    - `property_value_helper.js`
    - `posePartSizeBase()`
    - `sizeOffsetFromPercent()`
  - keyframe 재선택 read helper:
    - `timeline_pose_adapter.js`
    - `currentPoseTimelineFrame()`
    - `timeline_frame_reader.js`
    - 다시 `readPoseFrameDisplayValue()`를 통과한다.
- 판단:
  - 저장과 표시는 같은 base helper인 `posePartSizeBase()`를 사용한다.
  - 수식상 100%는 raw offset `0`으로 왕복해야 한다.
  - 99%/101%가 보인다면 현재 코드 기준으로는 별도 표시 helper 불일치보다, 실제로 이전 stepper/drag 입력이 raw offset을 `0`이 아닌 ±1% 값으로 만든 상태일 가능성이 더 크다.
  - 자동 QA는 중단했다. 사용자가 서버 재연결 후 기존 QA가 맞았다고 확인했기 때문이다.
  - 임시 Playwright spec과 중단된 QA 스크린샷은 제거했다.

### Canvas resize 사용자 QA 완료

- 사용자 QA 결과:
  - Setup Canvas resize가 정상 작동하는 것으로 확인됐다.
  - Action Canvas resize가 정상 작동하는 것으로 확인됐다.
  - W/H 값과 Canvas handle resize 기준이 사용자 화면에서 어긋나지 않는 것으로 확인됐다.
- 문서 반영:
  - Dashboard의 남은 QA에서 Canvas resize 항목을 제거했다.
  - Canvas resize는 검증 완료 항목으로 이동했다.

### 공통화 코드 점검

- 점검 범위:
  - `property_value_helper.js`
  - `transform_value_helper.js`
  - `editable_property_helper.js`
  - `property_field_groups.js`
  - `property_scrub_helper.js`
  - `timeline_controller.js`
  - `timeline_engine.js`
  - `timeline_pose_controller.js`
  - `timeline_effect_controller.js`
  - `timeline_pose_adapter.js`
  - `timeline_effect_adapter.js`
  - `transform_drag_apply_helper.js`
  - `background_panel_controller.js`
  - `background_panel_view.js`
  - `group_transform_adapter.js`
  - `part_source_registry.js`
- 확인 결과:
  - Setup / Action / Effect의 W/H percent 변환은 `property_value_helper.js` 중심으로 모였다.
  - Transform resize도 `transform_value_helper.js`에서 같은 size base helper를 읽는다.
  - Property field 그룹은 `property_field_groups.js`에서 Setup / Action / Effect 공통 생성 흐름을 탄다.
  - Property scrub 표시/stepper/drag는 `property_scrub_helper.js` 공통 흐름을 탄다.
  - Timeline은 `timeline_controller.js`와 `timeline_engine.js`를 중심으로 Action / Effect가 같은 command, selection, drag, preview, playback 구조를 공유한다.
  - InteractionObject는 `part_source_registry.js`의 part source에 포함되어 Setup / Action property와 transform 흐름을 공유한다.
- 남은 전용 구현:
  - Background 숫자 UI는 format/clamp helper는 공유하지만, pointer drag/stepper/input 이벤트 흐름은 `background_panel_controller.js`에 전용으로 남아 있다.
  - Group Edit는 `group_transform_adapter.js`에 전용 차이를 모으는 방향으로 전환했다.
  - Stage/HUD는 계획대로 Common Editing 밖에 남아 있다.
  - `scene_session_data.js`와 `stageRulesState.js`에는 data normalize용 local clamp/fallback이 남아 있다. Editor UX 공통화 대상은 아니지만, 이름/역할 정리는 추후 후보다.
- 주의:
  - `sizeValueToPercent(value, baseValue)`는 `value || baseValue` fallback을 사용한다.
  - 현재 min 제한 때문에 일반 편집에서는 문제가 되지 않지만, raw `0` size를 의미 있는 값으로 허용할 경우 100%로 표시될 수 있다.
  - 지금 Sprint에서는 동작 변경 없이 점검만 했다.

### Group Edit 표시값 마무리

- 사용자 보고:
  - Group Edit은 Action에서만 동작한다.
  - Group 선택 중 Property 숫자가 바뀌지 않는 것처럼 보인다.
- 변경 파일:
  - `src/transform_drag_apply_helper.js`
  - `src/transform_drag_helper.js`
  - `src/transform_editor_controller.js`
- 추가 변경:
  - `src/group_transform_adapter.js` 추가.
  - `src/group_pose_editor.js` 제거.
  - `src/part_editor_controller.js`가 Group Property 입력을 `group_transform_adapter.js`로 위임하게 변경.
- 변경 내용:
  - Group Property X/Y 입력이 `applyCurrentGroupMove()`를 통해 이동을 적용할 때 `groupEditValues`가 없어도 안전하게 동작하도록 정리.
  - Canvas Group drag 종료 시 `x/y/rot/scale` 표시값을 즉시 0/100으로 되돌리던 리셋을 제거.
  - Group 선택이 유지되는 동안 방금 적용한 move/rotate/scale 값이 Property에 남아 보이도록 변경.
  - Group 전용 move/rotate/scale/opacity 분배 계산을 `group_transform_adapter.js`로 이동.
  - `transform_drag_apply_helper.js`는 Group drag를 감지하면 Adapter로 넘기고, 일반 Part drag 계산만 유지.
  - `part_editor_controller.js`는 Group Property 값을 직접 계산하지 않고 Adapter의 `applyGroupTransformPropertyValue()`를 사용.
  - Group drag 시작 시 `x/y/rot/scale`을 즉시 0/100으로 리셋하지 않게 변경.
  - Group handle에서 별도 W/H axis handle을 제거하고 `S` scale handle만 남김.
- 변경된 흐름:
  - 여러 파츠 선택
  - `group_edit_state.js`가 Group 선택 상태 보관
  - `group_transform_adapter.js`가 Temporary Transform Target처럼 X/Y/R/S/O 입력을 해석
  - 공통 Transform drag 진입점이 Group이면 Adapter에 위임
  - Adapter가 각 선택 Part의 pose offset에 결과를 분배
- 유지한 구조:
  - Group은 저장 객체가 아니라 여러 pose part에 값을 분배하는 임시 편집 도구다.
  - Group 선택/키프레임 변경 시 group edit 값은 기존처럼 리셋된다.
  - Stage/HUD/Background는 건드리지 않았다.
- 남은 예외:
  - Group Edit은 여전히 Action 전용이다.
  - Group의 결과 분배는 각 Part pose offset에 나눠 쓰는 특수 동작이라 Adapter 경계에 남긴다.
- 검증:
  - `npm run check`: 통과.
  - `git diff --check`: 통과.
  - `src` 안에 `group_pose_editor.js` import가 남지 않았음을 확인.
  - Headless Playwright Group Edit 자동 QA: 통과.
  - QA 결과: `docs/qa/group-edit-auto/results.json`.
  - 스크린샷:
    - `docs/qa/group-edit-auto/03-group-before-stepper.png`
    - `docs/qa/group-edit-auto/04-group-after-stepper.png`
    - `docs/qa/group-edit-auto/09-canvas-move-attempt-offset1.png`
    - `docs/qa/group-edit-auto/12-canvas-rotate-attempt.png`
    - `docs/qa/group-edit-auto/13-canvas-scale-attempt.png`
  - 확인 항목:
    - Action 첫프레임에서 `upperArmR + lowerArmR` 다중 선택 시 `선택 그룹 2` 표시.
    - Group Property가 `X/Y/S/R/O`로 표시되고 `W/H`는 표시되지 않음.
    - Stepper 입력: `X 0 -> 1`, `S 100% -> 101%`, `R 0x +0° -> 0x +1°`, `O 보임 -> 숨김`.
    - Canvas move handle drag: `X/Y 0/0 -> 45/20`.
    - Canvas rotate handle drag: `R 0x +0° -> 0x +39.4°`.
    - Canvas scale handle drag: `S 100% -> 179.7%`.
    - 선택 그룹은 조작 후에도 유지됨.
  - `/runtime/project-default-state.json` 404는 optional fallback으로 확인된 기존 항목이라 실패로 세지 않음.

## 알려진 위험 요소

- 이번 자동 QA는 Property scrub/stepper, Timeline UI, Group Edit Property/Canvas handle 중심이다.
- Action W/H 99%/101% 흔들림은 코드상 helper 불일치로는 확인되지 않았다. 재현 시 raw offset 값을 함께 봐야 한다.
- Group Edit 자동 QA는 통과했다. 사용자 화면 최종 눈검사는 커밋 전 선택 확인 항목이다.
- Background compact input, speed 표시, run motion link 값은 아직 이번 배치에서 직접 QA하지 않았다.
- Background/control/run motion의 min/max 제한과 fallback은 아직 이번 배치에서 직접 QA하지 않았다.
- `/runtime/project-default-state.json` 404는 optional seed fallback으로 확인됐다. QA 실패로 세지 않는다.
- 커밋은 아직 하지 않았다.

## 다음 작업 추천

1. 필요 시 Group Edit 사용자 눈검사.
2. 이번 공통화 묶음을 커밋 후보로 검토.
3. Background / Stage / HUD는 이후 별도 Sprint까지 보류.

## Sprint 진행상황

- 현재 추정: 99%.
- 구현 공통화는 Property / Transform value / Numeric / Clamp / Timeline drag / Timeline playback / Timeline controller glue 주변까지 진행.
- Headless 자동 QA에서 Setup / Action / Effect W stepper와 scrub drag가 통과했다.
- Headless 자동 QA에서 Action / Effect timeline keyframe 생성이 통과했다.
- 사용자 QA에서 Setup / Action Canvas resize가 통과했다.
- `project-default-state.json` 404는 optional fallback으로 확인되어 QA 실패 항목에서 제외했다.
- Group Edit 자동 QA가 통과했다.
- 남은 비중은 커밋 후보 검토와 필요 시 사용자 최종 눈검사다.
- Sprint 완료 기준은 Dashboard에 별도 카드로 표시했다.

## 리팩토링 후보

- `property_value_helper.js`
  - Property 입력값 변환 중심.
  - Transform 저장값 변환과 더 공유할 여지가 있다.

- `transform_value_helper.js`
  - Canvas/Transform drag 저장값 변환 중심.
  - 실제 drag 동작에 직접 닿으므로 작은 단위로만 정리한다.

- `property_scrub_helper.js`
  - Rotation 입력 파싱은 분리됐고, scrub interaction은 아직 파일 내부 책임이다.
  - 다른 입력 UI와 공유할 실제 필요가 생기면 작은 helper로 분리한다.

- `timeline_pose_controller.js` / `timeline_effect_controller.js`
  - keyframe drag 생성은 공통화됐다.
  - common API 구성과 clipboard command 연결도 공통화됐다.
  - Settings/render/field refresh는 실제 Action/Effect 차이가 커서 이번 Sprint에서는 유지한다.

## 파일 크기 또는 구조상 주의할 점

- 이번 작업은 큰 파일에 새 책임을 넣지 않았다.
- `property_value_helper.js`와 `transform_value_helper.js`는 저장값에 가까운 파일이므로 앞으로 수정 시 QA 부담이 크다.
- Dashboard 상단은 최신 작업 보고용이다. 누적 히스토리를 쌓지 않는다.
- Dashboard 하단은 현재 진행 중인 Sprint의 큰 목표와 남은 작업을 보여준다.
