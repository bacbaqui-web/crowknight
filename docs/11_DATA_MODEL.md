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
- interaction box: `collisionBox`, `hurtHitbox`, `weaponHitbox`, `shieldHitbox`.

일반 part 주요 필드:

- `x`, `y`
- `w`, `h`
- `baseW`, `baseH`
- `ax`, `ay`
- `rot`
- `opacity`

## InteractionBox

Editor 기준 판정 박스 저장 위치다.

| Key            | Role        | Parent   | 저장 필드                                                     |
| -------------- | ----------- | -------- | ------------------------------------------------------------- |
| `collisionBox` | `collision` | `body`   | `type`, `parent`, `x`, `y`, `w`, `h`, `baseW`, `baseH`, `rot` |
| `hurtHitbox`   | `hurt`      | `body`   | `type`, `parent`, `x`, `y`, `w`, `h`, `baseW`, `baseH`, `rot` |
| `weaponHitbox` | `attack`    | `weapon` | `type`, `parent`, `x`, `y`, `w`, `h`, `baseW`, `baseH`, `rot` |
| `shieldHitbox` | `guard`     | `shield` | `type`, `parent`, `x`, `y`, `w`, `h`, `baseW`, `baseH`, `rot` |

현재 저장 key는 호환을 위해 유지한다.

## Runtime InteractionBox Mirror

Runtime/Combat 호환 필드다.

- `tuning.hitbox`: Runtime 피격 박스.
- `tuning.collisionBox`: Runtime 충돌 박스.
- `tuning.shieldHitbox`: Runtime 방패 박스 후보.
- `tuning.attackBoxes`: legacy 공격 geometry mirror. effect 값은 저장하지 않는다.
- `tuning.attackEffects`: Runtime combat reaction 효과값.
- `tuning.attackEffects.*`: `stun`, `knockbackX`, `knockbackY`, `deathBurst`.

Runtime 공격 판정 geometry:

```text
tuning.rig.weaponHitbox
+ tuning.poseOffsets[poseKey].weaponHitbox.active
→ actor.player.attackInteractionRegion
```

Runtime 공격 효과:

```text
tuning.attackEffects[attackKey]
→ combatSystem.attackReaction()
```

Mirror 생성 위치:

- `tuningNormalize.mergeTuning()`
- `tuningInteractionBoxes.syncRuntimeInteractionBoxesFromRig()`
- 일부 panel apply/canvas preview 경로

Legacy input:

- 기존 저장 데이터의 `type: "hitbox"`는 normalize 시 `type: "interactionBox"`로 보정된다.
- 기존 저장 데이터의 `attackBox` / `attackBoxes.*` 효과값은 `attackEffects.*`로 migration된다.
- normalize 후 `attackBoxes.*`에는 `x`, `y`, `w`, `h`, `rot`만 남긴다.

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
- `w`, `h`
- `rot`
- `opacity`
- `active` (`InteractionBox` stepped state)
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
