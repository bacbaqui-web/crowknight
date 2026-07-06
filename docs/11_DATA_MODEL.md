# 11_DATA_MODEL.md

이 문서는 데이터가 어떻게 저장되는지만 설명한다.

## Actor Tuning

Actor별 제작 데이터의 중심 객체다.

- 현재 Action 데이터는 별도 `actions` 컬렉션이 아니라 `actionOffsets`, `actionSettings`, `effectOffsets`, `effectSettings`, 일부 `motion/invulnerability` 필드에 나뉘어 있다.
- `tuning.rig`: Setup base rig.
- `tuning.actionOffsets`: Action Timeline frame data.
- `tuning.actionSettings`: Action duration/playback settings.
- `tuning.customActions`: 사용자 제작 Action 목록. MVP에서는 custom Action의 `key`, `name`과 legacy mirror `trigger`를 저장한다.
- `tuning.deletedActionKeys`: Editor 목록에서 숨긴 Basic Action key 목록. `idle`은 삭제할 수 없고 이 목록에 들어가지 않는다.
- `tuning.actionTriggers`: 모든 Action key의 Trigger override map. Basic/Custom을 같은 방식으로 다루는 compatibility 저장소다.
- `tuning.effectOffsets`: Effect Timeline frame data.
- `tuning.effectSettings`: Effect duration/playback settings.
- `tuning.hud`: 이름/HP HUD layout data.
- `tuning.layerOrder`: part render layer order.
- `tuning.transform`: actor scale/anchor.
- `tuning.maxHpPips`: HP 설정.

## Action 저장 경계

Action 제작 모델의 목표와 migration 원칙은 `13_ACTION_MODEL.md`를 본다. 이 문서는 현재 저장 위치만 기록한다.

현재 Action 관련 저장 source:

- `tuning.customActions`: 사용자 제작 Action 목록.
- `tuning.deletedActionKeys`: Editor 목록에서 숨긴 Basic Action key.
- `tuning.actionTriggers`: Action 발동 입력 조건.
- `tuning.actionSettings`: Action duration/playback/runtime option.
- `tuning.actionOffsets`: Action Timeline frame data.
- `tuning.modifiers.action`: Action 실행 중 적용되는 modifier 목록.

현재 Effect 관련 저장 source:

- `tuning.effectSettings`: Effect duration/playback option.
- `tuning.effectOffsets`: Effect Timeline frame data.
- `tuning.modifiers.effect`: Effect modifier 목록.

## `actionSettings`

Action 재생과 Runtime option 저장 위치다.

```text
tuning.actionSettings[actionKey]
```

현재 필드:

```js
{
  duration: 0.6,
  playback: "loop",
  playbackRate: 1,
  mirror: true,
  interruptible: true,
  interruptPriority: 0,
  blendFrames: 0,
  condition: "any",
  group: "movement",
  editPivot: { x: 0, y: 0 }
}
```

- `duration`: Timeline 기본 길이.
- `playback`: `once`, `loop`, `pingpong` 중 하나. UI에서는 Timeline의 "재생 방식" 버튼으로 순환 선택한다.
- `playbackRate`: 재생 속도.
- `mirror`: 좌우 자동 거울상 적용 여부. 기본값은 `true`이며, `false`일 때만 Runtime이 자동 좌우 반전을 사용하지 않는다.
- `interruptible`: 실행 중 다른 Trigger Action으로 교체 가능한지 여부. UI에서는 Cancel 버튼으로 표시한다.
- `interruptPriority`: Trigger Action 교체 우선순위.
- `blendFrames`: Action 전환 시 이전 표시 포즈에서 새 Action 첫 프레임 포즈까지 연결하는 프레임 수. `0~5` 값을 사용하며 기본값은 `0`이다. Runtime MVP에서는 Action Timeline FPS 기준으로 Blend를 먼저 재생한 뒤 새 Action Timeline을 시작한다.
- `condition`: Trigger가 맞은 뒤 Action 실행 가능 여부를 판단하는 조건. `any`, `ground`, `air` 중 하나이며 기본값은 `any`다. Runtime은 World Physics의 `onGround` 상태만 사용해 판정한다.
- `group`: Editor 목록과 기본자세 fallback 선택에 쓰는 Action 그룹. `base`, `movement`, `attack`, `special` 중 하나이며 custom Action 기본값은 `movement`다. 기존 `idle`은 `base`로 normalize한다.
- `editPivot`: Action Timeline에서 파츠 선택 없이 전체 키프레임을 그룹처럼 편집할 때 쓰는 Action 공통 Pivot이다. `{ x, y }` 형태이며 기본값은 `{ x: 0, y: 0 }`이다. Pivot은 Action별로 하나만 저장하고 키프레임별로 저장하지 않는다.

