# 99_CURRENT_SPRINT.md

## Sprint 목표

기능 공통화 재개.

이번 Sprint는 `Property` 편집 그룹 생성 규칙을 공통화했다.

목표:

- Setup / Action / Effect가 쓰는 field group 생성 중복을 줄인다.
- “기준 / 위치 / 크기 / 회전 / 투명 / 판정” 그룹 생성 규칙을 한 곳으로 모은다.
- Action / Effect가 쓰는 interaction toggle 판단을 한 곳으로 모은다.
- Property / Transform / Scrub이 쓰는 `w/h` 판정과 `baseW/baseH` 선택 규칙을 공유한다.
- UI 동작, 저장 구조, Runtime 동작은 변경하지 않는다.

## 왜 진행했는가

Rename Sprint가 끝났고, 다음 목표는 다시 구조 공통화다.

문서 기준 다음 후보는:

1. Transform Editor / Handle / Property 저장 규칙 예외 축소.
2. Timeline Action / Effect glue 공통화.
3. Stage / HUD는 마지막 단계 보류.

이번 Sprint에서는 가장 작은 단위인 `Property` 그룹 생성 중복부터 줄였다.

이유:

- `property_field_groups.js`는 이미 Setup / Action / Effect가 공유하는 파일이다.
- 하지만 내부에서 같은 field group을 영역별로 반복 생성하고 있었다.
- 작은 변경으로 공통 경로를 늘릴 수 있다.
- Stage/HUD를 건드리지 않아도 된다.

## 완료한 작업

### 1. Property group builder 공통화

변경 파일:

- `src/property_field_groups.js`

변경 내용:

- `editableTransformPropertyGroups()` 추가.
- 기준 / 위치 / 크기 / 회전 / 투명 / 판정 그룹 생성을 이 함수로 통합.
- `effectPropertyGroups()`가 공통 builder를 사용.
- `groupPosePropertyGroups()`가 공통 builder를 사용.
- `partPropertyGroups()`가 공통 builder를 사용.
- `posePropertyGroups()`가 공통 builder를 사용.

기존 UI 순서는 유지했다.

### 2. size label 판단 분리

추가한 local helper:

- `partSizeGroupLabel(partKey)`
- `poseSizeGroupLabel(partKey)`

이유:

- Setup Part와 Action Pose는 size label 조건이 조금 다르다.
- 공통 builder에 조건식을 직접 넣지 않고, 호출부 근처에서 의미를 분리했다.

### 3. Sprint 문서 갱신

변경 파일:

- `docs/99_CURRENT_SPRINT.md`
- `docs/sprint-dashboard.html`

내용:

- Rename 종료 후 첫 공통화 Sprint로 기록.
- 변경 파일과 검증 결과 기록.
- 다음 공통화 후보 기록.

### 4. Interaction toggle 판단 공통화

변경 파일:

- `src/property_value_helper.js`
- `src/part_editor_controller.js`
- `src/timeline_effect_controller.js`

변경 내용:

- `property_value_helper.js`에서 `isInteractionToggleProp(prop)` export.
- 기존 Action pose property 갱신 후 field re-render 조건이 이 helper를 사용.
- 기존 Effect property 갱신 후 field re-render 조건이 이 helper를 사용.
- `active / attack / hurt / collision / guard` 목록을 한 곳으로 모음.

이유:

- 같은 판정 toggle 목록이 Action / Effect / value 변환에 흩어져 있었다.
- 나중에 interaction toggle이 추가될 때 한쪽만 갱신되는 위험을 줄인다.

### 5. Size prop 판단 공통화

변경 파일:

- `src/property_value_helper.js`
- `src/transform_value_helper.js`
- `src/property_scrub_helper.js`

변경 내용:

- `property_value_helper.js`에서 `isSizeProp(prop)` export.
- `property_value_helper.js`에서 `sizeBaseProp(prop)` export.
- `property_value_helper.js` 내부의 `w/h` 판단을 `isSizeProp()`로 정리.
- `transform_value_helper.js`가 size 판단과 `baseW/baseH` 선택을 같은 helper로 사용.
- `property_scrub_helper.js`가 size 입력 step, percent 표시, scrub step 판단에 같은 helper를 사용.

이유:

- Property input, Canvas drag, Scrub input이 모두 `w/h`를 size로 다루는데 판단 로직이 흩어져 있었다.
- 같은 기본 transform 규칙은 같은 helper를 사용해야 한다.

## 변경 전 구조

`property_field_groups.js` 안에서 각 함수가 비슷한 field group을 직접 만들었다.

```text
effectPropertyGroups()
→ 기준 / 위치 / 크기 / 회전 / 투명 / 판정 직접 생성

groupPosePropertyGroups()
→ 위치 / 크기 / 회전 / 투명 직접 생성

partPropertyGroups()
→ 조건별 기준 / 위치 / 크기 / 회전 / 투명 직접 생성

posePropertyGroups()
→ 조건별 기준 / 위치 / 크기 / 회전 / 투명 / 판정 직접 생성
```

문제:

- 같은 UI 그룹 이름과 prop 배열이 여러 번 반복됐다.
- Property 그룹 규칙을 바꿀 때 Setup / Action / Effect 중 일부만 고칠 위험이 있었다.

## 변경 후 구조

```text
effectPropertyGroups()
groupPosePropertyGroups()
partPropertyGroups()
posePropertyGroups()
        ↓
editableTransformPropertyGroups()
        ↓
기준 / 위치 / 크기 / 회전 / 투명 / 판정 그룹 생성
```

결과:

- field group 생성의 중심이 하나 생겼다.
- Setup / Action / Effect가 같은 Property 그룹 builder를 공유한다.
- 각 context의 차이는 옵션으로만 남았다.

