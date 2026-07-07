# CURRENT TASK REPORT

## 0. Latest Task: 고정 수식 Runtime 적용 순서 수정

- 이번에 한 일
  - `고정` Formula 데이터와 Runtime 적용 경로를 확인했다.
  - `src/action_trigger_engine.js`에서 고정 적용이 Velocity 미러 계산보다 먼저 실행되도록 순서를 수정했다.
  - Blend 중에도 고정 수식이 적용되도록 `customActionBlend` 처리 구간에 view lock 적용을 추가했다.

- 발견한 원인
  - `고정` Formula 자체는 저장/조회되고 있었지만, Runtime에서 속도 계산 이후에 적용되고 있었다.
  - Blend 중에는 `advanceCustomActionRuntime()`이 바로 return해서 고정 적용 경로를 우회했다.

- QA
  - `npm run check` 완료
  - `git diff --check` 완료
  - 브라우저에서 고정 ON 구간 동안 방향이 유지되는지 수동 확인 필요

---

## 0. Latest Task: 대기 Action 속도 수식 OFF 유지 수정

- 이번에 한 일
  - 대기 Action에서 `속도` 수식을 꺼도 다시 켜지는 원인을 확인했다.
  - `src/action_modifier_panel_controller.js`에서 `속도` Formula를 OFF로 토글할 때 같은 Action의 legacy `modifiers.action[actionKey]` velocity도 함께 비활성화하도록 수정했다.

- 발견한 원인
  - 예전 Modifier 구조의 `modifiers.action.idle`에 `velocity enabled=true`가 남아 있었다.
  - Formula 패널 렌더/갱신 시 legacy velocity modifier가 다시 `formulas[]`의 `속도`로 migration되어 OFF 상태가 되살아났다.

- QA
  - `npm run check` 완료
  - `git diff --check` 완료
  - 브라우저에서 대기 Action의 `속도`를 끈 뒤 다시 켜지지 않는지 수동 확인 필요

---

## 0. Latest Task: Action Timeline 버튼 줄 정리

- 이번에 한 일
  - 보간 / 캔슬이 Formula Card로 이동했으므로 Action Timeline 상단 버튼 줄에서 기존 `actionBlend` / `actionCancel` 버튼을 제거했다.
  - Action Timeline `...` 메뉴 안에 있던 `새 키프레임` / `키프레임 삭제`를 상단 줄의 아이콘 버튼으로 이동했다.
  - Action Timeline `...` 메뉴는 더 이상 남은 항목이 없어 제거했다.

- 유지한 동작
  - 키프레임 추가 / 삭제는 기존 `actionAddKeyframe` / `actionDeleteKeyframe` id와 기존 binding을 그대로 사용한다.
  - 보간 / 캔슬 Runtime 동작은 Formula Card 쪽 `보간` / `캔슬` 수식이 담당한다.

- QA
  - `npm run check` 완료
  - `git diff --check` 완료
  - 브라우저에서 Action 버튼 줄 배치와 키프레임 추가 / 삭제 아이콘 수동 확인 필요

---

## 0. Latest Task: Mini Timeline 클릭 구간 편집 공통화

- 이번에 한 일
  - 공통 `renderMiniTimelineRange()`에 클릭 편집 옵션을 추가했다.
  - 미니 타임라인의 클릭 frame과 `startFrame` / `endFrame` 중 더 가까운 경계가 클릭한 위치로 즉시 이동한다.
  - Formula 카드와 기존 Modifier 카드가 같은 공통 미니 타임라인 클릭 로직을 사용한다.

- 동작 방식
  - 클릭 위치가 start에 가까우면 `startFrame`이 이동한다.
  - 클릭 위치가 end에 가까우면 `endFrame`이 이동한다.
  - start/end가 서로 넘어가지 않도록 범위를 clamp한다.

- QA
  - `npm run check` 완료
  - `git diff --check` 완료
  - 브라우저에서 속도 / 고정 / 보간 / 캔슬 / 연계 카드의 미니 타임라인 클릭 편집 수동 확인 필요

---

## 0. Latest Task: 배경 레이어 순서 새로고침 초기화 수정

- 이번에 한 일
  - 배경 레이어 위/아래 버튼으로 바꾼 순서가 브라우저 새로고침 때 PSD manifest 순서로 초기화되는 원인을 확인했다.
  - `src/psd_background_helper.js`에서 기존 저장 레이어가 있을 때는 저장된 `background.psdLayers` 순서를 보존하도록 수정했다.
  - 새 PSD 업로드 또는 최초 PSD import처럼 저장 레이어가 없는 경우에만 manifest 순서를 사용한다.

- 발견한 원인
  - PSD manifest를 다시 읽을 때 항상 `useManifestOrder: true`로 merge했다.
  - 그래서 저장된 `order` 값과 사용자가 바꾼 배열 순서가 있어도 새로고침 시 manifest order가 다시 Source of Truth처럼 덮어썼다.

- QA
  - `npm run check` 완료
  - `git diff --check` 완료
  - 브라우저에서 레이어 순서 변경 후 새로고침해도 순서가 유지되는지 수동 확인 필요

---

## 0. Latest Task: Runtime Rules Formula Card 분리

- 실행 규칙 묶음 제거 여부
  - Action 탭의 별도 `실행 규칙` 묶음 카드 렌더를 제거했다.
  - View Lock / Blend / Cancel / Link는 수식 라이브러리에서 각각 독립 Formula Card로 추가한다.
  - UI 용어는 `고정`, `보간`, `캔슬`, `연계`로 정리했다.

- formulas[] 저장 구조
  - Action 수식 저장 위치를 `tuning.actionSettings[actionKey].formulas[]`로 통일했다.
  - Formula 공통 필드는 `type`, `enabled`, `startFrame`, `endFrame`이다.
  - `속도`는 `x`, `y`, `mode`, `보간`은 `frames`, `캔슬`은 `priority`, `연계`는 `fromActions`를 가진다.

- runtimeRules migration
  - 기존 `runtimeRules`는 UI에 직접 표시하지 않는다.
  - normalize / runtime helper에서 legacy `runtimeRules`와 `blendFrames`, `interruptible`, `interruptPriority`를 Formula source로 변환한다.
  - 기존 action velocity modifier는 `formulas[]`의 `type: "velocity"`로 migration한다.

- 각 수식 카드 UI
  - `속도`, `고정`, `보간`, `캔슬`, `연계`가 수식 라이브러리 pill로 보인다.
  - 클릭하면 속도 카드와 같은 카드 폭 / 간격 / Mini Timeline 스타일의 독립 Formula Card가 추가된다.
  - Formula Card 내부의 `사용` 체크는 제거했다. 사용 여부는 수식 라이브러리 pill ON/OFF 하나로만 결정한다.
  - `px/f` 단위는 속도 카드의 X/Y Velocity에만 표시한다.
  - Formula별 구현은 `src/formulas/*_formula.js`로 분리했다.
  - 공통 등록 / Editor / Runtime은 `formula_registry.js`, `formula_editor_engine.js`, `formula_runtime_engine.js`가 담당한다.

- 재사용한 공통 시스템
  - `renderMiniTimelineRange()`
  - Action group / Action option helper
  - 기존 modifier card CSS

- 남은 QA
  - 브라우저에서 수식 라이브러리에 `속도 / 고정 / 보간 / 캔슬 / 연계`만 보이는지 확인해야 한다.
  - 저장 후 reload해도 `formulas[]`가 유지되는지 확인해야 한다.

- QA
  - `npm run check` 완료
  - `git diff --check` 완료

---

## 0. Latest Task: Trigger Link Rule 설계

- Link Rule 개념
  - Trigger는 "무슨 키를 눌렀는가"만 담당한다.
  - Link Rule은 "지금 어떤 Action 중이고, 현재 frame이 연결 허용 구간인가"를 담당한다.
  - Trigger 자체를 `QQ`, `QQQ`로 늘리지 않고, 같은 Trigger를 가진 다음 Action이 이전 Action의 특정 구간에서만 실행되게 만든다.

- 저장 구조
  - 저장 위치는 `tuning.actionSettings[actionKey].runtimeRules.link`다.
  - 기본 shape는 `{ enabled, fromActions, startFrame, endFrame, consumeTrigger }`다.
  - Timeline keyframe이나 `actionOffsets`에는 저장하지 않는다.

- Trigger와 Link의 차이
  - Trigger: 입력 조건이다. 예: `Q`, `Space`.
  - Link: 실행 조건이다. 예: `attack1`의 6~12 frame 안에서만 `attack2` 실행.
  - 기존 sequence trigger는 compatibility로 유지하고 이번 설계에서 제거하지 않는다.

- 공격 2타 / 3타 적용 예
  - `attack1`: Trigger `Q`, Link OFF.
  - `attack2`: Trigger `Q`, Link from `attack1` frame 6~12.
  - `attack3`: Trigger `Q`, Link from `attack2` frame 6~12.

- 공중점프 적용 예
  - `doubleJump`: Trigger `Space`, Link from `jump` / `fall`.
  - Runtime은 `doubleJump`라는 이름을 특별 취급하지 않고 Link source Action과 frame만 검사한다.

- 구현 전 위험 요소
  - 같은 Trigger를 공유하는 Action 후보가 여러 개일 때 유효한 Link 후보를 일반 Trigger 후보보다 먼저 평가해야 한다.
  - Link window와 Cancel window의 관계를 구현 전에 확정해야 한다.
  - Link 실패 이유를 Debug HUD에 남길 경우 새 로그 남발 없이 기존 debug event 경로를 재사용해야 한다.

- QA
  - 문서 설계 Task라 브라우저 Runtime QA는 수행하지 않았다.
  - `npm run check` 완료
  - `git diff --check` 완료

---

## 0. Latest Task: Action Runtime Rules Mini Timeline MVP

- Runtime Rules 저장 구조
  - `actionSettings[actionKey].runtimeRules`를 추가했다.
  - `viewLock`, `cancel`, `blend`는 각각 `enabled`, `startFrame`, `endFrame`을 가진다.
  - `cancel.priority`, `blend.frames`를 추가로 저장한다.

- Mini Timeline 공통화 방식
  - 새 Timeline engine을 만들지 않았다.
  - 기존 `renderMiniTimelineRange()`와 modifier mini timeline CSS를 재사용해 Action “실행 규칙” 카드에 표시했다.

- View Lock 동작
  - Action 시작 시점 facing을 저장한다.
  - View Lock 구간 안에서는 저장된 facing으로 되돌려 방향을 유지한다.

- Cancel window 동작
  - Runtime interrupt 판정이 `runtimeRules.cancel` 구간을 우선 본다.
  - 구간 밖에서는 다른 Action으로 전환되지 않는다.
  - 기존 `interruptible` / `interruptPriority`는 runtimeRules가 없을 때 fallback source로 유지한다.

- Blend window 동작
  - target Action의 `runtimeRules.blend`가 있으면 legacy `blendFrames`보다 우선한다.
  - MVP에서는 시작 구간 rule로만 적용하며, disabled면 legacy blend가 다시 살아나지 않게 막았다.

- QA
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: Interaction role 선택 그리드 제거

- 기존 문제가 무엇이었는지
  - Interaction box는 이미 `attackInteractionObject`, `hurtInteractionObject`처럼 role이 정해져 있다.
  - 그런데 Action Interaction 카드 안에서 충돌/피격/공격/방어 role을 다시 선택하게 해서 공간을 낭비했다.

- 수정 내용
  - `src/interaction_editor_engine.js`: `fixedRole`이 있는 Interaction 카드에서는 네 role 선택 그리드를 렌더하지 않는다.
  - 대신 해당 role의 `사용` 체크 하나와 세부 설정만 보여준다.
  - Setup처럼 `showRoleToggles: false`를 넘기는 경로는 기존처럼 role 선택/사용 체크 없이 기본값 설정만 표시한다.

- QA
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: Background 반복 타일 틈 보정

- 기존 문제가 무엇이었는지
  - PSD background ground처럼 반복되는 이미지를 이어 그릴 때 타일 경계에 얇은 세로 틈이 보였다.
  - Canvas draw 좌표/스케일 반올림과 이미지 샘플링 때문에 인접 타일 사이에 1px seam이 드러날 수 있었다.

- 수정 내용
  - `src/background_renderer.js`: 반복 타일을 그릴 때 오른쪽으로 `1px` 겹쳐 그리는 공통 보정값을 추가했다.
  - PSD clip layer 반복과 일반 parallax layer 반복에 같은 보정을 적용했다.
  - PSD clip layer 반복 source는 alpha `128` 초과 영역으로 잡아 반투명 가장자리 컬럼이 반복 경계에 들어가지 않게 했다.

