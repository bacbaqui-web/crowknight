# 11_DATA_MODEL.md

이 문서는 데이터가 어떻게 저장되는지만 설명한다.

## Actor Tuning

Actor별 제작 데이터의 중심 객체다.

- 현재 Action 데이터는 별도 `actions` 컬렉션이 아니라 `poseOffsets`, `poseSettings`, `effectOffsets`, `effectSettings`, 일부 `motion/invulnerability` 필드에 나뉘어 있다.
- `tuning.rig`: Setup base rig.
- `tuning.poseOffsets`: Action Timeline frame data.
- `tuning.poseSettings`: Action duration/playback settings.
- `tuning.effectOffsets`: Effect Timeline frame data.
- `tuning.effectSettings`: Effect duration/playback settings.
- `tuning.hud`: 이름/HP HUD layout data.
- `tuning.layerOrder`: part render layer order.
- `tuning.transform`: actor scale/anchor.
- `tuning.maxHpPips`: HP 설정.

## Target Action Model

아직 구현하지 않은 목표 구조다.

```text
Action
├─ type
├─ trigger
├─ timeline
├─ interaction
└─ modifiers
```

후보 형태:

```js
{
  id: "skill_001",
  type: "skill",
  name: "Fire Slash",
  trigger: { input: "KeyA" },
  timeline: {
    pose: {},
    effect: {}
  },
  interaction: {
    collision: { enabled: false, boxes: [] },
    hurt: { enabled: false, boxes: [] },
    attack: { enabled: false, boxes: [] },
    guard: { enabled: false, boxes: [] }
  },
  modifiers: []
}
```

현재 저장 구조와 충돌하는 지점:

- `POSE_KEYS` / `EFFECT_KEYS`가 고정 배열이라 사용자 정의 Skill key를 바로 담기 어렵다.
- `poseOffsets[poseKey][partKey]`는 Basic Action 중심 구조다.
- Interaction은 현재 frame value의 `active/attack/hurt/collision/guard`와 fallback rig object에 섞여 있다.
- Runtime modifier 전용 저장 위치가 없다.
- 입력 trigger는 `GAME_KEYS`와 `actor_action_helper` 분기에 하드코딩되어 있다.

권장 확장 방향:

- 기존 `poseOffsets` / `poseSettings`는 Basic Actions 호환 layer로 유지한다.
- 새 Skill은 별도 `tuning.actions.skills[]` 또는 `tuning.actions.byId` 후보를 별도 저장 구조 Sprint에서 확정한다.
- 저장 migration 전까지는 `13_ACTION_MODEL.md`의 target model을 설계 기준으로만 사용한다.

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
→ combat_engine.applyHitReaction()
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

Asset reference 규칙:

- `actors[id].assets`: 캐릭터 파츠 PNG source와 선택 캐릭터 PSD source를 저장한다.
- `effectAssets`: 이펙트 PNG source와 선택 가능한 effect PSD source를 저장한다.
- `sessions[id].background.psdPreview`: 배경 preview URL, 원본 PSD source URL, 크기 metadata를 저장한다.
- `sessions[id].background.psdLayers`: 배경 PSD layer 이미지 URL과 layer별 편집 metadata를 저장한다.
- Firebase 업로드 버튼은 위 metadata를 Firestore에 저장하고, 참조되는 PSD/PNG/WebP 파일은 Storage에 올린 뒤 URL을 metadata에 반영한다.
- Firebase 다운로드 버튼은 Firestore metadata를 받아 Storage URL을 Runtime source로 사용한다.

저장 경로:

- local storage
- Firebase project state
- Firebase Storage asset references