## 변경된 데이터 흐름

저장 데이터 흐름은 변경 없음.

Property 표시 흐름만 내부 생성 경로가 정리됐다.

```text
part_editor_controller.js
→ partPropertyGroups() / posePropertyGroups()
→ editableTransformPropertyGroups()
→ property_scrub_helper.renderScrubGroups()
```

```text
timeline_effect_controller.js
→ effectPropertyGroups()
→ editableTransformPropertyGroups()
→ property_scrub_helper.renderScrubGroups()
```

Interaction toggle 판단:

```text
part_editor_controller.js
timeline_effect_controller.js
property_value_helper.js
        ↓
property_value_helper.isInteractionToggleProp()
```

Size prop 판단:

```text
property_value_helper.js
transform_value_helper.js
property_scrub_helper.js
        ↓
property_value_helper.isSizeProp()
property_value_helper.sizeBaseProp()
```

저장 경로는 그대로:

- Setup: `tuning.rig`
- Action: `tuning.poseOffsets`
- Effect: `tuning.effectOffsets`

## 제거한 중복 또는 예외 처리

제거한 중복:

- `위치` 그룹 생성 반복.
- `크기` 그룹 생성 반복.
- `회전` 그룹 생성 반복.
- `투명` 그룹 생성 반복.
- `판정` active 그룹 생성 반복.
- `active / attack / hurt / collision / guard` toggle 목록 중복.
- `w/h` size prop 판단 중복.
- `baseW/baseH` 선택 중복.

남긴 context 차이:

- Master part의 `anchorX/anchorY` 단독 표시.
- Setup Part와 Action Pose의 size label 차이.
- Interaction 세부 그룹은 `active`가 켜졌을 때만 표시.

## 유지한 구조와 의도적으로 건드리지 않은 부분

유지:

- Property UI 표시 순서.
- Field label.
- Field prop.
- `appendInteractionPropertyGroups()` 동작.
- Interaction toggle 대상 목록.
- `w/h` size prop 의미.
- `baseW/baseH` 선택 규칙.
- 저장 구조.
- Runtime.
- Stage/HUD.
- Timeline 로직.
- Transform drag 로직.

의도적으로 하지 않은 작업:

- 새 파일 생성.
- 함수명 대규모 rename.
- Stage/HUD 공통화.
- Property value 변환 규칙 변경.
- Canvas drag 계산 변경.

## 아직 남아있는 예외 처리

- Master part는 아직 `anchorX/anchorY` 단독 그룹을 사용한다.
- Interaction 세부 설정은 `active >= 0.5`일 때만 표시된다.
- Group Pose는 `w/h`가 아니라 `scale`을 사용한다.
- Stage/HUD는 아직 Common Editing 밖에 있다.

## 검증 방법 및 결과

- `npm run check`: 통과.
- `prettier --check .`: 통과. (`npm run check` 안에서 실행)
- `eslint .`: 통과. (`npm run check` 안에서 실행)
- `git diff --check`: 통과.
- relative import existence check: 통과.
- Interaction toggle 중복 검색: 통과.
  - Action / Effect controller는 `isInteractionToggleProp()`를 사용한다.
- Size prop 중복 검색: 통과.
  - Property / Transform / Scrub의 `w/h` 판단은 `isSizeProp()`를 사용한다.
- `setting.html` HTTP 200 확인: 통과.
  - `/setting.html`: 200.
  - `/src/property_field_groups.js`: 200.
  - `/src/property_value_helper.js`: 200.
  - `/src/property_scrub_helper.js`: 200.
  - `/src/transform_value_helper.js`: 200.
  - `/src/part_editor_controller.js`: 200.
  - `/src/timeline_effect_controller.js`: 200.
  - `/docs/99_CURRENT_SPRINT.md`: 200.
  - `/docs/sprint-dashboard.html`: 200.

아직 수행하지 않은 QA:

- 실제 브라우저에서 Setup Part property 패널 확인.
- Action Part property 패널 확인.
- Effect property 패널 확인.

이번 변경은 field group 생성 함수 리팩토링이라 화면 표시 QA가 필요하다.

## 알려진 위험 요소

- Property 그룹 표시 순서가 깨지면 UI가 달라진다.
- `sizeLabel` 조건이 틀리면 “크기 / 그룹 크기” 표시가 바뀐다.
- Interaction active 조건은 그대로 유지했지만 실제 화면 QA가 필요하다.

## 다음 Sprint 추천 작업

1. Property 패널 QA.
   - Setup Part.
   - Action Part.
   - Effect.
   - Interaction active ON/OFF.
2. Transform Editor 저장 규칙 공통화 계속.
   - `transform_value_helper.js`
   - `property_value_helper.js`
3. Timeline Action / Effect glue 잔여 공통화.
4. Stage/HUD는 마지막까지 보류.

## 리팩토링 후보와 이유

### `property_value_helper.js` / `transform_value_helper.js`

- 이유: Property input과 Canvas drag가 같은 저장 의미를 가져야 한다.
- 목표: 표시값 변환과 drag 저장값 변환의 예외를 더 줄인다.

### Timeline glue

- 이유: Action / Effect Timeline은 공통 controller를 쓰지만 controller별 접착 코드가 남아 있다.

### Group Pose

- 이유: `scale` 기반 그룹 편집은 일반 `w/h` transform과 다른 예외다.

## 파일 크기 또는 구조상 주의할 점

- `property_field_groups.js`는 작고 안전한 공통화 대상이었다.
- 다음 공통화는 `property_value_helper.js`, `transform_value_helper.js`처럼 저장값에 가까운 파일이므로 QA 부담이 더 크다.
- 큰 파일에 기능을 흡수하지 말고 작은 공통 helper를 유지한다.