- QA
  - `npm run check` 통과
  - `git diff --check` 통과
  - 브라우저 수동 QA는 남음: 반복 경계 seam이 실제 화면에서 사라졌는지 확인

---

## 0. Latest Task: PSD Background Stage 목록 순서 보정

- 기존 문제가 무엇이었는지
  - Stage 목록이 `psdLayers` 저장/draw 순서를 그대로 보여줘서 `하늘`처럼 아래에 깔리는 레이어가 1번으로 보였다.
  - 사용자가 기대한 규칙은 Photoshop 레이어 패널처럼 “목록 위 = 화면 위”다.

- 수정 내용
  - `tools/psd_preview_exporter.py`: manifest는 renderer가 바로 사용할 수 있는 `draw-bottom-to-top` 순서로 저장한다.
  - `src/background_renderer.js`: PSD layer 배열을 뒤집지 않고 저장된 draw order 그대로 그린다.
  - `src/background_panel_controller.js`: Stage 목록만 `psdLayers`를 반대로 렌더해 Photoshop 패널 위→아래 순서로 보여준다.
  - 위/아래 버튼도 보이는 Stage 목록 기준으로 동작하고, 저장할 때는 다시 draw order로 변환한다.
  - `runtime/background-preview.json`과 `runtime/background-layers/*.webp`를 현재 exporter로 다시 생성했다.

- 순서 확인
  - 저장/draw 순서: `하늘 → 팔 → ... → 앞풀3 → 앞풀2 → 앞풀1`
  - Stage 목록 순서: `앞풀1 → 앞풀2 → 앞풀3 → ... → 팔 → 하늘`
  - 즉 renderer는 아래 레이어부터 그리고, 사용자는 Photoshop처럼 위에 보이는 레이어를 목록 위에서 본다.

- PSD 원본 확인
  - `assets/backgrounds/background_01.psd`
  - `52907173 bytes`
  - SHA256 `bf19cdcca1f550ae4197b7d4e9e2bfc2f3625077b4cfbd3681e21ca0e4d27479`

- QA
  - 실제 PSD export 재생성 통과
  - Stage 목록 첫 항목 재현 확인: `앞풀1`
  - renderer draw 첫 항목 재현 확인: `하늘`
  - 위/아래 버튼 visible order 변환 재현 확인
  - manifest 최대 WebP 긴 변 `2048`
  - `python3 -m py_compile tools/psd_preview_exporter.py` 통과
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: PSD Background 목록/렌더 순서 분리

- 기존 문제가 무엇이었는지
  - renderer가 그리는 순서를 그대로 목록에 보여주면서, 위에 그려지는 layer가 목록 아래쪽에 배치됐다.
  - 사용자가 기대하는 일반 규칙은 Photoshop처럼 “목록 위 = 화면 위”다.

- 수정 내용
  - `tools/psd_preview_exporter.py`: import manifest는 panel order, 즉 사람이 보는 위→아래 순서로 만든다.
  - `src/background_renderer.js`: renderer는 draw 직전에만 배열을 reverse해서 아래→위 순서로 그린다.
  - 저장/편집 목록과 실제 draw 순서를 역할에 맞게 분리했다.

- 실제 export 확인
  - panel order: `앞풀1 → ... → 하늘`
  - draw order: `하늘 → ... → 앞풀1`
  - WebP layer 긴 변 최대값: `2048`

- PSD 원본 확인
  - `assets/backgrounds/background_01.psd`
  - `52907173 bytes`
  - SHA256 `bf19cdcca1f550ae4197b7d4e9e2bfc2f3625077b4cfbd3681e21ca0e4d27479`

- QA
  - `.venv/bin/python` 실제 PSD 임시 export 확인 통과
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: Interaction Box role 자동 표시 + Hurt 활성 조건 정리

- role 자동 펼침 수정 내용
  - Action Interaction 카드가 `interactionObjectRole(targetKey)`를 `fixedRole`로 넘기게 했다.
  - 이제 `attackInteractionObject`를 클릭하면 공격 설정, `hurtInteractionObject`를 클릭하면 피격 설정이 바로 열린다.
  - Setup은 기존처럼 `fixedRole`을 사용하므로 같은 공통 `renderInteractionEditor()` 흐름을 유지한다.

- 피격박스 Runtime 활성 조건
  - 기존 `createHurtInteractionRegions()`는 active/hurt 여부를 보지 않고 항상 Hurt region을 만들었다.
  - 수정 후 현재 Action에 `actionSettings[actionKey].interactions.hurtInteractionObject`가 있으면 `active + hurt`가 켜진 경우에만 Hurt region을 만든다.
  - 해당 Action에 hurt 설정이 아예 없으면 Setup fallback `tuning.rig.hurtInteractionObject`를 사용한다.

- 상시 작동 여부 결론
  - Action-level interaction 설정이 없는 Action에서 Setup Hurt fallback이 상시 작동하는 것은 허용한다.
  - Action-level hurt 설정이 존재하는데 OFF인 상태에서도 Hurt region이 생기는 것은 현재 설계 기준 버그였고 수정했다.

- 수정 내용
  - `src/action_interaction_panel_controller.js`: box key 기반 `fixedRole` 전달.
  - `src/interaction_region_engine.js`: Hurt / Collision region 생성 전에 Action-level active+role 조건 검사.
  - `docs/11_DATA_MODEL.md`, `docs/12_EDITOR_FLOW.md`, `docs/13_ACTION_MODEL.md`: Runtime 우선순위와 role 자동 표시 설명 갱신.

- 브라우저 QA 결과
  - 미실행. 코드 경로와 자동 검사만 확인했다.

- QA
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: Interaction Editor 독립 공통 기능화

- 기존 문제가 무엇이었는지
  - Action 탭의 Interaction 설정이 `actionTimeline.writeFrameValue()`를 통해 현재 Timeline frame/keyframe selection에 저장되고 있었다.
  - 그래서 Interaction box를 클릭해도 “현재 Action에서 이 box를 쓴다”가 아니라 “현재 frame에 override를 쓴다”는 의미로 동작했다.

- Interaction editor 공통화 방식
  - Setup과 Action 모두 기존 `interaction_editor_engine.renderInteractionEditor()` UI/CSS를 그대로 사용한다.
  - Action 전용 새 UI를 만들지 않고 `action_interaction_panel_controller.js`의 source/write target만 Action-level setting으로 바꿨다.
  - `property_panel_controller.js`는 InteractionObject가 선택되면 Timeline frame 선택 여부와 무관하게 Action Interaction 카드를 렌더한다.

- Setup 저장 target
  - `tuning.rig[interactionObjectKey]`
  - 카드 title: `상호작용 기본값`

- Action 저장 target
  - `tuning.actionSettings[actionKey].interactions[interactionObjectKey]`
  - 카드 title: `상호작용`
  - 예: Attack ON → `actionSettings[actionKey].interactions.attackInteractionObject.active = 1`, `attack = 1`

- Runtime 우선순위
  - `Action frame override(active + role ON)`
  - `→ actionSettings[actionKey].interactions[interactionObjectKey]`
  - `→ tuning.rig[interactionObjectKey]`

- 브라우저 수동 QA 결과
  - 미실행. 코드 경로와 자동 검사만 확인했다.

- QA
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: PSD Background draw order 실제 보정

- 왜 PSD와 게임 화면 순서가 계속 안 맞았는지
  - exporter는 PSD에서 읽은 순서대로 `하늘 → ... → 앞풀1`을 만들고 있었다.
  - 그런데 `background_renderer.js`가 role별 PSD layer 배열을 다시 `reverse()`해서 그렸다.
  - 그 결과 아래에 깔려야 하는 레이어가 나중에 그려져 위를 덮을 수 있었고, 사용자가 에디터에서 순서를 수동으로 뒤집어야 했다.

- 수정 내용
  - `src/background_renderer.js`에서 PSD layer draw 직전 `reverse()`를 제거했다.
  - 이제 `background.psdLayers` 순서가 곧 draw 순서다.
  - 현재 exporter 순서 기준으로 `하늘`이 먼저 깔리고 `앞풀`이 마지막에 위에 그려진다.

- QA
  - 남은 수동 QA: 브라우저에서 PSD 재import 후 화면이 Photoshop에서 보이는 결과와 같은지 확인.
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: PSD Background layer order 원본 순서 고정

- 실제로 순서가 뒤집힌 지점
  - `tools/psd_preview_exporter.py`의 `visual_order_layers()`가 `flatten_layers(psd)` 결과를 `reversed(...)`로 뒤집고 있었다.
  - 그래서 PSD에서 읽힌 순서를 그대로 쓰지 않고, 아래쪽 레이어를 import 목록 위로 올리는 결과가 났다.
  - 이전 보고의 “PSD 시각 순서” 해석이 잘못이었다. 이번 수정 기준은 “PSD exporter가 읽은 순서 = import 순서”다.

- 수정한 파일
  - `tools/psd_preview_exporter.py`: `visual_order_layers()` 제거, `export_psd_layers()`가 `flatten_layers(psd)` 순서를 그대로 사용하게 수정.
  - `src/scene_session_data.js`: 기존 작업의 `useManifestOrder` 옵션 유지.
  - `src/psd_background_helper.js`: PSD import / refresh 경로에서 manifest 순서를 그대로 적용하는 흐름 유지.

- 새 import QA 결과
  - 실제 `background_01.psd` 임시 export manifest 순서: `하늘 → 팔 → 뒷몸 → 중간몸 → 앞몸 → 작은건물 → 뒷산 → 앞산 → 구름 → 나무3 → 나무2 → 나무1 → 풀3 → 풀2 → 풀1 → 땅 → 앞풀3 → 앞풀2 → 앞풀1`.
  - 기존 saved order를 일부러 반대로 넣어도 import merge 결과가 위 manifest 순서 그대로 `order=0..18`이 됨을 Node 재현으로 확인했다.
  - 임시 export WebP layer는 모두 긴 변 2048px 이하로 유지됐다.

- 저장/불러오기 QA 결과
  - 저장된 프로젝트를 단순 normalize/load할 때는 기존 `psdLayers.order`를 그대로 보존한다.
  - 새 PSD import / refresh 경로에서만 manifest 순서를 적용한다.
  - 브라우저 저장/불러오기 수동 QA는 미실행.

- QA
  - `.venv/bin/python` 실제 PSD 임시 export 확인 통과
  - Node merge 재현 확인 통과
  - `python3 -m py_compile tools/psd_preview_exporter.py` 통과
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: Action Interaction 박스 선택 설정창 표시 수정

- 왜 Action에서 설정창이 안 떴는지
  - Canvas hit-test가 현재 선택된 edit handle만 보고 있었다.
  - Action 탭에서 interaction box를 클릭해도 hit된 `interactionObjectKey`가 `selectedActionParts`로 들어가지 않았다.
  - 그래서 `resolveEditTarget(action)`은 계속 frameGroup 또는 이전 target을 보고, Action Interaction 카드가 해당 box 기준으로 mount되지 않았다.

- 수정 내용
  - edit handle geometry에 `key`를 포함했다.
  - 현재 선택 handle이 아니어도 `player.hitRegions`의 bounds를 보고 클릭한 target geometry를 만들게 했다.
  - Canvas pointer down에서 hit된 geometry key를 `selectCanvasPart()`로 Setup/Action selection에 반영하게 했다.
  - Action selection은 기존 `selectSingleActionPart()` 흐름을 재사용하므로, interaction box 클릭 시 아래 panel도 기존 Action Property/Interaction 렌더 경로를 탄다.

- Action 저장 target
  - `action_interaction_panel_controller` 기존 보정대로 role별 object에 저장된다.
  - Attack ON은 현재 `actionKey` / 현재 frame의 `actionOffsets[actionKey].attackInteractionObject`에 `active=1`, `attack=1`을 쓴다.

- 브라우저 수동 QA 결과
  - 미실행. 코드 경로와 자동 검사만 확인했다.

- QA
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: PSD Background layer order 수정

- PSD layer order가 반대였던 원인
  - `psd_tools`에서 flatten한 layer 순서를 exporter가 그대로 manifest에 넣고 있었다.
  - 현재 PSD에서는 그 순서가 `하늘 → ... → 앞풀`처럼 아래에서 위로 쌓이는 순서였다.
  - Crow Knight renderer는 background layer 목록을 top-to-bottom으로 보고 역순 draw하므로, 신규 import 배열도 top-to-bottom이어야 했다.

