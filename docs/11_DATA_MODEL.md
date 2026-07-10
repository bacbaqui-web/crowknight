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

- `tuning.effectSettings`: Effect duration/playback option과 Effect 이미지 파일명용 `fileName`.
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
  editPivot: { x: 0, y: 0 },
  interactions: {},
  ai: {
    enabled: true,
    minRange: 0,
    maxRange: 120,
    cooldown: 1.5,
    chance: 70,
    priority: 50
  },
  formulas: [
    { type: "cast", enabled: true, mode: "repeat", repeatStartFrame: 2, repeatEndFrame: 6, releaseMode: "immediate" },
    { type: "velocity", enabled: true, startFrame: 1, endFrame: 10, x: 5, y: 0, mode: "set" },
    { type: "inertia", enabled: true, startFrame: 1, endFrame: 10, addInertia: 40, applyTarget: "air" },
    { type: "lock", enabled: true, startFrame: 1, endFrame: 8, direction: "right" },
    { type: "blend", enabled: true, startFrame: 1, endFrame: 3, frames: 3 },
    { type: "cancel", enabled: true, startFrame: 5, endFrame: 12, priority: 0 },
    { type: "link", enabled: true, fromActions: ["attack1"], startFrame: 6, endFrame: 12 },
    { type: "cooldown", enabled: true, seconds: 0.5 },
    { type: "ai", enabled: true },
    { type: "afterimage", enabled: true, startFrame: 1, endFrame: 8, amount: 1, opacity: 0.35, color: "#8edab8", colorOpacity: 0.35, fadeFrames: 10 },
    { type: "zoom", enabled: true, startFrame: 1, endFrame: 8, scale: 2 },
    { type: "projectile", enabled: true, spawnFrame: 5, imageKey: "effect_arrow", offsetX: 30, offsetY: -40, flightFrames: 45, arcHeight: 180, hitboxWidth: 30, hitboxHeight: 8 }
  ]
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
- `interactions`: Action 단위 Interaction 설정이다. Interaction box를 Action 탭에서 클릭하면 Timeline keyframe 선택과 무관하게 이 위치에 저장한다.
- `ai`: Stage 탭 Enemy AI 전용 설정이다. `enabled`, `minRange`, `maxRange`, `cooldown`, `chance`, `priority`를 가진다. 이는 Action 연출 Formula가 아니며, Enemy AI 후보 선택에서만 사용한다.
- `formulas`: Action 단위 Formula Card 저장 위치다. 수식 라이브러리에서 `시전`, `AI`, `쿨타임`, `속도`, `목표이동`, `관성`, `잔상`, `색변화`, `흔들림`, `확대`, `투사체`, `고정`, `보간`, `캔슬`, `연계`를 켜면 이 배열에 저장한다.
- `runtimeRules`: legacy compatibility 저장 위치다. UI에는 직접 표시하지 않으며 normalize/migration 단계에서 `formulas[]`로 변환한다.

Formula Card:

- `cast` / UI `시전`: Trigger가 맞은 뒤 Action 입력 방식을 정한다. `mode`, `repeatStartFrame`, `repeatEndFrame`, `releaseMode`를 가진다. `formulas[]`가 있는 Action에서 Formula가 없으면 기본 동작은 `tap` Event다. `press`와 `repeat`도 Action 시작은 pressed Event로만 일어나며, 시작된 뒤 held input State로 유지 / 반복 / release를 처리한다. 현재 Action이 비어 있거나 기본자세로 돌아온 상태에서는 held State로 복귀 Action을 다시 시작할 수 있다.
- `ai` / UI `AI`: 이 Action을 Stage Enemy AI 목록에 등록한다. 거리 / 쿨타임 / 확률 / 우선순위 값은 저장하지 않고, Stage Enemy AI 표의 `actionSettings[actionKey].ai`를 사용한다.
- `cooldown` / UI `쿨타임`: 이 Action이 실행된 뒤 다시 실행 가능해지기까지 필요한 초 단위 시간을 가진다. `seconds`를 사용하며 기본값은 `0`이다.
- `velocity` / UI `속도`: `startFrame~endFrame` 동안 `px/f` velocity를 적용한다. `x`, `y`, `mode`를 가진다.
- `targetMove` / UI `목표이동`: `triggerFrame`에 발동해 그림자 / 발밑 기준 목표 좌표까지 이동한다. `triggerFrame`, `x`, `y`, `moveFrames`를 가진다. `moveFrames`는 `0`이면 즉시 도달, `1~10`이면 해당 Action Timeline frame 수 동안 목표까지 보간한다. Mini Timeline은 사용하지 않는다.
- `inertia` / UI `관성`: `startFrame~endFrame` 동안 World Physics 기본 관성에 `addInertia`를 더한다. `applyTarget`은 `ground`, `air`, `all` 중 하나다.
- `afterimage` / UI `잔상`: `startFrame~endFrame` 동안 actor pose snapshot을 남기는 시각 효과다. `amount`, `opacity`, `color`, `colorOpacity`, `fadeFrames`를 가진다. `amount`는 Action Timeline 1프레임당 생성 수다. 원본 캐릭터 잔상은 `opacity`로 그리고, 색상 실루엣은 그 위에 `colorOpacity`로 얹는다. Runtime 판정에는 영향을 주지 않는다.
- `zoom` / UI `확대`: `startFrame~endFrame` 동안 화면 배율을 임시로 키운다. `scale`을 가지며 저장된 기본 화면 배율은 변경하지 않는다. 여러 actor에서 동시에 활성화되면 Runtime은 가장 큰 배율을 사용한다.
- `projectile` / UI `투사체`: `spawnFrame`에 Runtime 전용 투사체 객체를 1개 생성한다. `imageKey`, `offsetX`, `offsetY`, `flightFrames`, `arcHeight`, `hitboxWidth`, `hitboxHeight`를 가진다. 생성 순간 player 위치를 목표로 고정하고, Effect asset은 그림으로만 사용한다. Effect Timeline frame data는 사용하지 않는다.
- `lock` / UI `고정`: 구간 동안 지정한 방향을 바라보게 한다. `direction`은 `left`, `right`, `away` 중 하나이며, `away`는 플레이어의 반대 방향을 바라본다. 기존 direction 없는 데이터는 `right`로 normalize한다.
- `blend` / UI `보간`: Action 전환 포즈 연결을 적용한다. `frames`를 가진다.
- `cancel` / UI `캔슬`: 구간 동안만 다른 Action으로 interrupt 가능하다. `priority`를 가진다.
- `link` / UI `연계`: Trigger가 맞은 뒤 현재 실행 중인 Action과 frame 구간을 검사한다. `fromActions`, `startFrame`, `endFrame`을 가진다.
- compatibility: 기존 `runtimeRules`와 `tuning.modifiers.action[actionKey]`의 `velocity`는 normalize/migration 단계에서 `formulas[]`로 변환한다.
- Enemy AI compatibility: 새 Stage AI UI는 `actionSettings[actionKey].ai`를 저장한다. 새 데이터에서는 enabled `ai` Formula가 있는 Action만 Stage AI 목록 / Runtime AI 후보가 된다. 기존 `range` Formula는 `formulas[]`와 `ai` 설정이 없는 구 데이터에서만 Runtime fallback으로 해석한다.

## Stage Enemy Actor Rules

캐릭터별 Enemy AI / 피격 규칙은 Stage rules에 저장한다.

```text
sceneSession.stageRules.enemy.actorRulesByActor[actorId]
```

현재 필드:

```js
{
  hitCancelChance: 20,
  hitCancelFlashFrames: 3
}
```

- `hitCancelChance`: 공격 / 투사체가 Hurt Region에 맞았을 때 damage / knockback / hurt를 무효화할 확률이다. `0~100` 값을 사용하며 기본값은 `0`이다.
- `hitCancelFlashFrames`: 피격 무효 성공 시 흰색 flash가 유지되는 frame 수다. 기본값은 `3`이다.
- Runtime clone은 원본 `actorId`의 `actorRulesByActor` 값을 공유한다.

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

Trigger 실행 모드 legacy:

```js
triggerMode: 'tap' | 'press' | 'pressLoop';
```

- `tap`: Trigger가 맞는 순간 Action을 끝까지 한 번 실행한다. release와 관계없다.
- `press`: Trigger 입력이 유지되는 동안만 Action을 진행한다. release하면 즉시 종료하고, duration 끝에 도달해도 종료한다.
- `pressLoop`: Trigger 입력이 유지되는 동안 Action을 유지한다. release하면 즉시 종료하고, duration 이후 progress는 Timeline playback 값을 따른다.
- `repeatWhileHeld: true`는 legacy compatibility 입력으로 읽는다. 명시적 `triggerMode`가 없으면 현재 normalize 단계에서 `press`로 해석한다.
- 새 입력 방식은 `actionSettings[actionKey].formulas[]`의 `type: "cast"`가 우선한다. `cast` Formula가 없으면 기존 Trigger mode compatibility 값을 fallback으로 사용한다.
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

Effect Timeline Target에 남아 있는 legacy modifier 데이터다. Action 수식은 `actionSettings[actionKey].formulas[]`를 사용한다.

