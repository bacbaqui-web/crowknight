# Crow Knight Architecture

이 문서는 현재 구조만 설명한다.

## Surfaces

- 제작툴 화면: 캐릭터, 행동, 효과, 스테이지를 제작한다.
- 실행 화면: 제작툴 데이터를 읽어 게임을 실행한다.
- 공통 영역: 렌더링, 저장, 에셋, Timeline, Canvas 편집 흐름을 공유한다.

## Workflow

| Session | 역할                  | 주요 연결                                           |
| ------- | --------------------- | --------------------------------------------------- |
| Setup   | 캐릭터 기본 상태 제작 | Selection, Canvas, Layer, Save                      |
| Action  | 캐릭터 행동 제작      | Timeline, Interaction, Modifiers, Preview           |
| Effect  | 시각 효과 제작        | Timeline, Property, Interaction, Modifiers, Preview |
| Stage   | 배경과 월드 규칙 제작 | Background, Stage Rules, World Physics, Scene       |
| Common  | 미리보기와 저장       | Canvas, Project State, Assets                       |

## State

- Selection State: 현재 선택된 편집 대상을 가진다.
- EditTarget Resolver: Setup / Action / Effect 선택 상태를 공통 `EditTarget` object로 변환한다.
- Editing State: 현재 Canvas/Property 편집 초점을 가진다.
- Group Edit State: 여러 대상을 함께 편집할 때의 임시 값을 가진다.
- Workflow State: 현재 활성 Session을 가진다.
- Undo State: 편집 전후 snapshot을 가진다.
- Project State: 저장 가능한 actors, scene, assets 상태를 가진다.

## Stage

- Stage는 배경 설정과 Stage Rules를 가진다.
- Stage Rules 안의 World Physics는 제작자가 이해하기 쉬운 `Gravity`와 `Inertia` 설정을 저장한다.
- World Physics는 Action Modifier가 아니라 모든 Runtime actor가 공유할 수 있는 Stage / World Runtime Rule이다.
- World Physics 단위는 Action Timeline frame 기준이다. Position은 `px`, Velocity는 `px/f`, Gravity는 `px/f²`, Inertia는 `frame`이다.

## Timeline

- Action Timeline과 Effect Timeline은 공통 Timeline 구조를 공유한다.
- 각 Timeline은 adapter를 통해 자기 데이터만 읽고 쓴다.
- Timeline은 keyframe 추가, 삭제, 이동, 선택, 복사, 붙여넣기를 담당한다.
- Preview는 Timeline 상태를 읽어 현재 Canvas에 반영한다.

## Timeline Target Editor

Timeline target 편집 UI는 세 개의 형제 패널로 구성한다.

```text
Timeline Target
├── Property
├── Interaction
└── Modifiers
```

- `Property`는 Transform 전용이다. `x/y`, `w/h`, `rot`, `opacity`, anchor 편집만 담당한다.
- `Interaction`은 충돌, 피격, 공격, 방어 같은 상호작용 state와 세부 값을 담당한다.
- `Modifiers`는 Action 실행 중 적용되는 수식 목록과 설정값을 담당한다. 현재 MVP는 Move, Velocity, Accelerate, Decelerate를 노출한다.
- Modifier Mini Timeline은 Action Timeline 길이를 기준으로 modifier 작동 구간을 표시하는 공통 UI다.
- Modifier 방향은 Velocity를 중심으로 통합한다. Velocity 값은 Action Timeline frame 기준 `px/f`로 표현하고, Runtime FPS 변환 없이 World Physics velocity state에 적용한다.
- Move/Accelerate/Decelerate는 장기적으로 같은 Velocity + Graph + Mini Timeline 구조로 수렴시킨다.
- Interaction/Modifiers는 Action 전용이 아니며 Effect도 같은 Editor Engine을 사용한다.
- Projectile, Stage 같은 미래 target도 adapter로 같은 패널 구조에 연결할 수 있어야 한다.

공통 편집 흐름은 다음 순서를 따른다.

```text
Selection
→ resolveEditTarget(context)
→ EditTarget
→ Property / Handle / Drag / Save
```

`Property`, `Handle`, `Drag`, `Save`는 Setup / Action / Effect 선택 상태를 다시 판단하지 않고 `EditTarget`의 `targetKey`와 `writeTargetKey`를 사용한다.

## Action

Action은 제작 가능한 행동 단위다.