- 수정 방식
  - `tools/psd_preview_exporter.py`에서 manifest layer export 순서를 `visual_order_layers()`로 바꿨다.
  - 신규 PSD import는 PSD 시각 상단 layer부터 manifest에 기록된다.
  - 기존 저장 프로젝트의 `psdLayers.order`와 위/아래 버튼 로직, renderer draw 규칙은 변경하지 않았다.

- draw order 확인 결과
  - 임시 export에서 layer 순서가 `앞풀1 → 앞풀2 → ... → 하늘`로 나오는 것을 확인했다.
  - renderer는 role별 layer를 `reverse()` 후 draw하므로 `하늘`이 먼저 깔리고 `앞풀`이 마지막에 그려진다.
  - 임시 export WebP layer는 모두 긴 변 2048px 이하로 유지됐다.

- QA
  - `python3 -m py_compile tools/psd_preview_exporter.py` 통과
  - `.venv/bin/python` 임시 PSD export 순서 확인 통과
  - `npm run check` 통과
  - `git diff --check` 통과

---

## 0. Latest Task: Interaction 설정 UI 공통화

- 이번에 한 일
  - Setup과 Action이 같은 `renderInteractionEditor()` 카드 UI를 사용하도록 Action 연결을 보정했다.
  - Action Interaction 카드는 현재 선택 target이 `weapon`이어도 role 매핑을 통해 `attackInteractionObject` 값을 읽고 쓴다.
  - 빈 Timeline slot을 선택한 상태도 Action frame target으로 인정해 Interaction 카드가 보이게 했다.

- Setup 저장 target
  - `tuning.rig[interactionObjectKey]`
  - 예: `tuning.rig.attackInteractionObject`

- Action 저장 target
  - `tuning.actionOffsets[actionKey][interactionObjectKey]`의 현재 frame value
  - 예: Attack role ON → `tuning.actionOffsets[actionKey].attackInteractionObject`의 현재 frame에 `active=1`, `attack=1`

- CSS 통일
  - 새 카드 CSS를 만들지 않고 기존 `interaction-editor-card` / `editor-data-card` 공통 스타일을 그대로 재사용했다.

- QA
  - `npm run check` 통과
  - `git diff --check` 통과
  - 브라우저 수동 QA는 남음: Action 탭에서 공격 Action frame 선택 후 Attack ON, Play 후 HUD `active=1` / `attack=1` 및 `attack-region-created` 확인

---

## 1. Sprint 정보

- Sprint 이름
  - Interaction / Action Debug HUD MVP

- 최종 목표
  - 개발 중 Runtime 상태를 화면에서 바로 확인한다.
  - 기존 Interaction Runtime debug log를 화면 HUD와 연결한다.
  - 새 전투 기능은 추가하지 않는다.

---

## 2. 완료 내용

- `runtime_debug_state.js`를 추가했다.
  - Debug ON/OFF 상태를 localStorage에 저장한다.
  - 현재 Action snapshot과 최근 debug event 10개를 보관한다.
  - Runtime 원본 데이터는 수정하지 않는다.

- `runtime_debug_hud_view.js`를 추가했다.
  - 화면 왼쪽 위에 Debug toggle과 HUD를 표시한다.
  - Debug OFF이면 HUD가 숨겨진다.
  - Debug ON이면 최근 Runtime event가 표시된다.
  - 제작자가 읽기 쉽도록 HUD label과 표시값은 한글로 보여준다.

- 기존 Interaction debug log를 HUD event buffer와 연결했다.
  - `attack-region-created`
  - `attack-region-skipped`
  - `hurt-region`
  - `attack-hurt-overlap`
  - `attack-hurt-no-overlap`
  - `collision-hurt-overlap`
  - `collision-overlap`
  - `guard-block`

- Action Runtime event를 추가했다.
  - `action-start`
  - `action-stop`

- HUD 표시만 한글화했다.
  - 내부 event key와 console log key는 그대로 유지한다.

- Debug HUD 가독성을 보정했다.
  - 상태값은 색 점이 붙은 `● ON` / `● OFF`로 표시한다.
  - 현재 액션 정보에 Trigger 표시를 추가했다.
  - 이벤트 목록 제목을 `최근 판정 로그`로 표시한다.

- Attack role 저장 경로를 보정했다.
  - 무기 선택 상태에서 Attack role을 켜면 `weapon`이 아니라 `attackInteractionObject` frame value에 저장되게 했다.
  - Runtime이 읽는 `attackInteractionObject.active` / `attackInteractionObject.attack`과 UI write target을 일치시켰다.
  - HUD에 `공격 ON 프레임` 범위를 표시해 현재 프레임이 공격 박스가 켜진 프레임인지 확인할 수 있게 했다.

- Debug HUD를 확장했다.
  - `activeAttackFrameCount`를 표시한다.
  - 현재 Action에 공격 프레임이 없으면 `이 Action에는 공격 프레임이 없습니다.`를 표시한다.
  - Trigger 입력이 있었지만 Action이 시작되지 않으면 `Trigger 실패` 또는 `Action 시작 실패` 이벤트를 최근 판정 로그에 남긴다.

- Interaction Runtime debug 비용을 줄였다.
  - Debug HUD 로그는 상태 변화 또는 damage / guard block 같은 판정 이벤트 중심으로 남긴다.
  - 같은 이벤트가 연속 반복되면 최근 판정 로그에서 `x N`으로 압축한다.
  - Debug OFF 상태에서는 debug event payload 생성을 최대한 피한다.
  - Combat 한 resolve 안에서 actor별 Attack / Hurt / Collision / Guard region을 캐시해 같은 프레임 중복 계산을 줄인다.

- Interaction Runtime 원인 추적 로그를 추가했다.
  - 입력 순간의 `pressed` / `held` 값을 `trigger-input`으로 기록한다.
  - Trigger match 결과를 `trigger-match`로 기록한다.
  - Action start 결과를 `action-start`에 `started` 값으로 기록한다.
  - Attack Region 생성/스킵 로그에 Runtime actionKey, 현재 frame, progress, raw active, raw attack 값을 포함했다.
  - Damage 적용 시 `damage-applied`로 damage와 target HP를 기록한다.

- Interaction Runtime 최종 원인 추적 HUD를 추가했다.
  - 현재 Runtime actionKey / frame 기준의 `attackInteractionObject` frame value를 HUD에 표시한다.
  - `active`, `attack`, `damage`, `knockback` 실제 Runtime 값을 표시한다.
  - `입력 → Trigger → Action → Frame → Attack ON → Region → Damage` 체인을 한 줄로 표시한다.
  - 실패한 단계는 `Frame 실패: frame value 없음`, `Attack ON 실패: active=0 / attack=0`, `Damage 실패: overlap 없음`처럼 바로 이유를 표시한다.
  - 최소 Runtime 재현으로 `active=1` / `attack=1`이면 공격 region이 생성되고, Hurt와 overlap되면 damage가 들어가는 것을 확인했다.

- Interaction Editor 저장 경로를 추적하고 fallback write target을 보정했다.
  - Action에서 `weapon`을 선택하면 Property target은 `weapon`으로 유지된다.
  - Interaction target은 `primaryInteractionObjectPartKeyForEditFocus('weapon')`를 통해 `attackInteractionObject`로 변환된다.
  - Interaction UI의 실제 write는 `tuning.actionOffsets[actionKey].attackInteractionObject`에 들어간다.
  - Runtime은 `player.getPartOffset('attackInteractionObject')`와 `createAttackInteractionRegions()`에서 같은 경로를 읽는다.
  - fallback write target도 `weapon`이 아니라 `attackInteractionObject`를 반환하도록 맞췄다.

---

## 3. Debug HUD 표시 정보

- 현재 실행 중인 Action key / 이름
- 현재 Action frame
- 현재 `attackInteractionObject` frame value
- active / attack / damage / knockback Runtime 값
- 입력부터 Damage까지의 실행 체인
- Trigger mode
- facing
- Attack Region 생성 여부
- Hurt Region 생성 여부
- Attack/Hurt overlap 여부
- Collision/Hurt overlap 여부
- Guard block 여부
- 마지막 damage 값
- 마지막 knockback 값
- 마지막 skip reason
- 최근 이벤트 목록

---

## 4. 저장 / 토글

- 저장 key
  - `crowKnight.debugInteractionRuntime`

- 기본값
  - OFF

- 켜는 방법
  - 화면 왼쪽 위 `Debug` 버튼
  - 또는 브라우저 콘솔에서 `localStorage.setItem('crowKnight.debugInteractionRuntime', '1')`

---

## 5. 수정 파일

- `src/runtime_debug_state.js`
- `src/runtime_debug_hud_view.js`
- `src/interaction_region_engine.js`
- `src/combat_engine.js`
- `src/action_trigger_engine.js`
- `src/main.js`
- `src/style.css`
- `docs/10_SRC_MAP.md`
- `docs/99_TASK_REPORT.md`
- `docs/sprint-dashboard.html`

---

## 6. 남은 QA

- 실제 브라우저에서 Debug ON 후 HUD가 표시되는지 확인한다.
- 공격 시 `attack-region-created` / `attack-hurt-overlap` 이벤트가 HUD에 보이는지 확인한다.
- 돌진 충돌 시 `collision-hurt-overlap` 이벤트가 HUD에 보이는지 확인한다.
- Debug OFF 시 HUD와 console log가 꺼지는지 확인한다.

---

## 7. QA

- 완료
  - `npm run check`
  - `git diff --check`

---

## 8. Interaction Runtime 코드 검색 결과

- 작업 범위
  - Debug HUD 추가 중단.
  - 코드 수정 없이 검색만 수행.
  - `attackInteractionObject`, `attackInteractionRegions`, `createAttackInteractionRegions`, `activeAttackInteractionRegions`, `getPartOffset("attackInteractionObject")`, `weapon`, `attack`, `active` 검색 결과를 정리.

### 8.1 핵심 함수 / 프로퍼티 존재 수

| 항목                                       |                   `src` 내 결과 |
| ------------------------------------------ | ------------------------------: |
| `createAttackInteractionRegions`           | 2곳: import 1, 함수 정의/호출 1 |
| `attackInteractionRegions`                 |                             3곳 |
| `activeAttackInteractionRegions`           |                             2곳 |
| `getPartOffset("attackInteractionObject")` |            직접 문자열 호출 0곳 |

### 8.2 영역별 사용 경로

| 영역           | 검색 결과상 사용하는 경로                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime        | `actor_runtime_engine.js` → `attackInteractionRegions` → `activeAttackInteractionRegions()` → `createAttackInteractionRegions(this)` |
| Combat         | `combat_engine.js` → `actor.player.attackInteractionRegions`                                                                         |
| Canvas         | `createAttackInteractionRegions` 직접 사용 없음. `actor_renderer.js` / `puppet_player_edit_region_helper.js`가 `hitRegions` 기록     |
| Editor Preview | `createAttackInteractionRegions` 직접 사용 없음. `editor_debug_view.js`가 `getPartOffset(ATTACK_INTERACTION_OBJECT_KEY)` 사용        |

### 8.3 Runtime 코드 중복 여부

- 검색 결과상 공격박스 Runtime 생성 함수는 `src/interaction_region_engine.js`의 `createAttackInteractionRegions(player)` 1개다.
- `actor_runtime_engine.js`는 이 함수를 import해서 `activeAttackInteractionRegions()`에서 호출한다.
- `combat_engine.js`는 직접 생성하지 않고 `actor.player.attackInteractionRegions`를 읽는다.
- Canvas / Editor 쪽에는 별도 `hitRegions` / edit handle 기록 경로가 있으며, 검색 결과상 `createAttackInteractionRegions`를 쓰지 않는다.

### 8.4 검색 결과

#### `attackInteractionObject`

- `src/interaction_object_editor_controller.js:2`
- `src/runtime_debug_hud_view.js:156`
- `docs/12_EDITOR_FLOW.md:304`
- `docs/12_EDITOR_FLOW.md:305`
- `docs/11_DATA_MODEL.md:238`
- `docs/11_DATA_MODEL.md:257`
- `docs/11_DATA_MODEL.md:281`
- `docs/sprint-dashboard.html:222`
- `docs/sprint-dashboard.html:245`
- `docs/qa/group-edit-auto/01-scan.json` 여러 곳