Action group 허용값:

```js
group: 'base' | 'movement' | 'attack' | 'special';
```

- `base`: 아무 Trigger Action도 없을 때 Condition으로 기본자세 후보를 고르는 그룹.
- `movement`: 이동, 점프, 회피처럼 이동 계열 Action.
- `attack`: 공격 계열 Action.
- `special`: 방어, 패링, 활강, 피격 같은 특수 Action.

기본 fallback Action 기본값:

- `idle`: `group = "base"`, `condition = "ground"`
- `fall`: `group = "base"`, `condition = "air"`

## `actionTriggers`

Action 발동 입력 조건 저장 위치다. Trigger 설계 원칙은 `13_ACTION_MODEL.md`를 본다.

MVP 저장 위치:

```text
tuning.actionTriggers[actionKey]
```

Custom Action legacy mirror:

```text
tuning.customActions[]
├─ key
├─ name
└─ trigger // actionTriggers와 동기화되는 호환 필드
```

지원 형태:

```js
{ type: "single", keys: ["Q"] }
{ type: "sequence", keys: ["Q", "Q", "Q"], maxGapMs: 350 }
{ type: "holdCombo", hold: "ArrowUp", press: "W" }
```

Trigger 실행 모드:

```js
triggerMode: 'tap' | 'press' | 'pressLoop';
```

- `tap`: Trigger가 맞는 순간 Action을 끝까지 한 번 실행한다. release와 관계없다.
- `press`: Trigger 입력이 유지되는 동안만 Action을 진행한다. release하면 즉시 종료하고, duration 끝에 도달해도 종료한다.
- `pressLoop`: Trigger 입력이 유지되는 동안 Action을 유지한다. release하면 즉시 종료하고, duration 이후 progress는 Timeline playback 값을 따른다.
- `repeatWhileHeld: true`는 legacy compatibility 입력으로 읽는다. 명시적 `triggerMode`가 없으면 현재 normalize 단계에서 `press`로 해석한다.
- `actionSettings[actionKey].mirror`가 `true`이면 Runtime Trigger matching에서 `ArrowLeft` / `ArrowRight`를 좌우 대칭 입력으로 해석할 수 있다. 반대 방향 Trigger를 `actionTriggers`에 추가 저장하지 않는다.

지원 key:

- `Q`
- `W`
- `E`
- `Space`
- `ArrowUp`
- `ArrowDown`
- `ArrowLeft`
- `ArrowRight`

Runtime 해석 규칙과 겹치는 Sequence 처리 방향은 `13_ACTION_MODEL.md`를 본다.

## `modifiers`

Action / Effect Timeline Target에 붙는 수식 데이터다.

MVP 저장 위치:

```text
tuning.modifiers.action[actionKey]
tuning.modifiers.effect[effectKey]
```

현재 MVP 수식:

```js
[
  {
    type: 'move',
    enabled: true,
    settings: { x: 50, y: 0, frames: 10 },
  },
  {
    type: 'velocity',
    enabled: true,
    settings: { x: 500, y: 0, mode: 'set', startFrame: 1, endFrame: 10 },
  },
  {
    type: 'accelerate',
    enabled: true,
    settings: { graph: 'linear', startFrame: 1, endFrame: 4 },
  },
  {
    type: 'decelerate',
    enabled: false,
    settings: { graph: 'linear', startFrame: 7, endFrame: 10 },
  },
];
```

Modifier Runtime 해석 원칙은 `13_ACTION_MODEL.md`를 본다.

공통 구간 필드:

- `startFrame`: modifier가 시작되는 Action frame. 1-based 값이다.
- `endFrame`: modifier가 끝나는 Action frame. 1-based 값이다.

`velocity`:

- `x`, `y`: Action Timeline frame 기준 velocity 값. 단위는 `px/f`다.
- `mode`: `set` 또는 `add`.
- `startFrame`, `endFrame`: 적용 구간.
- Runtime은 `px/f`를 초당 속도나 Runtime FPS 기준 값으로 변환하지 않는다.
- Runtime은 `px/f` 값을 World Physics velocity state에 적용하고, 위치 계산은 Action Timeline frame delta로 적분한다.

Velocity UI 표시 규칙:

- Velocity 카드 제목 오른쪽에는 `1s = {ACTION_FPS}f`를 표시한다.
- `{ACTION_FPS}`는 `game_config_data.js`의 `ACTION_FPS` 값을 읽어 표시한다.
- X/Y Velocity 입력 오른쪽에는 `px/f` 단위를 표시한다.

지원 graph 값:

- `linear`
- `easeIn`
- `easeOut`

## Action Descriptor Compatibility Layer

Runtime과 Editor가 앞으로 공통으로 볼 임시 Action descriptor다.

```js
{
  key: "attack1",
  name: "공격 1타",
  trigger: { type: "single", keys: ["Q"] },
  runtimeMode: "legacy", // migration flag
  timeline: {
    settings: {},
    offsets: {}
  },
  modifiers: [],
  deletable: false
}
```

`runtimeMode` migration 의미와 최종 목표는 `13_ACTION_MODEL.md`를 본다.

## `tuning.rig`

Setup에서 직접 편집하는 base rig다.

- image part: `body`, `head`, `cape`, `shield`, `weapon`, arm/leg parts.
- control part: `neck`, `shoulderL`, `shoulderR`, `hipL`, `hipR`.
- fallback interaction object: `collisionInteractionObject`, `hurtInteractionObject`, `attackInteractionObject`, `guardInteractionObject`.

일반 part 주요 필드:

- `x`, `y`
- `w`, `h`
- `baseW`, `baseH`
- `ax`, `ay`
- `rot`
- `opacity`

## Fallback Interaction Objects

Editor 기준 fallback interaction object 저장 위치다.

| Key                          | Role        | Parent   | 저장 필드                                                                            |
| ---------------------------- | ----------- | -------- | ------------------------------------------------------------------------------------ |
| `collisionInteractionObject` | `collision` | `body`   | `type`, `parent`, `x`, `y`, `ax`, `ay`, `w`, `h`, `baseW`, `baseH`, `rot`, `opacity` |
| `hurtInteractionObject`      | `hurt`      | `body`   | `type`, `parent`, `x`, `y`, `ax`, `ay`, `w`, `h`, `baseW`, `baseH`, `rot`, `opacity` |
| `attackInteractionObject`    | `attack`    | `weapon` | `type`, `parent`, `x`, `y`, `ax`, `ay`, `w`, `h`, `baseW`, `baseH`, `rot`, `opacity` |
| `guardInteractionObject`     | `guard`     | `shield` | `type`, `parent`, `x`, `y`, `ax`, `ay`, `w`, `h`, `baseW`, `baseH`, `rot`, `opacity` |

저장 key는 InteractionObject 용어를 사용한다.

## Runtime InteractionRegion

Runtime/Combat 계산값이다.

Runtime 피격 판정 geometry:

```text
active + hurt object recorded region
→ actor.player.hurtInteractionRegions
→ fallback: tuning.rig.hurtInteractionObject
```

Runtime 공격 판정 geometry:

```text
active + attack object recorded region
→ actor.player.attackInteractionRegions
→ fallback: tuning.rig.attackInteractionObject
```

Runtime 공격 효과:

```text
tuning.actionOffsets[actionKey][partKey].stun/knockbackX/knockbackY/deathBurst
→ actor.player.attackInteractionRegion.reaction
→ combat_engine.applyHitReaction()
```

Runtime mirror field는 저장하지 않는다.

## `actionOffsets`

Action Timeline frame data다.

형태:

```text
tuning.actionOffsets[actionKey][partKey]
```

Frame container:

- `start`
- `end`
- `keyframes[]`

Frame value:

- `id`
- `t`
- `x`, `y`
- `ax`, `ay`
- `w`, `h`
- `rot`
- `opacity`
- `active` (common interaction state)
- `attack`, `hurt`, `collision`, `guard` (interaction role switches)
- `stun`, `knockbackX`, `knockbackY`, `deathBurst` (attack reaction settings)
- `pushPower` (collision push setting)
- root anchor field 일부