MVP 저장 위치:

```text
tuning.modifiers.effect[effectKey]
```

Action Formula Runtime 해석 원칙은 `13_ACTION_MODEL.md`를 본다.

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

| Key                          | Role        | Parent   | 저장 필드                                                                                         |
| ---------------------------- | ----------- | -------- | ------------------------------------------------------------------------------------------------- |
| `collisionInteractionObject` | `collision` | `body`   | Transform fields + `noOverlap`, `pushPower`, `resistance`                                         |
| `hurtInteractionObject`      | `hurt`      | `body`   | Transform fields + `hurtByAttack`, `hurtByCollision`, `invincibleTime`                            |
| `attackInteractionObject`    | `attack`    | `weapon` | Transform fields + `knockback`, `knockbackExtraVx`, `knockbackExtraVy`, `hitMode`, `followWeapon` |
| `guardInteractionObject`     | `guard`     | `shield` | Transform fields + `guard`, `parry`, `attack`                                                     |

저장 key는 InteractionObject 용어를 사용한다.

Transform fields는 `type`, `parent`, `x`, `y`, `ax`, `ay`, `w`, `h`, `baseW`, `baseH`, `rot`, `opacity`를 뜻한다.

## Runtime InteractionRegion

Runtime/Combat 계산값이다.

Interaction source 우선순위:

```text
Action frame override
→ actionSettings[actionKey].interactions[interactionObjectKey]
→ tuning.rig[interactionObjectKey]
```

Action frame override는 해당 frame에서 `active + role`이 켜진 경우에만 Action-level 설정보다 우선한다.
Action-level interaction 설정이 존재하면 그 Action은 해당 설정을 따른다. 이 설정에서 `active + role`이 꺼져 있으면 Hurt/Collision/Attack/Guard region은 생성되지 않는다.
Action-level 설정이 아예 없을 때만 `tuning.rig[interactionObjectKey]`를 fallback으로 사용한다.
`attackInteractionObject` action-level setting은 `startFrame`, `endFrame`을 가질 수 있다. 값이 있으면 현재 Action frame이 해당 구간 안에 있을 때만 Attack region을 생성한다.
`followWeapon`은 기본값 `1`이다. `1`이면 기존처럼 weapon anchor transform을 부모로 사용하고, `0`이면 actor/action root 기준으로 Attack region을 계산한다.

Runtime 피격 판정 geometry:

```text
tuning.rig.hurtInteractionObject
→ tuning.actionSettings[actionKey].interactions.hurtInteractionObject action-level setting
→ tuning.actionOffsets[actionKey].hurtInteractionObject 현재 frame override
→ actor.player.hurtInteractionRegions
→ interaction_region_engine 직접 계산
```

Runtime 공격 판정 geometry:

```text
tuning.rig.attackInteractionObject
→ tuning.actionSettings[actionKey].interactions.attackInteractionObject action-level setting
→ tuning.actionOffsets[actionKey].attackInteractionObject 현재 frame override
→ actor.player.attackInteractionRegions
→ interaction_region_engine 직접 계산
```

`player.hitRegions`는 `actor_renderer`가 draw 단계에서 기록하는 Canvas/Edit overlay용 geometry다.
Combat은 draw 순서에 의존하지 않도록 `player.hitRegions`를 Runtime source로 사용하지 않는다.

Runtime 공격 효과:

```text
tuning.actionOffsets[actionKey][partKey].knockback/knockbackExtraVx/knockbackExtraVy/hitMode
legacy: stun/knockbackX/knockbackY/deathBurst
→ actor.player.attackInteractionRegion.reaction
→ combat_engine.applyHitReaction()
```

Attack damage는 Runtime에서 항상 `1`로 처리한다. 기존 저장 데이터에 `damage` 값이 남아 있어도 Runtime damage 계산에는 사용하지 않는다.
Attack knockback은 이전 frame Attack Region 중심점 → 현재 frame Attack Region 중심점 이동 벡터에 `knockback`을 곱한 값에 `knockbackExtraVx`, `knockbackExtraVy`를 더한다. `knockbackExtraVx`는 공격자 facing 기준으로 좌우 반전하고, `knockbackExtraVy`는 월드 기준 값으로 그대로 사용한다.

Runtime collision / hurt / guard 효과:

```text
collision.noOverlap / pushPower / resistance
→ combat_engine.resolveCollisionInteractions()

hurt.hurtByAttack / hurtByCollision / invincibleTime
→ combat_engine.applyInteractionDamage()

guard.guard
→ combat_engine.overlappingGuardBlockAttackRegion()
→ damage만 무효, hit effect / camera shake / knockback은 유지

guard.attack
→ interaction_region_engine.createAttackInteractionRegions()
→ Guard Box geometry + attackInteractionObject attack settings
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
- `knockback`, `knockbackExtraVx`, `knockbackExtraVy`, `hitMode`, `followWeapon` (attack MVP settings)
- `damage` (legacy 저장 호환. Runtime damage는 항상 `1`)
- `stun`, `knockbackX`, `knockbackY`, `deathBurst` (legacy attack reaction compatibility)
- `noOverlap`, `pushPower`, `resistance` (collision settings)
- `hurtByAttack`, `hurtByCollision`, `invincibleTime` (hurt settings)
- `guard`, `parry`, `attack` (guard concept flags)

Setup fallback interaction object는 박스 모양과 기본 옵션이다. Action 단위 `actionSettings[actionKey].interactions`가 있으면 해당 Action 전체의 사용 여부를 결정한다. Action frame에서 `active + role`을 켠 경우 해당 frame 값이 가장 우선하는 override로 쓰인다. MVP에서는 frame에서 OFF를 찍어 Action-level ON을 끄는 per-frame disable은 아직 사용하지 않는다.

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

Effect 전체 설정:

- `tuning.effectSettings[effectKey].fileName`: Effect 이미지 업로드 파일명 slug다. 내부 `effectKey`를 바꾸지 않고, 새 업로드의 image key를 `effect_<fileName>`으로 만들 때만 사용한다.
- `tuning.effectOffsets[effectKey].image`: actor와 무관한 image key만 저장한다. 예: `effect_customAction4`.
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
  inertia: 30,
  airControl: 0,
  cameraShakePower: 4,
  cameraShakeFrames: 6,
  cameraShakeDecay: 1
}
```

- `gravity`: 공중 상태에서 매 Action Timeline frame `vy`에 더하는 값. 단위는 `px/f²`다.
- `inertia`: 입력이나 impulse가 멈춘 뒤 현재 velocity가 0이 되기까지 걸리는 frame 수. `0`이면 즉시 멈추고, 값이 클수록 더 오래 미끄러진다.
- `airControl`: 공중 상태에서 좌우 입력이 들어올 때 매 Action Timeline frame `vx`에 더하는 값. 단위는 `px/f`이며 기본값은 `0`이다.
- `cameraShakePower`: `attackInteractionObject`와 `hurtInteractionObject`가 실제로 닿아 hit 처리에 도달했을 때 적용할 흔들림 강도다.
- `cameraShakeFrames`: hit camera shake 지속 frame 수다.
- `cameraShakeDecay`: 흔들림을 시간에 따라 점점 약하게 만들지 여부다.

스테이지 물리 UI 표시 규칙:

- `gravity`는 `중력`으로 표시하고 입력 오른쪽에는 `px/f²`를 표시한다.
- `inertia`는 `관성`으로 표시하고 입력 오른쪽에는 `frame`을 표시한다.
- `airControl`은 `공중 조작`으로 표시하고 입력 오른쪽에는 `px/f`를 표시한다.
- `cameraShakePower`는 `흔들림 강도`로 표시한다.
- `cameraShakeFrames`는 `흔들림 시간`으로 표시하고 입력 오른쪽에는 `frame`을 표시한다.
- `cameraShakeDecay`는 `점점 약해짐`으로 표시한다.
- Camera Shake는 항상 hit 접촉 규칙으로 켜져 있으며, 별도 ON/OFF 토글을 저장하지 않는다.

`enemy.spawnRule` / `enemy.spawnRulesByActor`:

```js
{
  spawnRule: {
    intervalSec: 2,
    maxAlive: 3,
    side: 'front',
    cameraOffsetMin: 740,
    cameraOffsetMax: 960
  },
  spawnRulesByActor: {
    enemy_01: {
      maxAlive: 1,
      intervalSec: 2
    }
  }
}
```

- `spawnRulesByActor[actorId].maxAlive`: 해당 잡몹/보스 캐릭터가 동시에 활성화될 수 있는 수다. Stage 탭 Enemy AI에서 캐릭터 이름 옆 `동시` 입력으로 편집한다.
- `spawnRulesByActor[actorId].intervalSec`: 해당 캐릭터가 죽은 뒤 다시 등장하기까지 기다리는 초 단위 시간이다. Stage 탭 Enemy AI에서 캐릭터 이름 옆 `리스폰` 입력으로 편집한다.
- Runtime은 `maxAlive`가 2 이상이면 원본 actor 저장 데이터를 바꾸지 않고 전투 중에만 runtime clone actor를 추가한다.
- `spawnRule.intervalSec`는 actor별 값이 없을 때 fallback으로 사용한다.
- 기존 `batchSize`, `side`, `cameraOffsetMin`, `cameraOffsetMax` 등 `spawnRule` 필드는 유지한다.
- 현재 적 리스폰 X 위치는 항상 플레이어 오른쪽이며, `cameraOffsetMin` / `cameraOffsetMax` 거리만 사용한다.