#### `attackInteractionRegions`

- `src/actor_runtime_engine.js:170`
- `src/actor_runtime_engine.js:173`
- `src/combat_engine.js:213`
- `docs/12_EDITOR_FLOW.md:128`
- `docs/11_DATA_MODEL.md:280`

#### `createAttackInteractionRegions`

- `src/interaction_region_engine.js:178`
- `src/actor_runtime_engine.js:9`
- `src/actor_runtime_engine.js:194`

#### `activeAttackInteractionRegions`

- `src/actor_runtime_engine.js:174`
- `src/actor_runtime_engine.js:193`

#### `getPartOffset("attackInteractionObject")`

- `src` 직접 문자열 호출 없음
- 문서만 있음: `docs/12_EDITOR_FLOW.md:305`

#### `weapon`

- `src/actor_runtime_engine.js:204`
- `src/actor_runtime_engine.js:205`
- `src/actor_runtime_engine.js:206`
- `src/actor_runtime_engine.js:207`
- `src/actor_runtime_engine.js:208`
- `src/actor_runtime_engine.js:209`
- `src/actor_runtime_engine.js:247`
- `src/actor_runtime_engine.js:249`
- `src/actor_runtime_engine.js:498`
- `src/actor_runtime_engine.js:499`
- `src/actor_renderer.js:118`
- `src/actor_renderer.js:158`
- `src/actor_renderer.js:163`
- `src/actor_renderer.js:173`
- `src/actor_renderer.js:197`
- `src/actor_renderer.js:222`
- `src/actor_renderer.js:225`
- `src/actor_renderer.js:249`
- `src/actor_renderer.js:250`
- `src/editor_label_helper.js:34`
- `src/editor_label_helper.js:84`
- `src/interaction_region_engine.js:137`
- `src/interaction_region_engine.js:138`
- `src/interaction_region_engine.js:140`
- `src/interaction_region_engine.js:141`
- `src/interaction_region_engine.js:142`
- `src/interaction_region_engine.js:143`
- `src/interaction_region_engine.js:144`
- `src/interaction_region_engine.js:145`
- `src/interaction_region_engine.js:146`
- `src/interaction_region_engine.js:355`
- `src/interaction_region_engine.js:356`
- `src/interaction_region_engine.js:357`
- `src/interaction_region_engine.js:358`
- `src/interaction_region_engine.js:359`
- `src/interaction_region_engine.js:360`
- `src/interaction_region_engine.js:361`
- `src/interaction_region_engine.js:362`
- `src/interaction_region_engine.js:363`
- `src/interaction_region_engine.js:364`
- `src/selection_palette_data.js:25`
- `src/player_default_tuning_data.js:58`
- `src/part_source_data.js:56`
- `src/part_source_data.js:209`
- `src/particle_effects_engine.js:236`
- `src/game_config_data.js:95`
- `src/actor_pose_helper.js:19`
- `src/asset_loader_helper.js:16`
- `src/interaction_object_editor_controller.js:36`
- `src/player_default_rig_data.js:265`
- `src/player_default_rig_data.js:284`

#### `attack`

- `src/actor_canvas_renderer.js:97`
- `src/editor_panel_dom_helper.js:28`
- `src/actor_runtime_engine.js:358`
- `src/actor_runtime_engine.js:386`
- `src/interaction_field_data.js:4`
- `src/interaction_field_data.js:10`
- `src/interaction_field_data.js:40`
- `src/interaction_field_data.js:82`
- `src/interaction_region_engine.js:105`
- `src/interaction_region_engine.js:184`
- `src/interaction_region_engine.js:201`
- `src/interaction_region_engine.js:308`
- `src/interaction_region_engine.js:319`
- `src/interaction_region_engine.js:327`
- `src/interaction_region_engine.js:329`
- `src/interaction_region_engine.js:347`
- `src/interaction_region_engine.js:348`
- `src/interaction_region_engine.js:350`
- `src/interaction_region_engine.js:351`
- `src/combat_engine.js:24`
- `src/combat_engine.js:34`
- `src/combat_engine.js:42`
- `src/combat_engine.js:63`
- `src/combat_engine.js:213`
- `src/action_group_helper.js:4`
- `src/action_group_helper.js:20`
- `src/action_group_helper.js:21`
- `src/action_group_helper.js:22`
- `src/action_group_helper.js:23`
- `src/part_source_data.js:34`
- `src/part_source_data.js:35`
- `src/settings_panel_state.js:9`
- `src/editor_debug_view.js:133`
- `src/runtime_debug_hud_view.js:56`
- `src/runtime_debug_hud_view.js:113`
- `src/runtime_debug_hud_view.js:116`
- `src/runtime_debug_hud_view.js:118`
- `src/runtime_debug_hud_view.js:121`
- `src/runtime_debug_hud_view.js:209`
- `src/runtime_debug_hud_view.js:210`
- `src/runtime_debug_hud_view.js:211`
- `src/runtime_debug_hud_view.js:212`
- `src/runtime_debug_hud_view.js:229`
- `src/runtime_debug_hud_view.js:230`
- `src/runtime_debug_hud_view.js:232`
- `src/runtime_debug_hud_view.js:233`
- `src/runtime_debug_hud_view.js:234`
- `src/runtime_debug_hud_view.js:235`
- `src/runtime_debug_hud_view.js:236`
- `src/runtime_debug_state.js:136`
- `src/runtime_debug_state.js:152`
- `src/runtime_debug_state.js:157`
- `src/runtime_debug_state.js:165`
- `src/runtime_debug_state.js:168`
- `src/runtime_debug_state.js:223`
- `src/runtime_debug_state.js:228`
- `src/runtime_debug_state.js:235`
- `src/runtime_debug_state.js:239`
- `src/runtime_debug_state.js:243`
- `src/runtime_debug_state.js:258`
- `src/runtime_debug_state.js:259`
- `src/runtime_debug_state.js:261`
- `src/runtime_debug_state.js:262`
- `src/runtime_debug_state.js:309`
- `src/runtime_debug_state.js:334`
- `src/interaction_object_editor_controller.js:11`
- `src/asset_loader_helper.js:20`
- `src/asset_loader_helper.js:21`
- `src/asset_loader_helper.js:22`
- `src/project_data_normalizer_helper.js:392`

#### `active`

- `src/interaction_editor_engine.js:53`
- `src/actor_canvas_renderer.js:51`
- `src/actor_canvas_renderer.js:52`
- `src/actor_canvas_renderer.js:54`
- `src/actor_canvas_renderer.js:106`
- `src/actor_runtime_engine.js:357`
- `src/actor_runtime_engine.js:385`
- `src/interaction_region_engine.js:37`
- `src/interaction_region_engine.js:57`
- `src/interaction_region_engine.js:105`
- `src/interaction_region_engine.js:108`
- `src/interaction_region_engine.js:113`
- `src/interaction_region_engine.js:165`
- `src/interaction_region_engine.js:184`
- `src/interaction_region_engine.js:201`
- `src/interaction_region_engine.js:255`
- `src/interaction_region_engine.js:285`
- `src/interaction_region_engine.js:299`
- `src/interaction_region_engine.js:307`
- `src/interaction_region_engine.js:326`
- `src/interaction_region_engine.js:328`
- `src/interaction_region_engine.js:347`
- `src/interaction_region_engine.js:348`
- `src/interaction_region_engine.js:349`
- `src/modifier_editor_engine.js:99`
- `src/modifier_editor_engine.js:103`
- `src/modifier_editor_engine.js:271`
- `src/modifier_editor_engine.js:272`
- `src/modifier_editor_engine.js:273`
- `src/edit_handle_drawing_helper.js:29`
- `src/edit_handle_drawing_helper.js:31`
- `src/edit_handle_drawing_helper.js:32`
- `src/edit_handle_drawing_helper.js:33`
- `src/edit_handle_drawing_helper.js:34`
- `src/edit_handle_drawing_helper.js:35`
- `src/edit_handle_drawing_helper.js:36`
- `src/edit_handle_drawing_helper.js:37`
- `src/edit_handle_drawing_helper.js:41`
- `src/edit_handle_drawing_helper.js:42`
- `src/action_trigger_controller.js:272`
- `src/action_trigger_controller.js:275`
- `src/action_trigger_controller.js:277`
- `src/pose_action_authoring_controller.js:395`
- `src/pose_action_authoring_controller.js:398`
- `src/pose_action_authoring_controller.js:400`
- `src/project_data_normalizer_helper.js:381`
- `src/project_data_normalizer_helper.js:391`
- `src/runtime_debug_hud_view.js:55`
- `src/runtime_debug_hud_view.js:114`
- `src/runtime_debug_hud_view.js:229`
- `src/runtime_debug_hud_view.js:230`
- `src/runtime_debug_hud_view.js:231`
- `src/runtime_debug_hud_view.js:234`
- `src/editor_debug_view.js:115`
- `src/editor_debug_view.js:117`
- `src/editor_debug_view.js:118`
- `src/editor_workflow_navigation_helper.js:44`
- `src/editor_control_setup_controller.js:307`
- `src/timeline_drag_control_helper.js:29`
- `src/editor_panel_dom_helper.js:245`
- `src/runtime_debug_state.js:135`
- `src/runtime_debug_state.js:152`
- `src/runtime_debug_state.js:157`
- `src/runtime_debug_state.js:165`
- `src/runtime_debug_state.js:168`
- `src/runtime_debug_state.js:308`
- `src/runtime_debug_state.js:334`
- `src/editor_scrub_helper.js:73`
- `src/editor_asset_controller.js:306`
- `src/editor_asset_controller.js:314`
- `src/timeline_dom_helper.js:15`
- `src/timeline_dom_helper.js:112`
- `src/timeline_dom_helper.js:114`
- `src/timeline_dom_helper.js:162`
- `src/timeline_dom_helper.js:264`
- `src/timeline_dom_helper.js:274`
- `src/timeline_dom_helper.js:285`
- `src/timeline_dom_helper.js:296`
- `src/combat_engine.js:137`
- `src/interaction_field_data.js:9`
- `src/interaction_field_data.js:39`

---

## 9. attackInteractionObject → player.hitRegions 전달 경로 추적

- 작업 전 확인
  - `docs/20_IMPLEMENTATION_RULES.md`를 다시 읽었다.
  - 새 기능보다 기존 구조를 먼저 확인한다는 원칙에 따라 코드 수정 없이 추적했다.
  - HUD 추가 / 새 로그 추가 / 새 기능 추가는 하지 않았다.

### 9.1 player.hitRegions 생성 위치

- 초기화
  - `src/actor_renderer.js:34`
  - `drawPuppetPlayer()` 시작 시 `player.hitRegions = []`로 clear된다.

- push 경로
  - `src/puppet_player_edit_region_helper.js:26`
    - `recordPuppetImageRegion()`이 `{ key, points, bounds }`를 `player.hitRegions`에 push한다.
  - `src/puppet_player_edit_region_helper.js:83`
    - `recordPuppetRectPart()` 내부에서 `recordPuppetImageRegion()`을 호출한다.
  - `src/puppet_player_edit_region_helper.js:109`
    - `recordPuppetJointRegion()`이 joint region을 `player.hitRegions`에 push한다.

### 9.2 hitRegions에 들어가는 key

- 일반 이미지 파츠
  - `src/actor_renderer.js:305`
  - `drawPuppetImagePart(..., key)`가 `recordPuppetImageRegion(player, ctx, key, ...)`를 호출한다.
  - 예: `weapon`, `body`, `head`

- Interaction object 파츠
  - `src/actor_renderer.js:318`
  - `drawPuppetImageLessChildParts(player, ctx, parentKey, ...)`
  - `src/actor_renderer.js:329`
  - `interactionObjectPartKeysForParent(parentKey)`를 사용한다.
  - `src/interaction_object_editor_controller.js:33`
  - `attackInteractionObject`의 parent는 `weapon`이다.

- 결과
  - `weapon`을 그릴 때 `weapon` region이 먼저 들어간다.
  - 이후 `drawPuppetImageLessChildParts()`가 `weapon`의 child interaction object를 찾는다.
  - `attackInteractionObject`가 별도 rect part로 기록되어 `player.hitRegions`에 들어간다.

### 9.3 active / attack / hurt / collision / guard 읽는 위치

- `player.hitRegions` 생성 시점에는 `active`, `attack`, `hurt`, `collision`, `guard`를 읽지 않는다.
- `hitRegions`에는 geometry 중심의 `key`, `points`, `bounds`만 들어간다.
- Interaction flag는 Runtime region 변환 시점에 읽는다.

