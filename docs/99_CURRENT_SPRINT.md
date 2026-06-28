# 99_CURRENT_SPRINT.md

## Sprint 목표

Effect를 editable object interaction 흐름에 흡수한다.

목표는 별도 Effect 판정 시스템을 만들지 않고, 기존 editable object의 `active/attack/hurt/collision/guard/reaction` 규칙을 재사용하는 것이다.

## 핵심 원칙

- 모든 editable object는 같은 transform 규칙을 따른다.
- 모든 editable object는 같은 interaction state를 가질 수 있다.
- Runtime combat geometry는 `InteractionRegion`이다.
- Effect 전용 판정 geometry 계산을 만들지 않는다.
- clean init 방향을 유지한다.

## 완료한 작업

- Effect frame value에 interaction fields 추가.
- Effect keyframe interpolation에서 interaction toggle은 stepped value로 처리.
- Effect property panel에 공통 `판정/상호작용/공격/충돌` group 적용.
- Effect `active/attack/hurt/collision/guard` 변경 시 field group을 즉시 다시 렌더.
- Effect field limits가 Action editable object와 같은 interaction limit을 사용하도록 통합.
- `drawAttackTrail()`이 active Effect를 `player.hitRegions`에 기록.
- recorded Effect region에 `region.interaction = effectFrameValue`를 붙임.
- `interactionRegionRuntime`이 `region.interaction`을 우선 사용하도록 변경.
- 문서에 Effect interaction data/flow 반영.

## 변경한 파일과 변경 이유

- `src/animationFrames.js`
  - Effect frame value/interpolation에 interaction fields 추가.
- `src/tuningFieldGroups.js`
  - Effect와 Action이 같은 interaction property group 생성 함수를 공유.
- `src/tuningEffectTimelineController.js`
  - Effect active/role toggle 후 조건부 field group 갱신.
- `src/tuningParts.js`
  - Action/Effect interaction field limits 공통화.
- `src/actorEffectsRenderer.js`
  - rendered Effect를 공통 `recordPuppetImageRegion()` 경로로 기록.
- `src/interactionRegionRuntime.js`
  - recorded region의 inline interaction config 지원.
- `docs/11_DATA_MODEL.md`
  - Effect frame value에 interaction fields 추가.
- `docs/12_EDITOR_FLOW.md`
  - Effect interaction runtime flow 추가.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 상태로 갱신.

## 변경된 데이터 흐름

```text
Effect Timeline
→ tuning.effectOffsets[effectKey]
→ active/attack/hurt/collision/guard/reaction fields
→ actorEffectsRenderer.drawAttackTrail()
→ player.hitRegions[effect:effectKey].interaction
→ interactionRegionRuntime.createActiveInteractionRegions()
→ combatSystem
```

## 제거한 중복 또는 예외 처리

- Effect interaction field group 전용 코드 생성하지 않음.
- Effect interaction field limits를 별도로 유지하지 않음.
- Effect runtime 판정 geometry 전용 계산을 만들지 않음.
- Runtime region 생성이 part offset만 읽던 예외를 줄이고 `region.interaction`도 처리.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Effect render entry point는 `actorEffectsRenderer.drawAttackTrail()` 유지.
- Effect 저장 위치는 `tuning.effectOffsets` 유지.
- Action pose 저장 위치는 `tuning.poseOffsets` 유지.
- fallback interaction object 4개는 유지.
- Runtime combat system의 판정 규칙 자체는 변경하지 않음.
- Firebase migration은 추가하지 않음.

## 아직 남아있는 예외 처리

- Effect renderer는 아직 `puppetPlayerRenderer` 안으로 합쳐지지 않았다.
- Effect region은 현재 attack trail render가 실행될 때만 기록된다.
- Effect asset이 없거나 opacity가 0이면 region도 기록되지 않는다.
- fallback interaction object helper는 아직 별도 파일에 남아 있다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: Effect interaction frame smoke test.
  - Effect frame에 `active/attack/stun/knockbackX` 저장 확인.
  - Effect property group에 `판정/상호작용/공격` 표시 확인.
  - Effect toggle interpolation이 stepped value로 유지됨 확인.
- 통과: recorded Effect interaction region smoke test.
  - `region.interaction` 기반 attack region 생성 확인.
  - role이 맞지 않으면 region 생성 안 됨 확인.
- 통과: `http://127.0.0.1:5514/setting.html` HTTP 200.
- 제한: 인앱 브라우저 목록이 비어 있어 실제 `setting.html` 클릭/드래그 QA는 수행하지 못함.

## 알려진 위험 요소

- Effect region 기록은 draw timing에 의존한다.
- Effect와 body part renderer가 아직 같은 파일/entry point를 쓰지는 않는다.
- Effect interaction을 켜도 active attack trail이 없으면 Runtime region은 생기지 않는다.

## 다음 Sprint 추천

1. Effect renderer 흡수.
   - `actorEffectsRenderer`의 transform/region 기록을 더 공통 object render path로 이동.
2. fallback interaction object helper 축소.
   - role definition 기반으로 `tuningInteractionObjects.js` 단순화.
3. 실제 UI QA.
   - Effect Timeline에서 active/attack/hurt/collision/guard 토글 확인.
   - Effect attack region과 hurt/collision/guard region 충돌 확인.
4. object definition 도입 검토.
   - field/capability/limits/role을 데이터 기반으로 묶을지 결정.

## 리팩토링 후보와 이유

- `src/actorEffectsRenderer.js`
  - Effect render와 region 기록이 남아 있는 별도 renderer.
- `src/tuningFieldGroups.js`
  - field group을 object definition 기반으로 바꿀 수 있음.
- `src/tuningParts.js`
  - capability/limits/part key 책임이 같이 있음.
- `src/interactionRegionRuntime.js`
  - fallback region과 recorded region 생성 책임을 더 나눌 수 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 500줄 근처. 저장 schema 변경 전 분리 검토 필요.
- `src/puppetPlayerRenderer.js`: renderer/edit region 기록 책임 집중.
- `src/tuningEffectTimelineController.js`: 400줄 근처. Effect UI와 timeline mutation 연결 책임이 큼.
