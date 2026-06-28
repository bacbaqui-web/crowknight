# 99_CURRENT_SPRINT.md

## Sprint 목표

Editable Object Model 전환.

InteractionBox를 특수 투명 박스가 아니라 공통 editable object로 정착시킨다.

## 핵심 원칙

- `x/y` = anchor position.
- `ax/ay` = local anchor point.
- `w/h` = size.
- `rot` = anchor 기준 rotation.
- `opacity` = appearance.
- `active` = interaction state.
- Setup은 base rig.
- Action은 base rig 위 pose offset.
- Runtime mirror는 만들지 않는다.
- 커밋은 큰 단위가 안정화될 때만 한다.

## 완료한 작업

- `editableTransform.js`를 `editableObjectModel.js`로 전환.
- transform/appearance/interaction helper 추가.
- InteractionBox rig에 `ax/ay/opacity` 추가.
- InteractionBox `x/y` 의미를 top-left에서 anchor position으로 정리.
- old top-left InteractionBox 저장값 normalize 보정 추가.
- image-less rect render/edit target이 `x/y/ax/ay/w/h/rot/opacity`를 사용하도록 변경.
- Runtime InteractionRegion이 `x/y/ax/ay/w/h/rot`와 pose offset `ax/ay`를 반영하도록 변경.
- InteractionBox resize 시 `x/y`를 같이 바꾸던 보정 제거.
- Part/InteractionBox/Effect resize 계산을 `editableObjectModel.js` helper로 이동.
- Action pose frame value와 interpolation에 `ax/ay` 추가.
- image part/control group/InteractionBox 렌더가 pose offset `ax/ay`를 반영하도록 변경.
- Effect preview/runtime render가 `centerOffsetEditableTransform()`을 사용하도록 변경.
- InteractionBox Setup/Action property에 `ax/ay`, `opacity` 표시.
- Action의 모든 editable object에 `판정` ON/OFF 표시.
- `active`가 켜진 모든 editable object에서 `판정 설정` 그룹 표시.
- `판정 설정` 그룹은 `poseOffsets[poseKey][partKey]`의 `stun/knockbackX/knockbackY/deathBurst`를 읽고 쓴다.
- `active`를 켜거나 끄면 Action property field가 다시 렌더되어 판정 설정이 보이거나 숨는다.
- `active` scrub control을 숫자 편집이 아니라 클릭 ON/OFF 토글로 변경.
- Runtime combat reaction이 `attackEffects` 대신 `attackInteractionRegion.reaction`을 사용하도록 변경.
- `attackEffects` 저장 구조와 static tuning field 제거.
- 기본 공격 반응값을 `attackInteractionBox` pose frame default로 이동.

## 변경한 파일과 이유

- `src/editableObjectModel.js`
  - editable object transform/appearance/interaction 공통 helper.
- `src/playerDefaultRig.js`
  - InteractionBox 기본값을 anchor/opacity 모델로 변경.
- `src/tuningNormalize.js`
  - old InteractionBox 저장값과 pose active 기본값 normalize.
- `src/puppetPlayerRenderer.js`
  - image/image-less part 렌더가 `ax/ay/opacity`를 반영.
- `src/puppetPlayerEditRegions.js`
  - edit handle target에 `ax/ay/opacity` 기록.
- `src/interactionBoxRuntime.js`
  - Runtime region geometry가 anchor 모델을 사용.
  - Runtime region에 공통 `reaction` 값 기록.
- `src/combatSystem.js`
  - 피격 반응값을 `attackEffects`가 아니라 충돌한 region의 `reaction`에서 읽도록 변경.
- `src/playerDefaultTuning.js`
  - 기본 공격 반응값을 저장 구조가 아닌 pose frame default에 주입.
- `src/canvasDragApply.js`
  - resize 결과 계산을 공통 helper로 통합.
- `src/canvasVisualValues.js`
  - InteractionBox W/H 변경 시 X/Y 보정 제거.
- `src/animationFrames.js`
- `src/puppetPlayer.js`
- `src/puppetPlayerGeometry.js`
- `src/canvasDragState.js`
- `src/actionBaseTransform.js`
  - Action pose `ax/ay/active/stun/knockbackX/knockbackY/deathBurst` 흐름 추가.
- `src/settingsDebugRenderer.js`
  - InteractionBox preview opacity 반영.
- `src/settingsEffectPreviewRenderer.js`
- `src/actorEffectsRenderer.js`
  - Effect render/resize 계산을 editable object helper로 정렬.
- `src/tuningFieldGroups.js`
  - Action editable object에 공통 `판정` 표시.
  - active object에서만 `판정 설정` 표시.
- `src/tuningPanelPartController.js`
  - 판정 설정 field를 pose frame value로 직접 라우팅.
- `src/tuningScrubControls.js`
  - `active`를 클릭 토글로 변경.
  - `stun/deathBurst` 소수 표시와 scrub step 보정.
- `docs/10_SRC_MAP.md`
- `docs/11_DATA_MODEL.md`
- `docs/12_EDITOR_FLOW.md`
- `docs/99_CURRENT_SPRINT.md`
  - 변경 구조 기록.

