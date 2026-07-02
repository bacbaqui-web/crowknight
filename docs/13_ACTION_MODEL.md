# 13_ACTION_MODEL.md

이 문서는 Action 제작 모델만 설명한다.

저장 위치는 `11_DATA_MODEL.md`, 사용자 조작 흐름은 `12_EDITOR_FLOW.md`를 본다.

## Goal

```text
Action = Timeline + Interaction + Modifiers
```

- Timeline: 파츠와 효과의 시간 변화.
- Interaction: 충돌, 피격, 공격, 방어 box와 frame state.
- Modifiers: Action 실행 중 자기 자신에게 적용되는 규칙.
- Trigger: Custom Action을 언제 시작할지 정하는 입력 조건. Runtime Rule이 해석한다.

Runtime은 Action을 만들지 않는다. Runtime은 Action 데이터를 해석해서 실행한다.

## Block Assembly Principle

Action은 레고처럼 공통 블록을 조립해서 만든다.

새 기능은 먼저 네 가지 블록 중 어디에 속하는지 분류한다.

```text
New Feature
├─ Timeline
├─ Interaction
├─ Modifiers
└─ Runtime Rule
```

- Timeline은 움직임이다. 위치, 크기, 회전, opacity, timing처럼 시간에 따라 변하는 제작 데이터다.
- Interaction은 다른 객체와의 관계다. 충돌, 피격, 공격, 방어처럼 서로 만났을 때 의미가 생기는 데이터다.
- Modifiers는 실행 중 적용되는 규칙이다. 현재 MVP에서는 이동, 가속, 감속처럼 Action/Effect/Projectile이 공유할 수 있는 수식부터 검증한다.
- Runtime Rule은 게임 전체에 필요한 실행 규칙이다. 입력 수집, 중력, 월드 경계, HP, score, overlap 계산처럼 특정 Action 이름에 종속되지 않는 규칙이다.

새 Action은 위 블록을 조합해서 만든다. Runtime은 `attack1`, `roll`, `fireSlash` 같은 이름을 보고 특별 처리하지 않는다.

## Feature Triage Checklist

새 기능을 구현하기 전에 Codex는 먼저 다음을 보고한다.

1. 이 기능은 Timeline / Interaction / Modifiers / Runtime Rule 중 무엇인가?
2. 기존 공통 시스템으로 가능한가?
3. 새 Engine이 정말 필요한가?
4. Action / Effect / Skill / Projectile 중 어디까지 재사용 가능한가?
5. 가장 단순한 MVP는 무엇인가?

이 보고 없이 바로 구현하지 않는다.

## Simplicity Rule

- 같은 기능은 두 번 만들지 않는다.
- Action 전용, Effect 전용, Projectile 전용으로 같은 기능을 따로 만들지 않는다.
- 새 Engine은 마지막 선택이다.
- MVP는 항상 작게 시작한다.
- 한 Sprint에서 저장 구조 변경, Runtime 대개편, UI 대개편을 동시에 진행하지 않는다.

예:

- Interaction MVP는 `collision`, `hurt`, `attack`, `guard` 네 박스만 사용한다.
- 이미지 외곽선 충돌, 픽셀 충돌, 복잡한 polygon 충돌은 MVP에 넣지 않는다.

## Current Structure

현재 Action 목록은 `src/game_config.js`의 `POSE_KEYS`에 고정되어 있다.

```text
idle, run, jump, fall, glide, roll, guard, guardBreak, hurt, death,
jumpAttack, attack1, attack2, attack3
```

현재 저장 구조:

- `tuning.poseOffsets[poseKey][partKey]`: Action Timeline frame data.
- `tuning.poseSettings[poseKey]`: duration, playback, playbackRate.
- `tuning.effectOffsets[effectKey]`: Effect Timeline frame data.
- `tuning.effectSettings[effectKey]`: effect timing.
- `tuning.rig.*InteractionObject`: Setup fallback interaction object.
- `tuning.motion`, `tuning.invulnerability`: 일부 Action modifier 성격의 값.

