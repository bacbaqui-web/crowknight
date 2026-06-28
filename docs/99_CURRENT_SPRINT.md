# 99_CURRENT_SPRINT.md

## Sprint 목표

Editable object handle 표시 정책을 통일한다.

같은 transform을 가진 객체는 같은 handle set을 보여야 한다.

## 핵심 원칙

- 같은 UX는 같은 handle을 사용한다.
- 기준점/이동/크기/회전/투명 handle은 editable transform object의 기본 조작이다.
- 특정 객체만 handle을 숨기는 예외를 줄인다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- InteractionObject에도 opacity handle 표시.
- InteractionObject에도 anchor handle 표시.
- Action context에서 anchor handle을 move로 바꾸던 정책 제거.
- Hover cursor도 anchor를 anchor 그대로 표시.
- Action anchor drag가 `poseOffsets[poseKey][partKey].ax/ay`로 기록되도록 변경.
- 불필요해진 `canvasPartHandleMode()` 제거.

## 변경한 파일과 변경 이유

- `src/editHandleGeometry.js`
  - InteractionObject가 Part/Effect와 같은 handle set을 갖도록 변경.
- `src/canvasDragApply.js`
  - pose context anchor drag가 `ax/ay` frame value로 기록되도록 변경.
- `src/tuningCanvasPointerDrag.js`
  - anchor handle을 move로 바꾸던 변환 제거.
- `src/tuningCanvasDragFactory.js`
  - hover mode에서 anchor 예외 제거.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
InteractionObject
→ no opacity handle
→ no anchor handle
```

```text
Action Part anchor handle
→ move handle로 변환
→ x/y 변경
```

After:

```text
Editable object handle
→ move / width / height / size / rotate / opacity / anchor
```

```text
Action Part anchor handle
→ applyCanvasPartDrag(anchor)
→ writePoseFrameValue(partKey, 'ax'/'ay')
→ tuning.poseOffsets[poseKey][partKey].ax/ay
```

## 제거한 중복 또는 예외 처리

- InteractionObject opacity handle 숨김 제거.
- InteractionObject anchor handle 숨김 제거.
- Action non-master anchor를 move로 바꾸던 예외 제거.
- Hover에서 anchor를 move로 바꾸던 예외 제거.
- `canvasPartHandleMode()` 제거.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Master/root handle 정책은 유지.
- Group edit handle 정책은 유지.
- Effect pointer down entry는 유지.
- Effect preview/render entry는 유지.
- InteractionObject 저장 구조는 유지.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Effect pointer down entry는 아직 별도다.
- Effect value adapter는 아직 별도다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: InteractionObject full handle geometry smoke test.
  - move/width/height/size/rotate/opacity/anchor 모두 생성 확인.
- 통과: pose anchor handle write smoke test.
  - Action anchor drag가 `ax/ay` writer로 기록됨 확인.
- 제한: 실제 `setting.html` 브라우저 클릭/드래그 QA는 수행하지 않음.

## 알려진 위험 요소

- InteractionObject에 새로 보이는 opacity/anchor handle은 실제 UI QA가 필요하다.
- Action에서 anchor handle이 이제 실제 `ax/ay`를 바꾸므로 기존 사용 감각과 달라질 수 있다.
- Master/Group은 여전히 다른 규칙을 갖기 때문에 “완전 통일”은 아직 아니다.

## 다음 Sprint 추천

1. 실제 UI QA.
   - Setup InteractionObject anchor/opacity handle.
   - Action Part anchor handle.
   - Action InteractionObject anchor/opacity handle.
   - Effect anchor/opacity handle.
2. Effect pointer down routing 통합.
   - `handleEffectCanvasPointerDown()`을 일반 pointer down 경로로 흡수.
3. Master/root transform 정리 설계.
   - `anchorX/anchorY`를 editable transform 규칙에 맞출지 결정.
4. Group edit 규칙 정리 설계.
   - Group도 같은 handle set을 유지할지 결정.

## 리팩토링 후보와 이유

- `src/tuningCanvasPointerDrag.js`
  - Effect pointer down과 Part pointer down이 아직 분리.
- `src/tuningEditHandleGeometry.js`
  - Effect context routing이 남아 있음.
- `src/effectVisualValues.js`
  - Effect display/input 변환만 별도.
- `src/tuningParts.js`
  - capability/limits/source 역할이 한 파일에 모임.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
