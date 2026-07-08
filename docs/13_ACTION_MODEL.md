# 13_ACTION_MODEL.md

이 문서는 Action 제작 모델만 설명한다.

실제 저장 위치와 schema는 `11_DATA_MODEL.md`, 사용자 조작 흐름은 `12_EDITOR_FLOW.md`를 본다.

## Goal

```text
Action = Group + Condition + Timeline + Interaction + Modifiers
```

- Group: Action 목록과 기본자세 fallback 후보를 나누는 제작 단위.
- Timeline: 파츠와 효과의 시간 변화.
- Interaction: 충돌, 피격, 공격, 방어 box와 frame state.
- Modifiers: Action 실행 중 자기 자신에게 적용되는 규칙.
- Trigger: Custom Action을 언제 시작할지 정하는 입력 조건. Runtime Rule이 해석한다.
- Condition: Trigger가 맞은 뒤 지금 실행 가능한지 판단하는 Action 실행 조건.

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
- Formula는 실행 중 적용되는 Action 단위 수식이다. 현재 MVP에서는 시전, 쿨타임, 속도, 목표이동, 고정, 보간, 캔슬, 연계를 같은 Formula Card 구조로 다룬다.
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

현재 Action 목록은 `src/game_config_data.js`의 `ACTION_KEYS`에 고정되어 있다.

```text
idle, run, jump, doubleJump, sprint, fall, glide, roll, evade,
guard, parry, guardBreak, hurt, death, jumpAttack, attack1, attack2, attack3
```

현재 저장 구조는 `11_DATA_MODEL.md`를 본다. 이 문서는 Action을 어떤 블록으로 해석하고 어떤 방향으로 migration할지만 다룬다.

현재 Runtime 실행 흐름:

```text
input keys
→ actor_action_helper
→ PuppetPlayer state/time fields
→ actor_runtime_engine.actionKey / getActionFrameProgress()
→ actionOffsets timeline
→ combat_engine
→ interaction_region_engine computes current InteractionRegions
→ actor_renderer records hitRegions for canvas/edit overlay
→ actor_canvas_renderer
```

## Action Equality Target

최종 목표는 "모든 Action은 동일하다"이다.

```text
Action
├─ Trigger
├─ Group
├─ Condition
├─ Timeline
├─ Interaction
└─ Modifiers
```

Runtime은 `jump`, `roll`, `attack1`, `fireSlash` 같은 이름을 특별 취급하지 않는다.

이상적 후보 형태:

```text
Action
├─ type
├─ trigger
├─ group
├─ condition
├─ timeline
├─ interaction
└─ modifiers
```

현재 migration 단계에서는 `actionDescriptors()`가 Basic Action과 Custom Action을 같은 descriptor로 묶는다.

- Basic Action: `runtimeMode: "legacy"`로 기존 물리 Runtime을 유지한다.
- Custom Action: `runtimeMode: "trigger"`로 Trigger Runtime MVP를 탄다.
- `runtimeMode`은 임시 migration flag이며 최종 모델에는 남기지 않는다.

## Action Group

Action Group은 Editor 목록과 기본자세 fallback 후보를 나누는 Action 데이터다.

MVP 그룹은 네 개만 사용한다.

- `base`: 기본자세 후보. 아무 Trigger Action도 실행되지 않을 때 Condition으로 고른다.
- `movement`: 이동, 점프, 질주, 구르기, 회피.
- `attack`: 공격 계열.
- `special`: 방어, 패링, 활강, 피격 같은 특수 동작.

기본자세 fallback 흐름:

```text
No Trigger Action
→ base group actions
→ Condition check
→ fallback Action
```

예:

- `대기`: `group = base`, `condition = ground`
- `낙하`: `group = base`, `condition = air`

설계 원칙:

- `idle`은 Runtime 특수 fallback이 아니라 일반 Action 데이터로 취급하는 방향으로 간다.
- Trigger Action은 기본자세 fallback보다 항상 우선한다.
- base 그룹 후보가 하나도 없을 때만 compatibility 안전망으로 기존 `idle` key를 사용한다.
- Action을 다른 그룹으로 이동해도 Timeline / Trigger / Condition / Modifier 데이터는 유지하고 `actionSettings[actionKey].group`만 바꾼다.

저장 위치와 schema는 `11_DATA_MODEL.md`의 `actionSettings.group`을 본다.

## Basic Actions / Skills Legacy Note

Basic Actions는 기존 동작이다.

- 이동, 점프, 이단점프, 질주, 낙하, 활강, 구르기, 회피, 방어, 패링, 피격, 죽음.
- 기존 `ACTION_KEYS` 기반 편집과 Runtime 동작을 보존한다.
- 한 번에 Skill 데이터로 이관하지 않는다.

Skills는 사용자가 새로 만드는 Action이다.

- `type: "skill"`을 가진다.
- `trigger`를 가진다.
- Timeline, Interaction, Modifiers를 자체 데이터로 가진다.
- Basic Actions와 같은 Timeline/Property/Transform 편집 경로를 최대한 재사용한다.

## Action Timeline Edit Scope

Action Timeline의 Property와 Canvas Handle은 같은 edit scope를 사용한다.

- `actionPivot`: 키프레임 선택 없음 + 파츠 선택 없음. Action 공통 Pivot만 편집한다.
- `frameGroup`: 키프레임 선택 있음 + 파츠 선택 없음. 선택한 키프레임의 `master` Parent Transform을 Action 공통 Pivot 기준으로 편집한다.
- `part`: 파츠 선택 있음. 기존처럼 선택 파츠만 편집한다.

Action 공통 Pivot은 `actionSettings[actionKey].editPivot`에 저장한다. Pivot은 Action별로 하나만 있으며 키프레임별로 따로 만들지 않는다.

`frameGroup` 편집 규칙:

- 각 파츠의 `x/y/rot/w/h`를 직접 재계산해 분배하지 않는다.
- 저장 대상은 `tuning.actionOffsets[actionKey].master`다.
- 렌더 순서는 `Setup → master frameGroup transform → Part Timeline Transform → Render`다.
- 위치 / 회전 / 크기 / 투명도는 `master` frame value에 저장한다.

Action 공통 Pivot은 `master` frame anchor와 동기화한다. 이번 MVP에서 Pivot 변경 시 기존 `master` 회전/스케일 pose의 시각 보정은 별도로 수행하지 않는다.

## Trigger

Trigger는 Action 데이터에 저장되는 입력 조건이다.

Action 실행 순서:

```text
Input
→ Trigger
→ Condition
→ Link Rule
→ Action
```

MVP 지원 형태:

- Single: `Q`, `W`, `E`, `Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`.
- Sequence: `QQ`, `QQQ`, `QW`, `QWE`처럼 순서가 있는 입력. 각 입력 사이에는 `maxGapMs`를 둔다.
- Hold Combo: `Q-E`, `ArrowUp-W`처럼 앞 키를 누른 상태에서 뒤 키를 누르는 구조.

현재 저장 schema는 `11_DATA_MODEL.md`의 `actionTriggers`를 본다.

설계 원칙:

- Trigger는 Runtime에서 Action 이름을 보고 분기하기 위한 장치가 아니다.
- Runtime은 Trigger 데이터를 해석해 Custom Action Timeline 실행을 요청한다.
- Trigger는 "무슨 키를 눌렀는가"만 담당한다. 입력 방식은 `시전` Formula가 담당한다.
- 모든 Action 시작은 pressed Event로 시작한다. `press` / `repeat` 시전도 시작 Trigger는 Event이며, held State는 이미 시작된 Action을 유지하거나 기본 상태에서 복귀하는 데만 사용한다.
- 지금 어떤 Action 중이라 실행 가능한지는 Condition / Link Rule 같은 실행 조건이 담당한다.
- legacy Trigger Mode(`tap`, `press`, `pressLoop`)는 기존 저장 데이터 compatibility로만 유지한다.
- `시전` Formula가 없으면 Runtime은 legacy Trigger Mode를 fallback으로 읽으며, 새 Action의 기본 동작은 `tap` Event다.
- Accelerate / Decelerate는 Trigger가 새로 시작된 최초 1회에만 적용한다. `pressLoop`의 loop마다 다시 적용하지 않는다.
- 저장 위치와 schema는 `11_DATA_MODEL.md`를 본다. Legacy `repeatWhileHeld`는 compatibility 입력으로만 유지한다.
- 실행 중 다른 Trigger Action이 입력되면 Action 설정의 interrupt option을 보고 현재 Action을 즉시 교체할 수 있다.
- Cancel / interrupt 판정은 Event Action 전환에만 적용한다. held State 복귀는 진행 중인 Action을 cancel하지 않는다.
- Editor에서는 이 interrupt option을 Action Timeline 설정 줄의 Cancel 버튼으로 제어한다. Cancel ON은 즉시 전환, Cancel OFF는 현재 Action 종료까지 유지한다.
- Basic Action과 Custom Action 모두 Trigger Editor 데이터를 가질 수 있다.
- 기존 물리 Runtime이 남아 있는 Basic Action은 migration이 끝날 때까지 `runtimeMode: "legacy"`로 둔다.
- Runtime MVP는 발동된 Custom Action의 Action Timeline 재생과 공격 Interaction region 연결까지만 수행한다.
- Modifier Engine 해석, 복잡한 입력 우선순위, overlapping sequence 지연 판정은 별도 단계로 분리한다.

## Trigger Link Rule

Link Rule은 Trigger 자체를 `QQ`, `QQQ` 같은 콤보 입력으로 늘리는 대신, Action이 다른 Action 중 특정 frame 구간에서만 실행될 수 있게 하는 Formula다.

저장 위치는 `actionSettings[actionKey].formulas[]`의 `type: "link"` 항목이며, 자세한 shape는 `11_DATA_MODEL.md`를 본다.

실행 흐름:

```text
Input
→ Trigger match
→ Condition check
→ Link Rule check
→ Cancel / interrupt check
→ Action start
```

설계 원칙:

- Trigger는 입력만 본다. 예를 들어 `attack1`, `attack2`, `attack3` 모두 Trigger를 `Q`로 둘 수 있다.
- Link Rule은 현재 실행 중인 source Action과 source Action frame이 허용 구간 안인지 본다.
- `link.enabled === false`이면 기존처럼 Trigger와 Condition만으로 실행 가능하다.
- `link.enabled === true`이면 현재 Action이 `fromActions`에 없거나 현재 frame이 `startFrame~endFrame` 밖일 때 실행 실패한다.
- 기존 sequence trigger는 compatibility로 유지하며 이번 단계에서 제거하지 않는다.
- Link Rule은 Action 이름별 Runtime 분기를 만들기 위한 장치가 아니다. Runtime은 저장된 `fromActions`와 현재 Action state만 비교한다.
- 같은 Trigger를 공유하는 Action이 여러 개 있으면 유효한 Link 후보를 일반 Trigger 후보보다 먼저 평가해야 한다. 그렇지 않으면 `attack2`가 실행될 frame에서 `attack1`이 다시 시작될 수 있다.
- Link Rule은 Cancel window와 충돌하지 않게 설계해야 한다. MVP 구현에서는 Link 통과 후 기존 interrupt 판정을 이어서 적용하거나, Link 성공을 interrupt 허용으로 볼지 명확히 정해야 한다.
- Editor에서는 수식 라이브러리의 `연계` 항목으로 표시한다. 대상 선택은 `폴더 드롭다운 → Action 드롭다운` 순서이며, Mini Timeline은 선택한 source Action의 Timeline frame 길이를 따른다.