## 변경된 데이터 흐름

```text
Setup InteractionBox
→ tuning.rig[boxKey].x/y/ax/ay/w/h/rot/opacity
→ puppetPlayerRenderer image-less rect
→ recordPuppetRectPart()
→ player.editHandles[boxKey]
→ handle/debug preview
```

```text
Action editable object
→ tuning.poseOffsets[poseKey][partKey].x/y/ax/ay/w/h/rot/opacity/active
→ tuning.poseOffsets[poseKey][partKey].stun/knockbackX/knockbackY/deathBurst
→ timeline interpolation
→ player.getPartOffset(partKey)
→ renderer / editor preview
```

```text
판정 설정
→ editable object active >= 0.5
→ Action property에 판정 설정 표시
→ tuning.poseOffsets[poseKey][partKey].stun/knockbackX/knockbackY/deathBurst
→ attackInteractionRegion.reaction
→ combatSystem.applyHitReaction()
```

## 제거한 중복 또는 예외 처리

- InteractionBox resize 시 center 기준으로 `x/y`를 재계산하던 예외 제거.
- Runtime InteractionRegion의 고정 center 계산 제거.
- Effect render/resize의 직접 draw rect 산식 일부 제거.
- InteractionBox opacity 없는 특수 객체 예외 제거.
- `combatSystem`의 `attackEffects` 조회 제거.
- `gameConfig.TUNING_FIELDS`의 attackEffects static field 제거.
- `tuningNormalize`의 attackEffects normalize 제거.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- InteractionBox key 유지.
- `tuning.rig[boxKey]` 저장 위치 유지.
- `tuning.poseOffsets[poseKey][boxKey]` 저장 위치 유지.
- Runtime combat geometry는 아직 `attackInteractionBox`를 사용.
- Background/HUD 구조 미수정.
- 커밋 없음.

## 아직 남아있는 예외 처리

- Effect 저장 필드는 아직 `anchorX/Y`다.
- Runtime attack geometry는 아직 공통 object 전체가 아니라 `attackInteractionBox` 중심이다.
- Browser 기반 실제 클릭/드래그 QA는 아직 못 했다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: dev server `http://127.0.0.1:5512/setting.html` HTTP 200.
- 통과: `src/combatSystem.js` HTTP module 응답.
- 통과: `posePropertyGroups()` smoke test.
  - 일반 `weapon/body`도 `판정` 그룹 표시.
  - `active = 0`이면 판정 설정 숨김.
  - `active = 1`이면 일반 object도 판정 설정 표시.
  - `master` basis에는 판정 그룹 미표시.
- 통과: 이전 스모크 테스트.
  - InteractionBox normalize.
  - resize helper.
  - Runtime InteractionRegion bounds.
  - pose `ax/ay` interpolation.
  - Effect draw/resize adapter.
- 통과: `attackEffects` 제거 smoke test.
  - 기본 tuning/normalize 결과에 `attackEffects` 없음.
  - 기본 공격 반응값이 `attackInteractionBox` pose frame에 존재.
- 통과: Runtime region `reaction` smoke test.
- 제한: 실제 `setting.html` UI 드래그 QA 미수행.

## 알려진 위험 요소

- 저장된 InteractionBox의 `x/y` 의미가 normalize 후 anchor position으로 바뀐다.
- Action `ax/ay`는 데이터 흐름에 연결됐지만 실제 UX 확인이 필요하다.
- `opacity = 0`이어도 combat `active`는 별도다.
- Runtime combat reaction source는 pose frame으로 이동했다.
- Runtime attack geometry source는 아직 `attackInteractionBox`다.

## 다음 Sprint 추천

1. 실제 UI QA.
   - Setup/Action에서 4개 InteractionBox move/resize/rotate/opacity 확인.
   - 일반 part/InteractionBox에서 `active` ON/OFF field 표시 확인.
   - 일반 part/InteractionBox에서 판정 설정 표시 확인.
2. Interaction Definition 확장.
   - collision/hurt/guard에 필요한 runtime option 정의.
   - active/role/settings를 object definition 기반으로 정리.
3. Runtime attack geometry 공통화.
   - `attackInteractionBox` 고정 geometry를 active object 기반 geometry로 바꿀지 결정.
4. Effect 저장 모델 정리.
   - `anchorX/Y` 유지 또는 `ax/ay` 전환 결정.
5. Group resize 계산 공통화.

## 리팩토링 후보와 이유

- `src/tuningFieldGroups.js`
  - object definition 기반 field 생성으로 통합 가능.
- `src/tuningPanelPartController.js`
  - pose field rendering 책임 분리 가능.
- `src/canvasDragApply.js`
  - transform drag result를 더 작게 분리 가능.
- `src/interactionBoxRuntime.js`
  - parent transform 계산과 region 계산 분리 가능.
- `src/puppetPlayerRenderer.js`
  - image part와 image-less rect part transform helper 분리 가능.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 500줄 근처. normalize 책임이 계속 늘고 있다.
- `src/puppetPlayerRenderer.js`: transform 책임 집중.
- `src/tuningPanelPartController.js`: field 표시와 값 라우팅이 함께 있어 다음 분리 후보.
