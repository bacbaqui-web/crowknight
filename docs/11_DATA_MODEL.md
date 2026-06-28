# 11_DATA_MODEL.md

이 문서는 데이터가 어떻게 저장되는지만 설명한다.

## Actor Tuning

Actor별 제작 데이터의 중심 객체다.

- `tuning.rig`: Setup base rig.
- `tuning.poseOffsets`: Action Timeline frame data.
- `tuning.poseSettings`: Action duration/playback settings.
- `tuning.effectOffsets`: Effect Timeline frame data.
- `tuning.effectSettings`: Effect duration/playback settings.
- `tuning.hud`: 이름/HP HUD layout data.
- `tuning.layerOrder`: part render layer order.
- `tuning.transform`: actor scale/anchor.
- `tuning.maxHpPips`: HP 설정.

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
tuning.poseOffsets[poseKey][partKey].stun/knockbackX/knockbackY/deathBurst
→ actor.player.attackInteractionRegion.reaction
→ combatSystem.applyHitReaction()
```

Runtime mirror field는 저장하지 않는다.

## `poseOffsets`

Action Timeline frame data다.

형태:

```text
tuning.poseOffsets[poseKey][partKey]
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
- `enemy`
- `reward`
- `score`

## Project State

저장 단위:

- actors
- active actor/session
- scene sessions
- asset references
- tuning data

저장 경로:

- local storage
- Firebase project state
- Firebase Storage asset references