예:

```text
attack1
→ Trigger Q
→ link disabled

attack2
→ Trigger Q
→ link from attack1 frame 6~12

attack3
→ Trigger Q
→ link from attack2 frame 6~12
```

공중점프도 같은 구조를 쓴다.

```text
doubleJump
→ Trigger Space
→ link from jump / fall
```

## Condition

Condition은 Trigger가 맞은 뒤 Action이 지금 실행 가능한지 판단하는 Action 데이터다.

MVP 지원 값:

- `any`: 언제든 실행 가능하다.
- `ground`: World Physics Runtime의 `onGround === true`일 때만 실행한다.
- `air`: World Physics Runtime의 `onGround === false`일 때만 실행한다.

설계 원칙:

- Condition은 Trigger와 별개다. Trigger는 무엇을 눌렀는지, Condition은 지금 실행 가능한지를 담당한다.
- Runtime은 `jump`, `attack`, `airAttack` 같은 Action 이름을 보고 분기하지 않는다.
- Ground / Air 판정은 World Physics Runtime의 `onGround` 상태만 사용한다. `y == 0` 같은 좌표 직접 판정은 사용하지 않는다.
- Trigger가 맞아도 Condition이 맞지 않으면 Action을 실행하지 않는다.
- Editor에서는 Action Timeline 설정 줄의 Condition 버튼으로 `Any → Ground → Air → Any` 순환 선택한다.

저장 위치와 schema는 `11_DATA_MODEL.md`의 `actionSettings.condition`을 본다.

## Timeline Playback

Timeline playback은 Trigger Press와 별개의 Action 애니메이션 재생 방식이다.

- `once`: Timeline을 한 번 재생한다.
- `loop`: 끝까지 가면 처음으로 돌아가 다시 재생한다.
- `pingpong`: 끝까지 갔다가 역방향으로 되돌아오는 왕복 재생이다.

Editor의 Timeline 재생 방식 버튼은 `once → loop → pingpong → once` 순서로 현재 모드를 바꾼다. 실제 저장 위치와 허용 값은 `11_DATA_MODEL.md`의 `actionSettings` / `effectSettings`를 본다.

## Action Blend

Action Blend는 Action이 바뀔 때 이전 표시 포즈와 새 Action의 첫 프레임 포즈를 짧게 연결하는 Action 실행 속성이다.

- Blend 값은 `0~5` 프레임이며 Runtime MVP에서는 Action Timeline FPS 기준으로 계산한다.
- `0`은 즉시 전환이며 기존 동작과 같다.
- `1~5`는 이전 표시 포즈에서 새 Action 첫 프레임 포즈까지 `blendFrames / ACTION_FPS`초 동안 보간한다.
- Blend가 설정되어 있으면 Blend 구간이 먼저 실행되고, Blend가 끝난 다음 새 Action Timeline 첫 프레임이 시작된다.
- Blend 구간 동안 새 Action Timeline progress와 Move modifier는 진행하지 않는다.
- Custom Action 종료 후 `idle`로 복귀할 때도 공통 Action transition 경로를 거치며, `actionSettings.idle.blendFrames`를 대상 Action 기준으로 읽는다.
- Transition이 끝나면 새 Action Timeline 포즈가 첫 프레임부터 정상적으로 진행된다.
- Editor에서는 Action Timeline 설정 줄의 Link 아이콘 버튼으로 `0 → 1 → 2 → 3 → 4 → 5 → 0` 순환 선택한다.

새 Formula 구조가 있으면 `actionSettings.formulas[]`의 `type: "blend"`가 우선이며, 기존 `runtimeRules.blend` / `blendFrames`는 migration source로만 사용한다. 저장 위치와 schema는 `11_DATA_MODEL.md`를 본다.

## Action Formula Cards