```text
Action
├── Group
├── Condition
├── Timeline
├── Interaction
└── Modifiers
    ↓
Runtime
    ↓
Action Modifier Engine
    ↓
Combat
    ↓
Renderer
```

- 원칙: Action은 `Group + Condition + Timeline + Interaction + Modifiers` 데이터 조합이다.
- Runtime 실행 순서는 `Input → Trigger → Condition → Action`이다.
- 아무 Trigger Action도 실행되지 않을 때는 `base` 그룹 Action 중 현재 Condition이 맞는 Action을 기본자세로 실행한다.
- Runtime은 Action 데이터를 해석하고 실행 상태를 계산한다.
- Trigger, Skill, Modifier, Runtime migration 세부 설계는 `13_ACTION_MODEL.md`를 본다.
- 실제 저장 key와 schema는 `11_DATA_MODEL.md`를 본다.

## Editor Engines

현재 Editor 공통 엔진 경계:

```text
Timeline Adapter
    ↓
Property Editor Engine
Interaction Editor Engine
Modifiers Editor Engine
    ↓
Project Data
```

- Property Editor Engine은 Interaction/Modifier의 존재를 모른다.
- Interaction Editor Engine은 체크 상태, 세부 row 표시, frame 값 저장을 담당한다.
- Modifiers Editor Engine은 modifier 목록, 활성화, 설정 UI, 저장을 담당한다.
- Modifiers Editor Engine은 Velocity/Accelerate/Decelerate처럼 작동 구간이 있는 modifier에 공통 Mini Timeline UI를 붙인다.
- 공통 카드 UI는 `editor_card_panel_view.js`에서 공유한다.
- Action/Effect별 데이터 연결은 각 Timeline adapter가 담당한다.

## Canvas

- Canvas는 Setup, Action, Effect 편집 surface를 공유한다.
- 선택된 target에 따라 handle geometry가 만들어진다.
- Drag는 move, resize, rotate, opacity 같은 편집 동작으로 변환된다.
- 편집 결과는 현재 context의 저장 대상에 기록된다.

## Editable Transform

모든 editable object는 After Effects Transform 모델을 목표 규칙으로 사용한다.

- `x/y`: 부모 좌표계에서 anchor point의 위치.
- `ax/ay`: 객체 local rect 안에서 anchor point의 위치.
- `w/h`: 객체 local rect의 크기.
- `rot`: anchor point 기준 회전.

Render formula:

```text
translate(x, y)
rotate(rot)
drawRect(-ax, -ay, w, h)
```

이 규칙은 Setup, Action, Effect, Stage, interaction object에 동일하게 적용한다.

## Runtime

- Runtime은 제작툴 데이터를 읽어 실행 상태로 변환한다.
- 캐릭터 렌더링, 행동 상태, 효과, 전투 판정, HUD, 배경을 실행 화면에서 처리한다.
- Runtime 판정 데이터는 Editor 원본에서 실행 중 계산한다.
- Runtime은 새 Action을 만드는 곳이 아니다.
- Action별 하드코딩 제거 기준은 `13_ACTION_MODEL.md`를 본다.
- Runtime은 팔, 다리, 몸통의 사전 포즈 애니메이션을 만들지 않는다. `actor_pose_helper.js`는 neutral pose만 제공하고 실제 자세는 Timeline data에서 온다.

## Save / Assets

- Project State는 actor, scene, tuning, asset reference를 저장한다.
- Local 저장과 remote 저장은 같은 project state를 기준으로 한다.
- 상단 Firebase 업로드/다운로드는 Project State metadata만 Firestore에 저장/불러온다.
- Project State metadata는 `projectSettings/crowKnight` 단일 문서에 저장하며, 크기 문제를 줄이기 위해 gzip-base64 압축 필드를 우선 사용한다.
- PSD 원본, PNG/WebP 런타임 이미지는 Setup / Effect / Stage 내부의 asset 버튼에서 개별 처리한다.
- PSD, effect image, background asset은 제작툴에서 교체하고 Runtime이 읽을 수 있는 형태로 로드된다.

## Implementation Documents

- 파일을 찾을 때: `10_SRC_MAP.md`
- 데이터 저장 위치를 볼 때: `11_DATA_MODEL.md`
- 사용자 행동 저장 흐름을 볼 때: `12_EDITOR_FLOW.md`
- Action 제작 모델을 볼 때: `13_ACTION_MODEL.md`