읽는 위치:

- `src/interaction_region_engine.js:93`
  - `createRecordedInteractionRegion(player, region, role)`
- `src/interaction_region_engine.js:94`
  - `player.rig?.[region.key]`
  - `region.interaction || player.getPartOffset(region.key)`
- `src/interaction_region_engine.js:98`
  - `interactionFlagSnapshot(interaction)`
- `src/interaction_region_engine.js:108`
  - `flags.active === false || flags[role] === false`이면 region 제외

### 9.4 실제 함수 흐름

```text
Editor
↓
tuning.actionOffsets[actionKey].attackInteractionObject
↓
actor_renderer.drawPuppetImagePart(..., 'weapon')
↓
drawPuppetImageLessChildParts(parentKey='weapon')
↓
interactionObjectPartKeysForParent('weapon')
↓
attackInteractionObject
↓
recordPuppetRectPart()
↓
recordPuppetImageRegion()
↓
player.hitRegions
  - key = attackInteractionObject
↓
createAttackInteractionRegions()
↓
createActiveInteractionRegions(player, 'attack')
↓
createRecordedInteractionRegion()
↓
player.getPartOffset(region.key)
  - region.key = attackInteractionObject
↓
combat_engine.readInteractionRegions(actor, 'attack')
↓
actor.player.attackInteractionRegions
```

### 9.5 key가 바뀌는 지점

- 검색 / 코드 추적 결과 `attackInteractionObject`가 `weapon`으로 바뀌는 지점은 확인되지 않았다.
- `weapon` region과 `attackInteractionObject` region은 별도로 기록된다.
- `attackInteractionObject`는 `weapon`의 image-less child part로 `player.hitRegions`에 들어간다.

### 9.6 player.hitRegions Runtime 생성 코드 중복 여부

- clear 위치
  - `src/actor_renderer.js:34` 한 곳

- 직접 push 함수
  - `recordPuppetImageRegion()`
  - `recordPuppetJointRegion()`

- `createAttackInteractionRegions()`
  - `src/interaction_region_engine.js`의 함수 1개
  - `actor_runtime_engine.js`가 이 함수를 import해서 `activeAttackInteractionRegions()`에서 호출한다.
  - `combat_engine.js`는 직접 생성하지 않고 `actor.player.attackInteractionRegions`를 읽는다.

### 9.7 추적 결론

- `attackInteractionObject`는 `player.hitRegions`까지 전달되는 구조다.
- `hitRegions` 생성 단계에서는 active / attack을 판정하지 않는다.
- active / attack 판정은 `interaction_region_engine.js`의 `createRecordedInteractionRegion()`에서 수행된다.
- Combat은 `update()` 안에서 실행되고 `drawPuppetPlayer()`는 draw 단계에서 `player.hitRegions`를 다시 만든다.
- 따라서 Combat이 보는 `player.hitRegions`는 같은 frame의 draw 결과가 아니라 이전 draw에서 만들어진 geometry일 수 있다.
- 다만 `createAttackInteractionRegions()`에는 `player.hitRegions`에 active attack region이 없을 때 `player.getPartOffset('attackInteractionObject')`를 직접 읽는 fallback 경로가 있다.

### 9.8 QA

- 완료
  - `npm run check`
  - `git diff --check`

---

## 10. Runtime Frame 순서 조사

- 작업 전 확인
  - `docs/20_IMPLEMENTATION_RULES.md`를 다시 읽었다.
  - 새 기능 / HUD / 로그 추가 없이 실제 호출 순서만 조사했다.
  - 수정은 하지 않았다.

### 10.1 실제 호출 순서

| 순서 | 단계                                    | 실제 함수 / 위치                                                                                         |
| ---: | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
|    1 | Frame loop 시작                         | `src/main.js:175` `loop(now)`                                                                            |
|    2 | Update 시작                             | `src/main.js:178` `update(dt)`                                                                           |
|    3 | Runtime debug frame 시작                | `src/main.js:185` `beginRuntimeDebugFrame()`                                                             |
|    4 | actor motion 시작 상태 capture          | `src/main.js:187` `captureActorMotionStart(gameActors)`                                                  |
|    5 | Input / Trigger / Action / actor update | `src/main.js:215` `updateBattleActorMotion(...)`                                                         |
|    6 | Player update                           | `src/combat_engine.js:8` `playerActor.player.update(dt, keys, pressed, world)`                           |
|    7 | NPC update                              | `src/combat_engine.js:10` `actor.player.updateNpc(...)`                                                  |
|    8 | Combat                                  | `src/main.js:224` `resolveCombat(...)`                                                                   |
|    9 | Combat reads attack regions             | `src/combat_engine.js:24` `cachedInteractionRegions(..., 'attack')`                                      |
|   10 | Attack region getter                    | `src/combat_engine.js:213` `actor.player.attackInteractionRegions`                                       |
|   11 | Attack runtime 생성 함수                | `src/actor_runtime_engine.js:173` → `src/actor_runtime_engine.js:193` `activeAttackInteractionRegions()` |
|   12 | Update 종료 후 Draw 시작                | `src/main.js:179` `draw()`                                                                               |
|   13 | Actor draw                              | `src/main.js:343` `drawActor(...)`                                                                       |
|   14 | Player draw                             | `src/actor_canvas_renderer.js:29` `actor.player.draw(ctx)`                                               |
|   15 | Puppet draw                             | `src/actor_runtime_engine.js:486` `drawPuppetPlayer(this, ctx)`                                          |
|   16 | hitRegions clear/build 시작             | `src/actor_renderer.js:34` `player.hitRegions = []`                                                      |
|   17 | hitRegions push                         | `src/actor_renderer.js:305`, `src/puppet_player_edit_region_helper.js:26`                                |
|   18 | Draw 끝난 뒤 pressed clear              | `src/main.js:180` `pressed.clear()`                                                                      |
|   19 | 다음 frame 예약                         | `src/main.js:181` `requestAnimationFrame(loop)`                                                          |

### 10.2 요약 순서

```text
Input 상태 보유
↓
loop()
↓
update()
↓
updateBattleActorMotion()
↓
player.update() / npc.update()
↓
resolveCombat()
↓
actor.player.attackInteractionRegions 읽기
↓
draw()
↓
drawActor()
↓
actor.player.draw()
↓
drawPuppetPlayer()
↓
player.hitRegions = []
↓
recordPuppetImageRegion / recordPuppetRectPart / recordPuppetJointRegion
↓
player.hitRegions 생성
```

### 10.3 결론

- 현재 실제 순서는 `Update → Combat → Draw → player.hitRegions 생성`이 맞다.
- 따라서 `Combat`은 그 frame에서 방금 갱신된 pose/action을 기반으로 새로 만든 `hitRegions`가 아니라, 이전 `draw()`에서 만들어져 player 객체에 남아 있던 `hitRegions`를 먼저 사용한다.

### 10.4 공격박스 미생성 원인 후보 분석

- 이 순서는 공격박스 미생성 원인의 후보가 맞다.
- `player.hitRegions`는 `drawPuppetPlayer()`에서 clear/build된다.
- `resolveCombat()`은 draw보다 먼저 실행된다.
- `createAttackInteractionRegions()`는 먼저 `player.hitRegions` 기반 recorded region을 확인한다.
- 그러므로 Combat 시점의 `player.hitRegions`는 현재 Update에서 계산된 최신 action frame geometry가 아닐 수 있다.
- 다만 `createAttackInteractionRegions()`에는 `hitRegions`에 active attack region이 없을 때 `player.getPartOffset('attackInteractionObject')`를 읽는 fallback이 있다.
- 그래서 “생성 자체”는 fallback이 살릴 수 있지만, geometry 위치는 draw 기반 `hitRegions`와 별도 계산 경로가 섞일 수 있다.

### 10.5 QA

- 완료
  - `npm run check`
  - `git diff --check`

## 11. hitRegions / InteractionRegion 책임 분리 최소 수정

### 11.1 작업 범위

- `docs/20_IMPLEMENTATION_RULES.md`를 다시 읽고 시작했다.
- 새 전투 기능, HUD, 저장 구조 변경 없이 Runtime 판정 source만 정리했다.
- `player.hitRegions`는 Canvas/Edit overlay 기록으로 남기고, Combat 판정은 현재 Runtime 상태에서 직접 계산하도록 분리했다.

### 11.2 원인

- `player.hitRegions`는 `drawPuppetPlayer()`에서 draw 단계에 clear/build된다.
- 실제 frame 순서는 `Update → Combat → Draw → player.hitRegions 생성`이다.
- 그런데 기존 `interaction_region_engine`은 `createActiveInteractionRegions()`로 `player.hitRegions` 기반 recorded region을 먼저 읽었다.
- 따라서 Combat은 현재 update에서 결정된 action frame geometry가 아니라 이전 draw 결과를 먼저 볼 수 있었다.

### 11.3 수정 내용

- `src/interaction_region_engine.js`
  - `createAttackInteractionRegions()`가 `player.hitRegions`를 보지 않고 `attackInteractionObject`의 현재 frame offset을 직접 계산한다.
  - `createHurtInteractionRegions()`, `createCollisionInteractionRegions()`, `createGuardInteractionRegions()`도 draw-recorded region 우선 경로를 제거했다.
  - 기존 `weaponAnchorTransform()`, `parentImageTransform()`, `createParentedInteractionRegion()` 경로를 재사용했다.
- `docs/11_DATA_MODEL.md`
  - Runtime InteractionRegion source를 `tuning.rig.*InteractionObject + actionOffsets 현재 frame override`로 수정했다.
  - `player.hitRegions`는 Combat source가 아니라 Canvas/Edit overlay용 geometry라고 기록했다.
- `docs/12_EDITOR_FLOW.md`
  - Runtime attack 흐름에서 `createActiveInteractionRegions()` / recorded region 설명을 제거했다.
- `docs/13_ACTION_MODEL.md`
  - Runtime 흐름을 Combat용 current InteractionRegion 계산과 draw/edit용 `hitRegions` 기록으로 분리했다.

### 11.4 현재 책임 분리

| 대상                                                        | 책임                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `player.hitRegions`                                         | draw 단계에서 기록하는 Canvas 선택 / edit handle / debug overlay용 geometry      |
| `actor.player.attackInteractionRegions` 등                  | Combat이 현재 Runtime frame 기준으로 계산하는 판정용 InteractionRegion           |
| `interaction_region_engine.js`                              | rig + current action offset + parent transform을 조합해 Runtime 판정 region 생성 |
| `actor_renderer.js` / `puppet_player_edit_region_helper.js` | 화면에 그린 결과를 edit/debug용으로 기록                                         |

### 11.5 위험 요소

- legacy effect trail이 `player.hitRegions[effect:*].interaction`을 Combat source로 기대하던 경로는 더 이상 Runtime 판정 source가 아니다.
- 이번 수정은 Action InteractionObject 판정의 순서 문제를 제거하는 최소 수정이며, Effect interaction Runtime은 별도 Sprint에서 명확한 source가 필요하다.

### 11.6 QA

- 완료
  - `npm run check`
  - `git diff --check`

## 12. Crow Knight Runtime 구조 감사

### 12.1 작업 범위

- `docs/20_IMPLEMENTATION_RULES.md`를 먼저 읽고 시작했다.
- 새 HUD, 새 로그, 저장 구조 변경, Editor UI 변경, Runtime 재작성 없이 코드 흐름만 조사했다.
- 코드 수정은 하지 않고 Runtime update 순서, Action frame source, Interaction value source, Combat source를 파일 단위로 추적했다.

### 12.2 읽은 문서 / Runtime 파일

- 문서
  - `docs/00_MANIFEST.md`
  - `docs/03_ARCHITECTURE.md`
  - `docs/10_SRC_MAP.md`
  - `docs/11_DATA_MODEL.md`
  - `docs/12_EDITOR_FLOW.md`
  - `docs/13_ACTION_MODEL.md`
  - `docs/20_IMPLEMENTATION_RULES.md`
  - `docs/99_TASK_REPORT.md`
- Runtime 파일
  - `src/main.js`
  - `src/actor_runtime_engine.js`
  - `src/actor_action_helper.js`
  - `src/action_trigger_engine.js`
  - `src/interaction_region_engine.js`
  - `src/combat_engine.js`
  - `src/actor_renderer.js`
  - `src/actor_canvas_renderer.js`
  - `src/runtime_debug_state.js`
  - `src/runtime_debug_hud_view.js`