Action Formula Card는 키프레임 포즈 데이터가 아니다. 수식 라이브러리에서 클릭해 Action에 추가하는 독립 카드이며, 저장 위치는 `actionSettings[actionKey].formulas[]`다.

MVP formula:

- `cast` / `시전`: Trigger가 맞은 뒤 Action 입력 방식을 정한다. Formula가 없으면 기본 동작은 탭이다.
- `cooldown` / `쿨타임`: Action이 실행된 뒤 다시 실행되기까지 필요한 초 단위 대기 시간을 정한다.
- `velocity` / `속도`: `startFrame`~`endFrame` 구간에서 Action Timeline frame 기준 `px/f` velocity를 만든다.
- `targetMove` / `목표이동`: `triggerFrame`에 발동해 그림자 / 발밑 기준 목표 좌표까지 이동한다. `moveFrames=0`이면 즉시 도달하고, `1~10`이면 해당 Action Timeline frame 수 동안 목표까지 보간한다. 목표에 도달하면 종료한다.
- `inertia` / `관성`: `startFrame`~`endFrame` 구간에서 World Physics 기본 관성에 추가 관성을 더한다.
- `lock` / `고정`: `startFrame`~`endFrame` 동안 선택한 방향을 바라보게 한다.
- `blend` / `보간`: Action 시작 구간에서 transition blend를 적용한다.
- `cancel` / `캔슬`: `startFrame`~`endFrame` 동안만 다른 Action으로 interrupt 가능하다. 구간 밖에서는 Cancel OFF처럼 동작한다.
- `link` / `연계`: 현재 실행 중인 Action과 frame 구간을 검사해 이 Action이 실행 가능한지 판단한다.

시전 Formula:

- `tap` / `탭`: Event다. 버튼을 누른 순간만 Trigger를 평가하고 한 번 실행한다.
- `press` / `프레스`: 시작은 Event다. 버튼을 누른 순간 한 번 Action을 시작하고, 시작된 뒤에는 held State로 유지한다.
- `repeat` / `리핏`: 시작은 Event다. 버튼을 누른 순간 한 번 Action을 시작하고, 시작된 뒤에는 held State로 `repeatStartFrame`~`repeatEndFrame` 구간을 반복한다.
- `releaseMode: "immediate"`: 버튼을 떼면 즉시 종료한다.
- `releaseMode: "finish"`: 프레스는 버튼을 떼도 Action을 끝까지 재생하고, 리핏은 버튼을 떼면 현재 반복 구간의 끝 frame까지 재생한다.
- Event Action은 State 복귀보다 우선한다. 예: 이동 State가 held 상태여도 공격 Event가 pressed되면 공격을 먼저 실행한다.
- held State 복귀는 현재 Action이 끝났거나 `idle` / `fall` 같은 기본 상태일 때만 Action 시작 후보가 된다. 진행 중인 공격 / 피격 / 구르기 Action을 held State가 cancel하지 않는다.
- State Action은 held input을 복귀에 사용하므로, 공중에서 조건이 막힌 상태로 방향키를 계속 누르고 있다가 착지하면 별도 keydown 없이 이동 Action을 시작할 수 있다.

쿨타임 Formula:

- `seconds`: 이 Action이 한 번 시작된 뒤 다시 시작 가능해지기까지 필요한 시간이다.
- Trigger가 맞아도 현재 시간이 cooldown 종료 전이면 Action을 시작하지 않는다.
- Timeline 구간을 가지지 않고 Action-level 실행 조건으로만 작동한다.

관성 Formula:

- 직접 x/y 속도나 위치 이동을 만들지 않는다.
- 이미 생긴 속도가 얼마나 오래 유지되는지만 조절한다.
- Runtime에서는 `effectiveInertia = worldPhysics.inertia + addInertia`로 계산한다.
- `applyTarget: "air"`이면 공중 상태에서만 추가 관성이 적용된다.
- `applyTarget: "ground"`이면 지상 상태에서만 추가 관성이 적용된다.
- `applyTarget: "all"`이면 지상/공중 모두 적용된다.