현재 Runtime 실행 흐름:

```text
input keys
→ actor_action_helper
→ PuppetPlayer state/time fields
→ actor_runtime_engine.poseKey / getPoseFrameProgress()
→ poseOffsets timeline
→ actor_renderer records hitRegions
→ interaction_region_engine
→ combat_engine
→ actor_canvas_renderer
```

## Action Equality Target

최종 목표는 "모든 Action은 동일하다"이다.

```text
Action
├─ Trigger
├─ Timeline
├─ Interaction
└─ Modifiers
```

Runtime은 `jump`, `roll`, `attack1`, `fireSlash` 같은 이름을 특별 취급하지 않는다.

현재 migration 단계에서는 `poseActionDescriptors()`가 Basic Action과 Custom Action을 같은 descriptor로 묶는다.

- Basic Action: `runtimeMode: "legacy"`로 기존 물리 Runtime을 유지한다.
- Custom Action: `runtimeMode: "trigger"`로 Trigger Runtime MVP를 탄다.
- `runtimeMode`은 임시 migration flag이며 최종 모델에는 남기지 않는다.

## Basic Actions / Skills Legacy Note

Basic Actions는 기존 동작이다.

- 이동, 점프, 낙하, 활강, 구르기, 방어, 피격, 죽음.
- 기존 `POSE_KEYS` 기반 편집과 Runtime 동작을 보존한다.
- 한 번에 Skill 데이터로 이관하지 않는다.

Skills는 사용자가 새로 만드는 Action이다.

- `type: "skill"`을 가진다.
- `trigger`를 가진다.
- Timeline, Interaction, Modifiers를 자체 데이터로 가진다.
- Basic Actions와 같은 Timeline/Property/Transform 편집 경로를 최대한 재사용한다.

## Trigger

Trigger는 Action 데이터에 저장되는 입력 조건이다.

MVP 지원 형태:

- Single: `Q`, `W`, `E`, `Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`.
- Sequence: `QQ`, `QQQ`, `QW`, `QWE`처럼 순서가 있는 입력. 각 입력 사이에는 `maxGapMs`를 둔다.
- Hold Combo: `Q-E`, `ArrowUp-W`처럼 앞 키를 누른 상태에서 뒤 키를 누르는 구조.

저장 예:

```js
{ type: "single", keys: ["Q"] }
{ type: "sequence", keys: ["Q", "Q", "Q"], maxGapMs: 350 }
{ type: "holdCombo", hold: "ArrowUp", press: "W" }
{ type: "single", keys: ["ArrowRight"], repeatWhileHeld: true }
```

설계 원칙:

- Trigger는 Runtime에서 Action 이름을 보고 분기하기 위한 장치가 아니다.
- Runtime은 Trigger 데이터를 해석해 Custom Action Timeline 실행을 요청한다.
- `repeatWhileHeld`는 즉발 실행과 홀드 반복 실행을 나누는 Trigger Runtime Rule이다.
- Basic Action과 Custom Action 모두 Trigger Editor 데이터를 가질 수 있다.
- 기존 물리 Runtime이 남아 있는 Basic Action은 migration이 끝날 때까지 `runtimeMode: "legacy"`로 둔다.
- Runtime MVP는 발동된 Custom Action의 pose timeline 재생과 공격 Interaction region 연결까지만 수행한다.
- Modifier Engine 해석, 복잡한 입력 우선순위, overlapping sequence 지연 판정은 별도 단계로 분리한다.

분리 가능성:

- Editor Timeline은 `poseKey`만 바꾸면 여러 Action key를 다룰 수 있는 형태에 가깝다.
- 저장/normalize는 `POSE_KEYS` 고정 반복이라 Skill 저장 구조가 별도로 필요하다.
- Runtime 입력과 state field는 Basic Action에 강하게 묶여 있어 Skill 실행 layer가 필요하다.

## Runtime Hardcoding Classification

제거 가능:

- 새 Action마다 `POSE_KEYS`와 Runtime 분기를 직접 추가하는 방식.
- 공격 1/2/3타 strike window를 Runtime 상수로 계속 늘리는 방식.
- fallback attack preview처럼 특정 Action 이름을 UI/debug 조건으로 직접 판단하는 방식.

Runtime에 반드시 남아야 함:

- 입력 수집과 현재 눌림/방금 눌림 상태.
- 위치, 속도, 중력, 월드 경계 계산.
- HP, 죽음, respawn, score 같은 게임 규칙.
- 충돌/피격/공격 overlap 계산.
- Editor 원본을 수정하지 않는 Runtime 계산값 생성.

Modifier Engine으로 이동 가능:

- 이동 / 가속 / 감속 같은 Action 실행 중 위치 보정.
- 무적 시간 적용.
- 색 변화 / tint / hit flash 성격의 Action별 표시 옵션.
- 구르기 뒤 무적.
- roll ghost 같은 Action 실행 중 시각 옵션.
- Action별 attack reaction 기본값.

## Interaction

목표 Interaction:

- collision: 충돌.
- hurt: 피격.
- attack: 공격.
- guard: 방어.

Editor 동작:

```text
Interaction checkbox ON
→ Action 데이터에 box 생성
→ Canvas에 box 표시
→ 기존 Transform handle로 위치/크기/회전 편집
→ Property scrub/stepper로 같은 값 편집
```

설계 원칙:

- 현재 `interaction_object_editor.js`의 role/key 정의를 재사용한다.
- 현재 Transform 모델 `x/y/ax/ay/w/h/rot/opacity`를 재사용한다.
- Runtime `InteractionRegion`은 계속 계산값이다.
- Runtime attack/hurt/collision/guard region을 Editor source로 쓰지 않는다.

현재 구조와의 차이:

- 현재는 fallback interaction object가 `tuning.rig`에 있고, Action frame state가 `poseOffsets`에 있다.
- 목표는 Action 안에서 Interaction 생성 여부와 box 목록을 명시한다.
- MVP에서는 기존 fallback object와 frame state를 compatibility source로 유지할 수 있다.

## Modifiers

목표 구조:

```text
Action
↓
modifiers[]
↓
action_modifier_engine
↓
Runtime
```

현재 MVP:

- move: Action Timeline 전체 길이 동안 X/Y 이동량만큼 이동한다.
- accelerate: 이동 진행률을 ease-in처럼 보정한다.
- decelerate: 이동 진행률을 ease-out처럼 보정한다.

설계 원칙:

- Modifier별 Runtime 적용 지점은 engine이 계산한 결과만 읽는다.
- 이동 수식은 Timeline 원본 포즈 데이터를 수정하지 않고, 현재 실행 중인 Action의 진행률 차분만 actor 위치에 더한다.
- 가속과 감속이 함께 켜지면 ease-in-out으로 해석한다.
- Modifier 설정 UI는 Property 공통 입력을 우선 사용한다.

## Recommended Implementation Order

1. Action schema 후보와 normalize strategy를 확정한다.
2. Basic Actions compatibility layer를 만든다.
3. Skill 데이터 생성만 추가한다.
4. Skill Timeline을 기존 Timeline adapter에 연결한다.
5. Interaction checkbox와 box 생성을 붙인다.
6. 이동 / 가속 / 감속 수식 MVP를 Runtime에 최소 연결한다.
7. Runtime Skill trigger와 playback을 연결한다.

## Risks

- `POSE_KEYS` 고정 구조가 Skill 확장을 막는다.
- Basic Action Runtime과 Skill Runtime이 한동안 공존한다.
- Interaction source가 fallback rig object, pose frame value, future action data로 나뉠 수 있다.
- Modifier가 커지면 Runtime 곳곳에 다시 분산될 수 있다.
- 저장 구조 변경은 별도 작은 migration 계획 없이 진행하면 기존 저장 데이터가 깨질 수 있다.