### 12.3 Runtime update 순서

실제 호출 순서:

```text
main.loop()
→ update(dt)
→ beginRuntimeDebugFrame()
→ activeGameActors()
→ captureActorMotionStart(gameActors)
→ updateBattleActorMotion()
  → playerActor.player.update(dt, keys, pressed, world)
    → actor_action_helper.updatePuppetPlayer()
      → advanceActorClock()
      → updateActionTriggerRuntime()
      → advanceCustomActionRuntime()
      → applyWorldPhysics()
      → updatePuppetPlayerState()
  → npc.updateNpc()
→ resolveCombat()
  → actor.player.attackInteractionRegions / hurtInteractionRegions / collisionInteractionRegions / guardInteractionRegions
  → interaction_region_engine
  → overlap / damage / knockback / hurt Action
→ draw()
  → drawActor()
  → actor.player.draw()
  → actor_renderer.drawPuppetPlayer()
  → player.hitRegions = []
  → draw 기록용 hitRegions / editHandles 생성
→ captureRuntimeDebugActorSnapshot()
→ runtimeDebugHud.render()
→ pressed.clear()
```

결론:

- Combat은 Draw보다 먼저 실행된다.
- 현재 `interaction_region_engine`은 `player.hitRegions`를 Runtime source로 사용하지 않는다.
- `player.hitRegions`는 draw/edit/debug overlay 기록으로 남아 있다.

### 12.4 현재 actionKey 결정 위치

`src/actor_runtime_engine.js`의 `PuppetPlayer.actionKey` getter:

```text
actionPreview.action이 있으면 preview action
→ customActionKey가 active이면 customActionKey
→ 아니면 fallbackActionKey 또는 resolveFallbackActionKey()
→ 최후 fallback idle
```

관련 상태:

- `customActionKey`
  - `action_trigger_engine.startCustomAction()`에서 설정된다.
- `customActionTime`
  - `startCustomAction()`에서 duration으로 설정된다.
  - `advanceCustomActionRuntime()`에서 줄어든다.
  - `customActionTime > 0`이면 `isCustomActionActive`가 true다.
- `fallbackActionKey`
  - `actor_action_helper.updatePuppetPlayerState()`에서 `resolveFallbackActionKey()` 결과로 갱신된다.
  - base group + condition 기준이다.

공격박스가 계속 OFF인데 HUD의 현재 actionKey가 `idle`이면 원인은 Combat source가 아니라 Trigger / Action start 단계다.

### 12.5 current frame 결정 위치

`src/actor_runtime_engine.js`의 `getActionFrameProgress()`:

```text
actionPreview.t가 있으면 preview t
→ actionPreview.playing이면 preview elapsed / duration
→ actionPreview.frame이면 start/end
→ customAction active이면 customActionElapsed / customActionDuration
   - pressLoop이면 actionSettings[actionKey].playback 사용
   - 그 외는 once
→ fallback action이면 stateTime / duration
```

중요한 관찰:

- `advanceCustomActionRuntime()`은 `customActionBlend`가 있으면 blend frame만 진행하고 바로 return한다.
- 이 동안 `customActionElapsed`는 증가하지 않는다.
- 따라서 Blend가 켜진 Action은 blend 중에는 actionKey는 새 Action이지만 progress는 0에 머문다.
- 공격 frame이 1프레임 이후라면 blend 중 Combat에서 `attackInteractionObject.active/attack`이 OFF로 보이는 것은 현재 코드 기준 자연스러운 결과다.

### 12.6 attackInteractionObject.active / attack 읽기 위치

Runtime Combat 경로:

```text
combat_engine.resolveCombat()
→ cachedInteractionRegions(regionCache, actor, 'attack')
→ readInteractionRegions(actor, 'attack')
→ actor.player.attackInteractionRegions
→ actor_runtime_engine.activeAttackInteractionRegions()
→ interaction_region_engine.createAttackInteractionRegions(player)
→ player.getPartOffset('attackInteractionObject')
→ actor_runtime_engine.resolveActionOffset()
→ actionOffsets[player.actionKey].attackInteractionObject
→ getActionFrameProgress()
→ interpolateFrameValues()
→ active / attack stepped flag
```

`active` / `attack` 판정:

- `interaction_region_engine.createAttackInteractionRegions()`
  - `const offset = player.getPartOffset(ATTACK_INTERACTION_OBJECT_KEY)`
  - `interactionFlagSnapshot(offset)`
  - `active && attack`일 때만 attack region 생성
- `puppet_player_geometry_helper.interpolateFrameValues()`
  - interaction toggle은 선형 보간하지 않고 `steppedFrameFlag(a[prop])`로 앞쪽 keyframe 값을 유지한다.

따라서 공격 frame이 keyframe 사이 중간에 있다면, Runtime은 현재 progress보다 앞쪽 keyframe의 `active/attack` 값을 본다.

### 12.7 Debug HUD source와 Combat source 비교

| 항목                     | Combat source                                     | Debug HUD source                                          | 같은 source 여부           |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------- | -------------------------- |
| 현재 actionKey           | `player.actionKey`                                | `player.actionKey`                                        | 같음                       |
| 현재 progress/frame      | `player.getActionFrameProgress()`                 | `player.getActionFrameProgress()`                         | 같음                       |
| attack frame source 존재 | 직접 검사하지 않음                                | `player.actionOffsets[actionKey].attackInteractionObject` | HUD만 표시                 |
| current active/attack    | `player.getPartOffset('attackInteractionObject')` | `player.getPartOffset('attackInteractionObject')`         | 같음                       |
| attack region 생성       | `createAttackInteractionRegions()`                | debug event `attack-region-created/skipped`               | Combat 결과를 event로 반영 |
| damage                   | `combat_engine.applyInteractionDamage()`          | debug event `damage-applied`                              | Combat 결과를 event로 반영 |

결론:

- HUD의 `active/attack` 표시와 Combat의 attack region 생성 조건은 같은 `getPartOffset('attackInteractionObject')`를 본다.
- 단, HUD snapshot은 `draw()` 끝에서 `captureRuntimeDebugActorSnapshot()`이 호출될 때 표시된다.
- Combat event는 `resolveCombat()` 중 기록되고, HUD는 그 결과를 draw 후 렌더한다.

### 12.8 공격박스 Runtime 버그 원인 후보 확정

현재 코드 기준으로 나눠 보면:

| 후보                                                   | 판정        | 근거                                                                                                                                                  |
| ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combat source가 이전 draw `hitRegions`를 보는 문제     | 현재는 낮음 | `interaction_region_engine`에서 recorded `hitRegions` 우선 경로가 제거됐고, Combat은 `player.getPartOffset()` 직접 계산 경로를 탄다.                  |
| Interaction value가 Runtime에 저장/전달되지 않는 문제  | 가능성 있음 | HUD와 Combat 모두 `actionOffsets[actionKey].attackInteractionObject`를 보므로, 여기에 `active=1`, `attack=1`이 없으면 둘 다 OFF가 맞다.               |
| 현재 actionKey가 사용자가 만든 공격 Action이 아닌 문제 | 가능성 높음 | `PuppetPlayer.actionKey`가 `idle`이면 `actionOffsets.idle.attackInteractionObject`를 읽는다. Trigger match / Condition / interrupt 실패 시 idle 유지. |
| 현재 frame이 공격 ON frame이 아닌 문제                 | 가능성 높음 | toggle은 stepped 방식이므로 현재 progress가 공격 keyframe 이전이면 OFF다. Blend 중에는 progress가 0에 머문다.                                         |
| geometry 생성 실패                                     | 가능성 있음 | `active=true`, `attack=true`여도 `weaponAnchorTransform()`, `rig.attackInteractionObject`, `rig.weapon` 중 하나가 없으면 region 생성 실패다.          |
| overlap / damage 단계 문제                             | 별도 후보   | region은 ON인데 damage가 없으면 Hurt region, hurtByAttack, overlap, guard, invuln/hurtCooldown 조건을 확인해야 한다.                                  |

현재 가장 유력한 원인 축:

```text
Trigger / Action start
또는
현재 action frame / attackInteractionObject frame value
```

현재 코드만 보면 `Combat source` 자체가 공격박스 OFF의 1순위 원인은 아니다.

### 12.9 Runtime v2 최소 범위 제안

전체 Runtime 재작성은 아직 필요하지 않다.

최소 분리 후보:

1. `Runtime Action Frame Reader`
   - `player.actionKey`, `progress`, `frame`, `frameCount`, `triggerMode`, `facing`을 한 object로 반환한다.
   - Combat, Debug HUD, InteractionRegion이 같은 frame snapshot을 읽게 한다.
   - 현재는 `interaction_region_engine`, `runtime_debug_state`, `actor_runtime_engine`이 각각 action frame 계산을 호출한다.

2. `Runtime Interaction Region Source`
   - 현재 `interaction_region_engine`을 유지하되 입력으로 `player + actionFrameSnapshot`을 받도록 확장한다.
   - `attack/hurt/collision/guard` region 계산은 계속 한 파일에 둔다.
   - `player.hitRegions`는 계속 draw/edit overlay 전용으로 둔다.

3. `Runtime Debug Snapshot 위치 조정 검토`
   - 현재 HUD snapshot은 draw 끝에서 캡처된다.
   - Combat과 완전히 같은 시점의 값을 보여주려면 `resolveCombat()` 직전 또는 직후 snapshot을 별도 캡처하는 작은 조정만 검토한다.
   - 새 HUD 기능 추가가 아니라 source timing 정렬 목적일 때만 진행한다.

하지 않을 것:

- `actor_runtime_engine.js` 전체 재작성
- Combat 전체 재작성
- 저장 구조 변경
- Editor write 경로 변경

### 12.10 다음 확인 순서

공격박스 OFF 재현 시 다음 순서로 보면 된다.

1. HUD 현재 actionKey가 공격 Action인지 확인한다.
2. `activeAttackFrameCount`가 0인지 확인한다.
3. 현재 frame이 `공격 ON 프레임` 범위 안인지 확인한다.
4. HUD `active / attack`이 1인지 확인한다.
5. 1인데 region OFF면 `weaponAnchorTransform()` / `rig.weapon` / `rig.attackInteractionObject` geometry 문제다.
6. region ON인데 damage 없음이면 Hurt region / overlap / guard / invuln / hurtCooldown 문제다.

### 12.11 QA

- 코드 수정 없음
- 저장 구조 변경 없음
- HUD 추가 없음
- Editor UI 변경 없음

## 13. Runtime Flow Map / 공격박스 OFF 추적

### 13.1 이번에 한 일

- `docs/20_IMPLEMENTATION_RULES.md`를 먼저 읽고 시작했다.
- `docs/10_SRC_MAP.md`에 `Runtime Flow Map` 섹션을 추가했다.
- `docs/src-map.html`에 `Runtime Flow` 패널을 추가했다.
- 코드 수정 없이 공격박스 OFF 경로를 `Editor write target → Runtime getPartOffset → InteractionRegion` 순서로 다시 추적했다.

### 13.2 발견한 원인

- `player.hitRegions`는 현재 Combat source가 아니다.
- Action Interaction 패널은 `weapon` 선택 상태에서도 `primaryInteractionObjectPartKeyForEditFocus('weapon') → attackInteractionObject`를 통해 `attackInteractionObject`를 write target으로 사용한다.
- Runtime도 `player.getPartOffset('attackInteractionObject')`를 읽으므로 Editor write target과 Runtime read target은 코드상 일치한다.
- 남은 유력 원인은 현재 실행 `actionKey`가 실제 공격 Action이 아니거나, 현재 frame이 공격 ON frame 이전인 경우다.
- 추가로 HUD의 `activeAttackFrameCount` / `공격 ON 프레임` 표시는 실제 stepped active range가 아니라 `active=1`, `attack=1`인 keyframe 번호만 세므로 현재 frame 범위 판단용으로는 부정확할 수 있다.

### 13.3 QA

- `git diff --check` 완료

## 14. Action Runtime 공격박스 OFF 추적

### 14.1 이번에 한 일

- `docs/20_IMPLEMENTATION_RULES.md`와 Runtime 관련 문서를 먼저 읽었다.
- `action_trigger_engine.js`, `actor_runtime_engine.js`, `actor_action_helper.js`, `interaction_region_engine.js`, `combat_engine.js`에서 `Trigger → customActionKey → actionKey → progress → getPartOffset('attackInteractionObject') → active/attack` 흐름을 추적했다.
- Debug HUD의 현재 frame/progress/active/attack 표시 source와 Combat의 attack region 생성 source가 같은지 확인했다.