## `effectOffsets`

Effect Timeline frame data다.

형태:

```text
tuning.effectOffsets[effectKey]
```

Frame container:

- `start`
- `end`
- `keyframes[]`

Frame value:

- `id`
- `t`
- `x`, `y`
- `ax`, `ay`
- `w`, `h`
- `rot`
- `opacity`
- `image`
- `active`
- `attack`, `hurt`, `collision`, `guard`
- `stun`, `knockbackX`, `knockbackY`, `deathBurst`
- `pushPower`

## HUD

위치:

```text
tuning.hud.offsetY
```

저장 데이터:

- HUD 그룹의 y offset만 저장한다.
- 이름과 HP Bar의 개별 x/y는 저장하지 않는다.

## StageRules

위치:

```text
sceneSession.stageRules
```

구조:

- `progression`
- `worldPhysics`
- `enemy`
- `reward`
- `score`

`worldPhysics`:

```js
{
  gravity: 1,
  inertia: 30
}
```

- `gravity`: 공중 상태에서 매 Action Timeline frame `vy`에 더하는 값. 단위는 `px/f²`다.
- `inertia`: 입력이나 impulse가 멈춘 뒤 현재 velocity가 0이 되기까지 걸리는 frame 수. `0`이면 즉시 멈추고, 값이 클수록 더 오래 미끄러진다.

World Physics UI 표시 규칙:

- Gravity 입력 오른쪽에는 `px/f²`를 표시한다.
- Inertia 입력 오른쪽에는 `frame`을 표시한다.

## Project State

저장 단위:

- actors
- active actor/session
- scene sessions
- asset references
- tuning data

Asset reference 규칙:

- `actors[id].assets`: 캐릭터 파츠 PNG source와 선택 캐릭터 PSD source를 저장한다.
- `characters`: Setup 캐릭터 목록 metadata를 저장한다. 저장된 `characters`가 없을 때만 기존 고정 `ACTOR_DEFS`를 fallback으로 사용한다.
- 새 캐릭터는 `id`, `type`, `name`, `folder`, `storageFolder`, `psdFileName`, `deletable`을 가진다. `folder`는 로컬 `assets/characters/{folder}`와 Firebase Storage `crow-knight/assets/characters/{folder}`를 연결하는 기준이다.
- `effectAssets`: 이펙트 PNG source와 선택 가능한 effect PSD source를 저장한다.
- `sessions[id].background.psdPreview`: 배경 preview URL, 원본 PSD source URL, 크기 metadata를 저장한다.
- `sessions[id].background.psdLayers`: 배경 PSD layer 이미지 URL과 layer별 편집 metadata를 저장한다.
- 상단 Firebase 업로드 버튼은 Project State metadata만 Firestore에 저장한다. PSD/PNG/WebP Storage 업로드는 실행하지 않는다.
- 상단 Firebase 다운로드 버튼은 Firestore metadata만 받아 설정 수치에 적용한다.
- Project State metadata는 `projectSettings/crowKnight` 단일 문서에 저장한다. 문서 크기를 줄이기 위해 가능하면 gzip-base64 압축 필드로 저장한다.
- Setup / Effect / Stage 내부 업로드/새로고침 버튼은 각 섹션의 asset만 Storage/Runtime export에 반영한다.
- Firebase Storage asset은 `crow-knight/assets/backgrounds`, `crow-knight/assets/characters`, `crow-knight/assets/effects`, `crow-knight/assets/icons` 아래에 저장한다.
- Setup 기본 캐릭터 PSD 원본은 Storage의 `characters/player/player.psd`와 `characters/enemy/enemy.psd`를 따른다. 새 캐릭터는 `characters/{folder}/{psdFileName}`을 따른다.
- Setup에서 PSD를 업로드하면 PSD가 먼저 Storage 원본 경로에 저장되고, 캐릭터 새로고침은 Storage PSD를 다시 읽어 로컬 PNG를 재생성한다.
- PSD 새로고침으로 생성된 캐릭터 PNG는 선택 캐릭터의 로컬 Runtime export 결과이며, 상단 metadata 업로드가 PNG를 Storage에 올리지는 않는다.
- Firestore metadata는 설정 수치 JSON이다. binary asset 업로드와 분리한다.

저장 경로:

- local storage
- Firebase project state
- Firebase Storage asset references