고정 Formula:

- `direction: "left"`이면 활성 구간 동안 왼쪽을 바라본다.
- `direction: "right"`이면 활성 구간 동안 오른쪽을 바라본다.
- direction이 없는 legacy 데이터는 `right`로 normalize한다.
- mirror Action에서 원본 기준 direction은 Runtime에서 자동 반전된다. 예: 원본 `right` + mirror 실행이면 실제 facing은 `left`다.

공통 원칙:

- 각 formula는 `type`, `enabled`, `startFrame`, `endFrame`을 가진다.
- Editor UI는 Modifier Mini Timeline과 같은 `renderMiniTimelineRange()` 기반 block UI를 재사용한다.
- 저장 위치는 `actionSettings[actionKey].formulas[]`이며 `actionOffsets`에는 저장하지 않는다.
- 기존 `runtimeRules`는 UI에 표시하지 않고 normalize/migration 단계에서 `formulas[]`로 변환한다.
- Formula별 구현은 `src/formulas/*_formula.js`에 둔다. `formula_registry.js`, `formula_editor_engine.js`, `formula_runtime_engine.js`는 registry를 통해 공통 처리한다.

## Action Mirror

Action Mirror는 Action 자체의 실행 속성이다. Modifier가 아니며 Action 데이터를 복사하거나 좌우 Action을 따로 만들지 않는다.

- 기본값은 Mirror ON이다.
- Mirror ON이면 하나의 Action 데이터를 현재 캐릭터 방향에 따라 좌우 거울상으로 해석한다.
- Mirror ON이면 Trigger Runtime도 `ArrowLeft` / `ArrowRight`를 좌우 대칭 입력으로 해석한다. 예를 들어 저장 Trigger가 `ArrowRight`이면 `ArrowLeft` 입력도 같은 Action을 실행하고, 실행 facing은 left로 잡는다.
- 같은 Action key라도 좌우 대칭 Trigger로 요청된 facing이 현재 실행 facing과 다르면 새 실행 요청으로 본다. Cancel ON이면 즉시 현재 Action을 끊고 반대 방향으로 재시작하고, Cancel OFF이면 현재 Action이 끝날 때까지 유지한다.
- Mirror OFF이면 월드 고정 연출이나 특수 Action처럼 자동 좌우 반전이 필요 없는 경우에만 사용한다.

MVP Runtime 해석 범위:

- `move` modifier의 X 이동량은 Mirror ON 상태에서 캐릭터가 왼쪽을 바라보면 반대로 적용한다.
- Action Timeline의 X / rotation 값은 기존 `facing` 렌더 transform을 재사용해 좌우 반전된다.
- Mirror OFF에서는 왼쪽을 바라볼 때 Action Timeline X / rotation이 자동 반전되지 않도록 Runtime offset 해석에서 보정한다.
- 좌우 대칭 Trigger는 Runtime matching 단계에서만 해석하며, Action을 복사하거나 반대 방향 Trigger를 저장하지 않는다.

저장 위치와 schema는 `11_DATA_MODEL.md`의 `actionSettings.mirror`를 본다.

분리 가능성:

- Editor Timeline은 `actionKey`만 바꾸면 여러 Action key를 다룰 수 있는 형태에 가깝다.
- 저장/normalize는 `ACTION_KEYS` 고정 반복이라 Skill 저장 구조가 별도로 필요하다.
- Runtime 입력과 state field는 Basic Action에 강하게 묶여 있어 Skill 실행 layer가 필요하다.

## Runtime Hardcoding Classification

제거 가능:

- 새 Action마다 `ACTION_KEYS`와 Runtime 분기를 직접 추가하는 방식.
- 공격 1/2/3타 strike window를 Runtime 상수로 계속 늘리는 방식.
- fallback attack preview처럼 특정 Action 이름을 UI/debug 조건으로 직접 판단하는 방식.