### 14.2 확정된 원인

- Trigger가 성공하면 `startCustomAction()`에서 `customActionKey`, `customActionTime`, `customActionDuration`, `customActionElapsed = 0`이 설정된다.
- `player.actionKey`는 `customActionKey && customActionTime > 0`이면 `customActionKey`를 반환한다.
- `advanceCustomActionRuntime()`은 `customActionBlend`가 있으면 blend frame만 진행하고 즉시 return하므로, blend 중에는 `customActionElapsed`가 증가하지 않는다.
- 따라서 blend 중 `getActionFrameProgress()`는 계속 `0`을 반환한다.
- `getPartOffset('attackInteractionObject')`는 현재 `actionKey`와 progress `0` 기준으로 `actionOffsets[actionKey].attackInteractionObject`를 읽는다.
- `interpolateFrameValues()`의 `steppedFrameFlag()`는 현재 progress보다 앞쪽 keyframe의 `active/attack` 값을 유지한다.
- 결론: 공격박스 OFF가 `active=0 / attack=0`으로 나타나는 지점은 Combat이 아니라 `Current Frame → Current Pose` 단계다. 원인 분류는 `progress가 공격 frame 이전`이다. 특히 Blend가 켜진 Action은 의도대로 Blend가 먼저 실행되므로, 공격 ON keyframe이 1프레임 이후라면 Blend 동안 공격박스가 OFF로 판정된다.

### 14.3 수정 내용

- 코드 수정 없음.
- Runtime 재작성, Combat 재작성, 저장 구조 변경, Editor UI 변경, HUD 추가 없음.

### 14.4 QA

- HUD의 `active/attack`은 `runtime_debug_state.js`에서 `player.getPartOffset('attackInteractionObject')`를 읽는다.
- Combat의 attack region도 `interaction_region_engine.js`에서 같은 `player.getPartOffset('attackInteractionObject')`를 읽는다.
- `active=1`, `attack=1`인 현재 frame에 도달하면 `createAttackInteractionRegions()`는 attack region 생성을 시도한다.

## 15. Action Runtime progress 추적

### 15.1 이번에 확인한 것

- `docs/20_IMPLEMENTATION_RULES.md`, `docs/10_SRC_MAP.md`, `docs/99_TASK_REPORT.md`를 먼저 읽었다.
- `action_trigger_engine.js`, `actor_runtime_engine.js`, `actor_action_helper.js`에서 `customActionKey`, `customActionElapsed`, `customActionDuration`, `customActionTime`, `customActionBlend` 흐름을 추적했다.
- Debug HUD의 progress source가 `getActionFrameProgress()`와 같은지 다시 확인했다.

### 15.2 progress가 실제 증가하는지 여부

- Action Runtime은 매 update에서 호출된다.
  - Player: `updatePuppetPlayer() → updateActionTriggerRuntime() → advanceCustomActionRuntime()`
  - NPC: `updatePuppetNpc() → advanceCustomActionRuntime()`
- Trigger 성공 직후 `startCustomAction()`은 다음 값을 설정한다.
  - `customActionDuration = duration`
  - `customActionTime = duration`
  - `customActionElapsed = 0`
  - `customActionBlend = beginCustomActionBlend()` 결과
- `customActionBlend`가 없으면 `advanceCustomActionRuntime()`에서 매 frame `customActionElapsed += dt`가 실행된다.
- `getActionFrameProgress()`는 custom Action active 상태에서 `customActionElapsed / customActionDuration`을 `timelinePlaybackProgress()`에 넣은 값을 반환한다.
- 따라서 blend가 없거나 blend가 끝난 뒤에는 progress가 실제 증가한다.
- Runtime progress 자체는 `0 → 1 → 2 → 3` 정수가 아니라 `0.0 → 1.0` normalized 값이다. HUD의 현재 frame은 이 progress를 `frameCount`로 환산한 표시값이다.

### 15.3 progress가 증가하지 않는 경우와 막히는 함수

- `advanceCustomActionRuntime()`은 `customActionBlend`가 있으면 `advanceCustomActionBlendFrame(dt)`만 호출하고 즉시 return한다.
- 이 branch에서는 `customActionElapsed += dt`가 실행되지 않는다.
- 따라서 blend 중 progress는 `0 → 0 → 0`으로 유지된다.
- 막히는 함수는 `advanceCustomActionRuntime()`의 `if (player.customActionBlend) return` branch다.
- `customActionBlend`는 `advanceCustomActionBlendFrame()`에서 `elapsedFrames += dt * ACTION_FPS`가 `frames` 이상이면 `null`이 된다.
- `blendFrames`는 `normalizeActionBlendFrames()`로 0~5 사이 정수로 제한된다.
- `dt > 0`인 runtime frame이 계속 들어오면 blend는 끝난다. `dt = 0`만 계속 들어오거나 update가 멈추면 blend는 끝나지 않는다.

### 15.4 Debug HUD source

- HUD progress는 `runtime_debug_state.js`의 `actionSnapshotFromPlayer()`에서 `player.getActionFrameProgress()`를 직접 호출한다.
- 따라서 HUD progress와 Runtime current frame 계산 source는 같다.
- HUD frame 표시는 `progress`를 `timelineFrameCount(settings)` 기준으로 환산한 값이다.

### 15.5 수정 내용

- 코드 수정 없음.
- Runtime 재작성, Combat 수정, Editor 수정, HUD 추가, 저장 구조 변경, 로그 추가 없음.

### 15.6 QA

- `npm run check` 완료
- `git diff --check` 완료

## 16. getPartOffset active 결정 경로 추적

### 16.1 이번에 확인한 것

- `docs/20_IMPLEMENTATION_RULES.md`, `docs/10_SRC_MAP.md`, `docs/99_TASK_REPORT.md`를 먼저 읽었다.
- 범위를 `getPartOffset() → resolveActionOffset() → interpolateFrameValues()`로 좁혀 `attackInteractionObject.active`가 어디서 0/1로 결정되는지 확인했다.

### 16.2 active가 결정되는 최종 함수

- keyframes 구조에서 `active`의 최종 0/1 결정 함수는 `steppedFrameFlag()`다.
- 호출 경로:

```text
player.getPartOffset('attackInteractionObject')
→ actionOffsets[player.actionKey].attackInteractionObject
→ resolveActionOffset(value)
→ resolveActionOffsetAt(value, getActionFrameProgress(), actionMirrorSettings, facing)
→ interpolateFrameValues(value.keyframes, progress, empty)
→ normalizeInteractionValues(frame)
→ interpolateInteractionValues(a, b, localT)
→ steppedFrameFlag(active)
```

### 16.3 active=0이 되는 정확한 조건

- `actionOffsets[actionKey].attackInteractionObject`가 없으면 `resolveActionOffsetAt()`의 `empty.active = 0`이 반환된다.
- keyframe에 `active`가 없거나 `active < 0.5`이면 `steppedFrameFlag()`가 0을 반환한다.
- progress가 두 keyframe 사이에 있으면 `interpolateInteractionValues(a, b)`가 뒤쪽 keyframe `b`가 아니라 앞쪽 keyframe `a.active`를 stepped 값으로 사용한다.
- 따라서 `0프레임 active=0`, `5프레임 active=1`이면 progress가 5프레임에 도달하기 전까지 active는 계속 0이다.
- progress가 마지막 keyframe t 이상이면 `interpolateFrameValues()`가 마지막 keyframe을 직접 반환하므로, 마지막 keyframe에 `active=1`이 저장되어 있다면 active는 1이 된다.
- start/end 구조에서는 `resolveActionOffsetAt()`이 `start.active`를 기준으로 active를 정한다. `end.active=1`이어도 `start.active=0`이면 active는 계속 0이다.

### 16.4 프레임 예시

Timeline frame이 `0, 1, 2, 3, 4, 5`이면 slot 기준 `t`는 `frame / 5`다.

| 저장된 keyframes                       | progress | 선택 / 계산 결과                             | active |
| -------------------------------------- | -------- | -------------------------------------------- | ------ |
| `5프레임 active=1`만 있음              | 0.1      | `t <= first.t`라 첫 keyframe 직접 반환       | 1      |
| `5프레임 active=1`만 있음              | 0.3      | `t <= first.t`라 첫 keyframe 직접 반환       | 1      |
| `5프레임 active=1`만 있음              | 0.6      | `t <= first.t`라 첫 keyframe 직접 반환       | 1      |
| `5프레임 active=1`만 있음              | 0.9      | `t <= first.t`라 첫 keyframe 직접 반환       | 1      |
| `0프레임 active=0`, `5프레임 active=1` | 0.1      | 0~5 사이 보간, 앞쪽 keyframe 0프레임 stepped | 0      |
| `0프레임 active=0`, `5프레임 active=1` | 0.3      | 0~5 사이 보간, 앞쪽 keyframe 0프레임 stepped | 0      |
| `0프레임 active=0`, `5프레임 active=1` | 0.6      | 0~5 사이 보간, 앞쪽 keyframe 0프레임 stepped | 0      |
| `0프레임 active=0`, `5프레임 active=1` | 0.9      | 0~5 사이 보간, 앞쪽 keyframe 0프레임 stepped | 0      |
| `0프레임 active=0`, `5프레임 active=1` | 1.0      | `t >= last.t`라 마지막 keyframe 직접 반환    | 1      |

### 16.5 수정 내용

- 코드 수정 없음.
- Runtime 재작성, Combat 수정, Editor 수정, HUD 추가, 저장 구조 변경, 로그 추가 없음.

### 16.6 QA

- `npm run check` 완료
- `git diff --check` 완료

## 17. Editor / Runtime Action 데이터 source 추적

### 17.1 이번에 확인한 것

- `docs/20_IMPLEMENTATION_RULES.md`, `docs/10_SRC_MAP.md`, `docs/99_TASK_REPORT.md`를 먼저 읽었다.
- Editor가 `attackInteractionObject.active = 1`을 어디에 쓰는지 확인했다.
- Runtime `player.getPartOffset('attackInteractionObject')`가 어떤 `actionOffsets`를 읽는지 확인했다.
- `default tuning → project/actor tuning → runtime player tuning` 우선순위를 확인했다.

### 17.2 Runtime이 읽는 actionOffsets의 실제 source

Editor write 경로:

```text
Interaction checkbox
→ interaction_editor_engine onWrite('active', 1)
→ action_interaction_panel_controller.update()
→ actionTimeline.writeFrameValue(partKey, prop, value)
→ timeline_action_adapter.writeFrameValue()
→ writeActionTimelineFrameValue()
→ actor.tuning.actionOffsets[actionKey].attackInteractionObject
→ applySelected()
→ actor.player.applyTuning(actor.tuning)
```

Runtime read 경로:

```text
actor.player.applyTuning(actor.tuning)
→ const next = clone(tuning)
→ player.actionOffsets = next.actionOffsets
→ player.getPartOffset('attackInteractionObject')
→ player.actionOffsets[player.actionKey].attackInteractionObject
```

### 17.3 Editor와 Runtime이 같은 객체인지 여부

- Editor와 Runtime은 `===` 같은 객체를 보지 않는다.
- `PuppetPlayer.applyTuning()`이 `clone(tuning)`을 만들기 때문에 `player.actionOffsets`는 `actor.tuning.actionOffsets`의 복사본이다.
- 다만 Interaction write 직후 `applySelected()`가 `actor.player.applyTuning(actor.tuning)`을 호출하므로, Runtime 복사본은 Editor 원본의 최신 값으로 다시 생성된다.
- 결론: Editor와 Runtime은 같은 객체를 보지 않는다. Runtime은 Editor 원본에서 갱신된 최신 복사본을 본다.

### 17.4 tuning 우선순위

```text
DEFAULT_PLAYER_TUNING
→ mergeTuning(defaultTuningFor(actorDef), savedActor.tuning)
→ actor.tuning
→ actor.player.applyTuning(actor.tuning)
→ player.actionOffsets clone
```

- 프로젝트 로드 / actor 생성 시 `mergeTuning()`이 default와 saved tuning을 merge / normalize한다.
- Editor는 `actor.tuning`을 직접 수정한다.
- Runtime은 `applyTuning()` 시점에 `actor.tuning`을 clone해서 `player.actionOffsets`로 사용한다.

### 17.5 수정 내용