## Project State

저장 단위:

- actors
- active actor/session
- scene sessions
- asset references
- tuning data

Asset reference 규칙:

- `actors[id].assets`: 캐릭터 파츠 PNG source를 저장한다. PSD source는 로컬 제작용 원본이며 배포 metadata에 넣지 않는다.
- `characters`: Setup 캐릭터 목록 metadata를 저장한다. 저장된 `characters`가 없을 때만 기존 고정 `ACTOR_DEFS`를 fallback으로 사용한다.
- 새 캐릭터는 `id`, `type`, `name`, `folder`, `storageFolder`, `psdFileName`, `deletable`을 가진다. `folder`는 로컬 `assets/characters/{folder}`와 Firebase Storage `crow-knight/assets/characters/{folder}`를 연결하는 기준이다.
- `effectAssets`: 이펙트 PNG source를 저장한다. actor별 업로드 source key는 `{actorId}/{imageKey}`이며 로컬 업로드 source는 `assets/effects/{actorId}/{imageKey}.png`를 사용한다. 기존 `assets/effects/custom/{imageKey}.png`는 fallback source로만 남긴다.
- `sessions[id].background.psdPreview`: 배경 preview URL과 크기 metadata를 저장한다. 로컬 PSD export는 `assets/backgrounds/current/background-preview.webp`만 사용하며, 배포 metadata에는 PSD source URL을 넣지 않는다.
- `sessions[id].background.psdLayers`: 배경 PSD layer 이미지 URL과 layer별 편집 metadata를 저장한다. 로컬 PSD layer export는 `assets/backgrounds/current/layers/*.webp`만 사용한다. 각 layer는 수동 반복 간격 `tileSpacing`을 가질 수 있다.
- PSD layer WebP는 반복 폭을 위해 alpha가 없는 좌우 column만 제거한 cropped image다. 위/아래 여백은 유지한다. `originX`는 cropped image의 좌측이 PSD preview export canvas 안에서 있던 X 위치이며, `originY`는 0이다. `cropX` / `cropWidth`는 좌우 crop bounds, `cropY = 0`, `cropHeight = exportCanvasHeight`다. Renderer는 첫 타일 배치에만 `originX`를 사용하고, 반복 간격은 cropped image natural width와 `tileSpacing`만 사용한다.
- `sessions[id].view.floorScreenY`: legacy 이름을 유지하는 카메라 기준 높이 값이다. 플레이어가 화면 세로에서 보일 Y 좌표이며, Run 카메라는 플레이어를 계속 따라가되 이 값만큼 화면상 위치를 오프셋한다.
- `releaseVersion`: 배포 업로드 성공 시 증가하는 cache busting 버전이다. Storage URL은 `?v=releaseVersion`을 사용한다.
- 상단 Firebase 업로드 버튼은 로컬 `assets`의 PNG/WebP를 Firebase Storage에 올린 뒤 Project State metadata를 Firestore에 저장한다.
- 상단 Firebase 다운로드 버튼은 제거한다. `setting.html`은 로컬 제작 상태를 Source of Truth로 사용하고, `index.html`만 Firebase metadata를 읽는다.
- Project State metadata는 `projectSettings/crowKnight` 단일 문서에 저장한다. 문서 크기를 줄이기 위해 가능하면 gzip-base64 압축 필드로 저장한다.
- Setup / Effect / Stage 내부 업로드/새로고침 버튼은 로컬 제작용 asset만 갱신한다.
- Firebase Storage asset은 `crow-knight/assets/backgrounds`, `crow-knight/assets/characters`, `crow-knight/assets/effects`, `crow-knight/assets/icons` 아래에 저장한다.
- PSD 원본은 Storage에 업로드하지 않는다. PSD는 `setting.html`의 로컬 제작용 원본이다.
- `setting.html`은 로컬 `assets`와 로컬 `runtime/project-default-state.json`을 사용한다.
- `index.html`은 Firebase Database metadata와 Firebase Storage asset URL만 사용한다. 로컬 metadata / 로컬 asset fallback을 사용하지 않는다.

저장 경로:

- local storage
- Firebase project state
- Firebase Storage asset references