Runtime에 반드시 남아야 함:

- 입력 수집과 현재 눌림/방금 눌림 상태.
- 위치, 속도, 중력, 월드 경계 계산.
- 공중 조작은 Action이 아니라 World Physics 이동 보정이다. `onGround === false`일 때 좌우 입력을 현재 Action 위에 얹어 `vx += airControl` 방식으로 적용하며, 좌/우 이동 입력 자체로 Action 전환이나 Cancel을 발생시키지 않는다.
- HP, 죽음, respawn, score 같은 게임 규칙.
- 충돌/피격/공격 overlap 계산.
- Editor 원본을 수정하지 않는 Runtime 계산값 생성.

Formula / Interaction 쪽으로 이동 가능:

- 속도 같은 Action 실행 중 위치/velocity 보정.
- 무적 시간 적용.
- 색 변화 / tint / hit flash 성격의 Action별 표시 옵션.
- 구르기 뒤 무적.
- roll ghost 같은 Action 실행 중 시각 옵션.
- Action별 attack reaction 기본값.

## Interaction

목표 Interaction:

- collision: 충돌. Setup 기본값은 위치/크기/회전과 `noOverlap`, `pushPower`, `resistance`다.
- hurt: 피격. Setup 기본값은 위치/크기/회전과 `hurtByAttack`, `hurtByCollision`, `invincibleTime`이다.
- attack: 공격. Setup 기본값은 위치/크기/회전과 `damage`, `knockback` 설정이다.
- guard: 방어. Setup 기본값은 위치/크기/회전과 `block`, `deflect`, `parry` concept flag다.

Editor 동작:

```text
Interaction box click
→ Interaction card 표시
→ Action-level Interaction ON
→ Canvas에 box 표시
→ 기존 Transform handle로 위치/크기/회전 편집
→ Property scrub/stepper로 같은 값 편집
```

설계 원칙:

- 현재 `interaction_object_editor_controller.js`의 role/key 정의를 재사용한다.
- 현재 Transform 모델 `x/y/ax/ay/w/h/rot/opacity`를 재사용한다.
- `interaction_field_data.js`의 role별 option field 정의를 Setup 기본값과 Action override UI가 같이 사용한다.
- Runtime `InteractionRegion`은 계속 계산값이다.
- Runtime attack/hurt/collision/guard region을 Editor source로 쓰지 않는다.
- Action에서 role을 켜면 `actionSettings[actionKey].interactions[interactionObjectKey]`가 해당 Action 전체에 적용된다.
- 기존 Action frame 값은 compatibility source로 유지하며, 해당 frame에서 `active + role`이 켜진 경우 Action-level Interaction보다 우선한다.
- Action-level Interaction 설정이 존재하는 Action에서는 `active + role`이 꺼진 box를 Runtime region으로 만들지 않는다.
- Action-level Interaction 설정이 없는 Action만 Setup fallback box를 사용한다.
- Interaction box를 클릭하면 box key에 대응하는 role 설정을 기본으로 펼친다. 예: `attackInteractionObject → attack`.
- Attack knockback 방향은 별도 방향 필드를 저장하지 않고 MVP에서는 공격자 → 피격자 방향으로 해석한다.
- Camera Shake는 Attack Interaction에 저장하지 않는다. 공격박스가 피격박스에 실제로 닿아 damage / knockback 처리 위치에 도달했을 때 Stage의 스테이지 물리 hit camera shake 설정을 읽어 실행한다.

현재 구조와의 차이:

- 현재는 fallback interaction object, Action-level Interaction, Action frame state가 분리되어 저장된다. 저장 위치는 `11_DATA_MODEL.md`를 본다.
- 목표는 Action 안에서 Interaction 생성 여부와 box 목록을 명시한다.
- MVP에서는 기존 fallback object와 frame state를 compatibility source로 유지한다.
- Collision `noOverlap`은 Runtime에서 겹친 Collision Box를 밀어내는 규칙으로 작동한다.
- Hurt `hurtByAttack` / `hurtByCollision`은 Runtime 피격 조건으로 작동한다.
- Guard `block`은 Attack damage를 막는 최소 규칙으로 작동한다.
- Guard의 Deflect / Parry 세부 규칙, Finisher, 속성/상태이상 등은 Interaction MVP 이후 단계다.