- 코드 수정 없음.
- Runtime 재작성, Combat 수정, Editor UI 변경, HUD 추가, 저장 구조 변경, 로그 추가 없음.

### 17.6 QA

- `npm run check` 완료
- `git diff --check` 완료

## 18. 실제 Runtime attackInteractionObject 데이터 확인

### 18.1 실제 Runtime 데이터

- 브라우저 연결 표면은 사용할 수 없어 live page object에는 직접 붙지 못했다.
- 대신 현재 로컬 저장 파일인 `runtime/project-default-state.json`을 그대로 읽고, 앱과 같은 경로로 `mergeTuning(defaultTuningFor(def), savedActor.tuning) → new PuppetPlayer() → player.applyTuning(editorTuning)`을 실행해 Runtime 객체를 만들었다.
- 현재 player Runtime 상태:

```js
{
  actionKey: "idle",
  progress: 0,
  attackInteractionObject: {
    start: { active: 0, attack: 0 },
    end: { active: 0, attack: 0 },
    keyframes: [
      { id: "start", t: 0, active: 0, attack: 0, damage: 1, knockback: 0 },
      { id: "end", t: 1, active: 0, attack: 0, damage: 1, knockback: 0 }
    ]
  }
}
```

- 저장 원본 전체 스캔 결과:

```js
{
  activeAttackFramesFound: 0,
  result: []
}
```

### 18.2 Editor 데이터와 차이 여부

- 현재 `runtime/project-default-state.json` 기준으로는 Editor 저장 원본에도 `attackInteractionObject.active=1` 또는 `attack=1`인 frame이 없다.
- Runtime normalized clone에도 `active=1` 또는 `attack=1`인 frame이 없다.
- 따라서 현재 확인 가능한 실제 저장 데이터 기준으로 Editor 데이터와 Runtime 데이터의 active / attack 값 차이는 없다.

### 18.3 차이가 생기는 위치

- 이번 확인 데이터에서는 차이가 생기지 않았다.
- `raw saved → mergeTuning normalize → player.applyTuning clone → player.actionOffsets`까지 active / attack 값은 계속 0이다.
- 결론: 현재 로컬 저장 파일 기준 원인은 Runtime 계산이나 clone/normalize 변환이 아니라, Editor 저장 데이터에 공격 ON frame이 실제로 저장되어 있지 않은 것이다.

### 18.4 수정 내용

- 코드 수정 없음.
- Runtime 재작성, Combat 수정, HUD 기능 추가, Editor 수정, 저장 구조 변경, 로그 추가 없음.

### 18.5 QA

- `npm run check` 예정
- `git diff --check` 예정

## 19. Play 시작 Runtime tuning source 추적

### 19.1 Play 시작 흐름

```text
startBattleButton / homeStartButton click
→ bindBattleControls()
→ startRun()
→ battleActive = true
→ updateBattleActorMotion()
→ player.update()
→ resolveCombat()
```

- `startRun()`은 actor를 새로 만들거나 project state를 다시 load하지 않는다.
- `startRun()`은 위치 배치, run 상태 초기화, `battleActive` 전환만 수행한다.

### 19.2 Runtime tuning의 실제 source

앱 초기화 시 source:

```text
loadSavedState()
→ localStorage STORAGE_KEY
→ 없으면 runtime/project-default-state.json fallback
→ createActors()
→ mergeTuning(defaultTuningFor(def), savedActor.tuning)
→ actor.tuning
→ actor.player.applyTuning(actor.tuning)
→ player.actionOffsets clone
```

Editor 수정 시 source:

```text
Editor write
→ actor.tuning 수정
→ applySelected()
→ actor.player.applyTuning(actor.tuning)
→ saveState()
```

### 19.3 Editor와 Play가 같은 데이터를 사용하는지 여부

- 결론: A. Play는 현재 Editor 메모리의 tuning을 사용한다.
- 더 정확히는 Play가 기존 `actors` / `actor.player` 인스턴스를 그대로 사용한다.
- `player.actionOffsets`는 `actor.tuning` 자체가 아니라 마지막 `applyTuning(actor.tuning)` 시점에 만들어진 clone이다.
- UI 수정 경로는 `applySelected()`를 통해 즉시 `actor.player.applyTuning(actor.tuning)`을 호출하므로, Play는 Editor 메모리에서 갱신된 Runtime clone을 사용한다.
- `runtime/project-default-state.json`은 Play 버튼을 누를 때 읽는 데이터가 아니다.
- `runtime/project-default-state.json`은 앱 시작 시 localStorage가 없을 때 사용하는 project default fallback이다.

### 19.4 수정 내용

- 코드 수정 없음.
- Runtime 재작성, Combat 수정, HUD 추가, Editor UI 변경, 저장 구조 변경, 로그 추가 없음.

### 19.5 QA

- `npm run check` 완료
- `git diff --check` 완료

## 20. Editor Interaction 체크박스 write target 추적

### 20.1 실제 write 대상

수정 전 흐름:

```text
Interaction checkbox change
→ interaction_editor_engine onWrite(prop, value)
→ action_interaction_panel_controller.update()
→ currentTargetKey 또는 getWriteTargetKey()
→ actionTimeline.writeFrameValue(partKey, prop, value)
→ writeActionTimelineFrameValue()
→ actor.tuning.actionOffsets[actionSelect.value][partKey]
```

- Action은 `timeline_action_adapter.key()`가 읽는 `actionSelect.value`에 저장된다.
- Frame은 `actionTimelineSelection.activeKeyframeId` 또는 `fixedFrame`에 저장된다.
- 객체는 수정 전에는 `currentTargetKey`가 우선이었다.

### 20.2 Action / Frame 일치 여부

- Action 선택 상태와 write 대상 Action은 일치한다.
- Timeline에서 선택한 keyframe / fixed frame과 write 대상 Frame도 일치한다.
- 단, Interaction 역할 토글의 객체 선택은 role 기준이 아니라 현재 카드의 `currentTargetKey` 기준이라 갈라질 수 있었다.

### 20.3 active가 실제 메모리에서 바뀌는지

- 결론: B. 체크박스는 경우에 따라 다른 객체를 수정할 수 있었다.
- 예를 들어 Attack을 켜도 선택 카드 target이 `body`이면 `attackInteractionObject.active`가 아니라 `body.active` / `body.attack`에 저장될 수 있는 경로가 있었다.
- 그래서 Runtime이 읽는 `actor.tuning.actionOffsets[actionKey].attackInteractionObject`에는 active 0→1 변화가 생기지 않을 수 있었다.

### 20.4 수정 내용

- `interaction_editor_engine.js`가 checkbox / detail write에 `role` 메타를 넘기도록 수정했다.
- `interaction_object_editor_controller.js`에 `interactionObjectPartKeyForRole(role)` helper를 추가했다.
- `action_interaction_panel_controller.js`가 role이 있으면 `attack → attackInteractionObject`, `hurt → hurtInteractionObject`, `collision → collisionInteractionObject`, `guard → guardInteractionObject`를 write target으로 사용하도록 수정했다.
- Node 검증에서 `update('active', 1, { role: 'attack' })`와 `update('attack', 1, { role: 'attack' })`가 모두 `attackInteractionObject`에 쓰이는 것을 확인했다.

### 20.5 QA

- `npm run check` 완료
- `git diff --check` 완료

## 21. Background Layer 순서 변경 UI 단순화

### 21.1 이번에 한 일

- 배경 레이어 목록의 drag/drop reorder와 reorder animation 경로를 제거했다.
- 각 layer row에 `위로` / `아래로` 버튼을 추가했다.
- 버튼 클릭 시 `background.psdLayers` 배열에서 한 칸 swap하고, 각 layer의 `order`를 다시 부여한다.
- 순서 변경 후 `preloadSceneBackground()`, `saveState()`, `sync({ force: true })`를 호출해 화면 / 저장 / 리스트를 즉시 갱신한다.

### 21.2 수정 파일

- `src/background_panel_controller.js`
- `src/background_panel_view.js`
- `src/settingsBackgroundPanel.css`

### 21.3 유지한 기능

- 기존 layer visibility 변경 유지
- 기존 role 변경 유지
- 기존 numeric input / stepper 변경 유지
- PSD refresh / reset 흐름 유지

### 21.4 QA

- `npm run check` 완료
- `git diff --check` 완료

## 22. PSD Background Import WebP 최적화

### 22.1 이번에 한 일

- PSD 배경 exporter에서 preview와 각 PSD layer export 이미지를 저장 직전에 WebP로 변환하도록 유지했다.
- WebP 저장 전 긴 변이 2048px을 넘으면 비율 유지로 downscale하도록 추가했다.
- WebP export 품질을 0.85로 설정했다.
- manifest에 source 크기, export 크기, max dimension, export quality 메타를 기록하도록 했다.

### 22.2 PSD → WebP 변환 방식

```text
PSD composite / layer canvas
→ RGBA image
→ max(width, height) > 2048이면 LANCZOS resize
→ WebP quality 85 저장
→ runtime/background-preview.json layer image 경로로 연결
→ Editor / Runtime은 ./runtime/*.webp 이미지만 preload / draw
```

### 22.3 해상도 제한값

- `PSD_BACKGROUND_MAX_DIMENSION = 2048`
- `PSD_BACKGROUND_EXPORT_TYPE = "WEBP"`
- `PSD_BACKGROUND_EXPORT_QUALITY = 85`

### 22.4 에디터 / 런타임 사용 source

- `psd_background_helper.js`는 manifest의 layer image를 `./runtime/...webp?v=updatedAt`로 연결한다.
- `background_renderer.js`는 PSD 원본이 아니라 `background.psdLayers[].imageSrc`의 WebP/cache image만 draw한다.
- 기존 PNG / JPG / WebP 일반 배경 import 경로는 변경하지 않았다.

### 22.5 남은 위험 요소

- 현재 실행 환경에 Pillow가 없어 실제 PSD export 재생성 QA는 수행하지 못했다.
- 기존 runtime에 이미 생성되어 있는 WebP는 새 exporter를 다시 실행해야 2048px 제한과 quality 0.85가 반영된다.

### 22.6 QA

- `python3 -m py_compile tools/psd_preview_exporter.py tools/dev_server.py` 완료
- `npm run check` 완료
- `git diff --check` 완료

## 23. PSD Background WebP Downscale 버그 수정

### 23.1 downscale이 안 먹은 원인

- 실제 import endpoint는 `/api/psd/refresh → tools/dev_server.py export_background_preview() → tools/psd_preview_exporter.py export_psd_preview() → export_psd_layers() → save_webp()`였다.
- 4176 dev server가 코드 변경 전부터 떠 있어 오래된 exporter 모듈이 같은 `runtime/background-layers` 파일을 계속 덮어쓰고 있었다.
- exporter도 저장 후 실제 WebP 파일 크기를 검증하지 않아 5232px WebP가 남아도 실패하지 않았다.

### 23.2 수정한 export 함수

- `tools/psd_preview_exporter.py`의 `save_webp()`를 수정했다.
- 저장 전 `downscale_image_for_export()`로 긴 변 2048px 이하를 강제한다.
- 임시 `.tmp` WebP에 저장한 뒤 `verify_exported_webp_size()`로 실제 파일 크기를 재오픈 검증한다.
- 검증을 통과한 파일만 최종 output path로 atomic replace한다.
- manifest에는 `exportWidth` / `exportHeight`를 preview와 layer 모두에 기록한다.

### 23.3 생성된 WebP 실제 최대 크기

- `runtime/background-preview.webp`: 2048x752
- `runtime/background-layers/psd_layer_001.webp` ~ `psd_layer_019.webp`: 최대 2048x752
- `sips` 전수 확인 결과 2048px 초과 WebP 없음
- 가장 큰 새 layer 파일은 약 323KB

### 23.4 남은 위험 요소

- 기존에 떠 있는 dev server는 Python 모듈을 재로드하지 않으므로 exporter 수정 후 반드시 서버 재시작이 필요하다.
- 이번 작업 중 오래된 4176 dev server를 종료하고 `.venv` 기반 `npm run dev -- --port 4176`으로 다시 열었다.

### 23.5 QA

- `.venv/bin/python` 실제 PSD export 완료
- `sips`로 `runtime/background-preview.webp`와 `runtime/background-layers/*.webp` 실제 크기 전수 확인 완료
- `python3 -m py_compile tools/psd_preview_exporter.py tools/dev_server.py` 완료
- `npm run check` 완료
- `git diff --check` 완료
