# 99_CURRENT_SPRINT.md

## Sprint 목표

After Effects식 공통 Transform 규칙을 추가하고 리팩토링 계획을 수립한다.

## 핵심 원칙

- 모든 editable object는 After Effects Transform 모델을 따른다.
- `x/y` = Position. 부모 좌표계에서 anchor point의 위치.
- `ax/ay` = Anchor Point. 객체 local rect 안에서 anchor point의 위치.
- `w/h` = Size. 객체 local rect의 크기.
- `rot` = Rotation. anchor point 기준 회전.
- Render formula: `translate(x, y) → rotate(rot) → drawRect(-ax, -ay, w, h)`.

## 완료한 작업

- Transform 규칙을 `02_DECISIONS.md`에 구조 결정으로 추가.
- Transform 규칙을 `03_ARCHITECTURE.md`에 현재 목표 구조로 추가.
- `12_EDITOR_FLOW.md`에 편집 흐름 기준 Transform formula 추가.
- 대규모 구현은 아직 진행하지 않음.

## 변경한 파일과 이유

- `docs/02_DECISIONS.md`: After Effects Transform 모델을 프로젝트 결정으로 고정.
- `docs/03_ARCHITECTURE.md`: 모든 editable object의 공통 좌표 규칙 추가.
- `docs/12_EDITOR_FLOW.md`: Canvas/Edit 흐름의 기준 formula 추가.
- `docs/99_CURRENT_SPRINT.md`: 리팩토링 계획 기록.

## 목표 데이터 흐름

```text
editable object
→ common Transform model
→ common handle geometry
→ common drag/resize/rotate math
→ context writer
→ Setup / Action / Effect / Stage data
```

## 단계별 리팩토링 계획

1. Audit
   - `x/y/ax/ay/w/h/rot` 해석을 Setup, Action, Effect, Stage, HUD, InteractionBox별로 조사.
   - 저장값과 화면 렌더값이 다른 지점 목록화.

2. Common Transform Module
   - 순수 함수 모듈 추가.
   - 후보: `src/editableTransform.js`.
   - 책임: local rect, anchor, matrix, bounds, handle point, resize 결과 계산.

3. Image Part 적용
   - 일반 image part 렌더/handle이 공통 Transform module을 사용하게 변경.
   - 기존 part 동작 QA 후 다음 단계 진행.

4. InteractionBox 적용
   - InteractionBox에 `ax/ay`를 명시.
   - image-less part도 같은 Transform module을 사용.
   - 전용 resize 보정 제거.

5. Action Pose 적용
   - `poseOffsets[poseKey][partKey]`가 base transform 위의 delta로 같은 규칙을 따르는지 정리.
   - Action handle/field/canvas drag 결과가 같은 writer를 쓰게 정리.

6. Effect 적용
   - Effect rect/image transform을 같은 규칙으로 통합.
   - Effect handle geometry 중복 제거.

7. Stage / Background / HUD 검토
   - 배경 객체와 HUD가 editable object가 될 경우 같은 Transform 규칙을 사용하게 설계.
   - 지금 저장 구조와 충돌하는 경우 별도 Sprint로 분리.

8. QA Gate
   - Setup part move/resize/rotate.
   - InteractionBox move/resize/rotate.
   - Action first frame/base delta.
   - Effect preview resize/rotate.
   - 저장 후 reload.

## 제거할 중복 또는 예외 처리 후보

- InteractionBox 전용 resize 보정.
- Effect handle geometry와 Part handle geometry의 중복.
- Canvas visual value 변환의 context별 중복.
- Renderer의 image part와 image-less part transform 계산 중복.

## 유지할 구조

- Editor와 Runtime 분리.
- Runtime mirror 없음.
- InteractionBox 저장 key 유지.
- Action은 Setup base 위의 Timeline delta.

## 알려진 위험 요소

- 큰 저장 구조 변경이 될 수 있다.
- 기존 localStorage/Firebase 데이터 reset이 필요할 수 있다.
- `ax/ay`를 InteractionBox/Effect에 추가하면 field, normalize, renderer, drag가 함께 바뀐다.
- 한 Sprint에서 전체 적용하면 위험이 크다.

## 다음 Sprint 추천

1. Transform Audit Sprint.
2. Common Transform Module 설계/추가 Sprint.
3. Image Part 1차 적용 Sprint.

## 리팩토링 후보

- `src/canvasDragApply.js`: resize/rotate 계산 중심.
- `src/canvasVisualValues.js`: context별 저장값 변환 중심.
- `src/editHandleGeometry.js`: handle point 계산 중심.
- `src/puppetPlayerRenderer.js`: render transform 계산 중심.
- `src/interactionBoxRuntime.js`: runtime region transform 계산 중심.