## Formula Runtime

목표 구조:

```text
Action
↓
formulas[]
↓
formula_runtime_engine
↓
Runtime
```

현재 MVP:

- 속도: `startFrame`~`endFrame` 구간에서 Action Timeline frame 기준 `px/f` velocity를 만든다. Runtime FPS 기준 속도로 변환하지 않는다.
- 고정: 구간 동안 선택한 direction으로 facing을 강제한다.
- 보간: Action 전환 포즈를 연결한다.
- 캔슬: 구간 안에서만 다른 Action으로 전환 가능하게 한다.
- 연계: 지정한 source Action의 구간 안에서만 target Action 실행을 허용한다.
- 현재 저장 shape는 `11_DATA_MODEL.md`의 `actionSettings.formulas`를 본다.

설계 원칙:

- Formula별 Runtime 적용 지점은 `formula_runtime_engine`이 계산한 결과만 읽는다.
- Formula Card는 모두 같은 Mini Timeline UI를 사용해 `startFrame` / `endFrame` 작동 구간을 표현한다.
- Action Duration이 바뀌면 Mini Timeline block 수도 Action frame 수를 따라간다.
- Velocity 카드 UI는 현재 `ACTION_FPS`를 읽어 `1s = {ACTION_FPS}f`를 표시하고, X/Y 입력에는 `px/f` 단위를 표시한다.
- Velocity Runtime은 현재 Action Timeline progress로 적용 구간을 판단하고, `px/f` 값을 World Physics velocity state에 적용한다.
- Runtime FPS가 60이든 120이든 `5 px/f`는 Action Timeline 1프레임 동안 5px 이동한다.
- 중력은 Action Modifier가 아니라 Stage World Physics acceleration이다. 단위는 `px/f²`이며, 매 Action Timeline frame마다 `vy += gravity` 관계로 해석한다.
- 관성은 velocity가 0이 되기까지 걸리는 `frame` 수다.
- 공중 조작은 Stage World Physics 값이며 단위는 `px/f`다. 공중에서 좌우 입력이 있을 때만 현재 `vx`에 더하고, 지상에서는 적용하지 않는다.
- 기본 관성은 Stage 스테이지 물리의 `관성` Runtime Rule에서 처리하고, Action별 `관성` Formula는 활성 구간 동안 이 값에 추가 관성을 더한다.
- 이동 / 가속 / 감속 수식은 Formula Library에서 제거했다.
- Formula 설정 UI는 공통 Formula Editor를 사용한다.

## Recommended Implementation Order

1. Action schema 후보와 normalize strategy를 확정한다.
2. Basic Actions compatibility layer를 만든다.
3. Skill 데이터 생성만 추가한다.
4. Skill Timeline을 기존 Timeline adapter에 연결한다.
5. Interaction checkbox와 box 생성을 붙인다.
6. 속도 / 고정 / 보간 / 캔슬 / 연계 Formula MVP를 Runtime에 최소 연결한다.
7. Runtime Skill trigger와 Timeline playback을 연결한다.

## Risks

- `ACTION_KEYS` 고정 구조가 Skill 확장을 막는다.
- Basic Action Runtime과 Skill Runtime이 한동안 공존한다.
- Interaction source가 fallback rig object, pose frame value, future action data로 나뉠 수 있다.
- Modifier가 커지면 Runtime 곳곳에 다시 분산될 수 있다.
- 저장 구조 변경은 별도 작은 migration 계획 없이 진행하면 기존 저장 데이터가 깨질 수 있다.
