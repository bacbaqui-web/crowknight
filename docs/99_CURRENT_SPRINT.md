# 99_CURRENT_SPRINT.md

## 이전 Sprint 종료

이전 Sprint는 종료했다.

완료 기준:

- Property / Transform / Timeline 공통화 완료.
- Setup / Action / Effect W/H 입력 공통화 완료.
- Stepper / scrub / Canvas resize QA 통과.
- Group Edit 자동 QA 통과.
- Group Edit은 `group_transform_adapter.js`로 전용 차이를 모으고, 일반 Transform 진입점과 연결됨.
- 완료 커밋: `28a1164 Refactor common editor property and group transform flows`.
- 완료 기록: `docs/completed-sprints/2026-06-30-common-editor-refactor.md`.

이제 Editor Core 공통화는 이번 Sprint의 주제가 아니다.

## Sprint 이름

Action Interaction & Modifiers Sprint

## Sprint 상태

상태: Task 01 공통 Editor 시스템 구현 완료.

이번 문서는 Action Interaction & Modifiers Sprint의 기준 문서이며, Task 01에서는 Runtime 연결 전에 Editor 공통 시스템을 먼저 분리했다.

## Task 01 결과

완료 범위:

- Timeline Target 아래에 `Property`, `Interaction`, `Modifiers` 형제 패널 구조를 만들었다.
- `Property`는 Transform 전용으로 유지했다.
- `Interaction Editor Engine`을 추가해 충돌 / 피격 / 공격 / 방어 체크와 세부 frame 값을 편집한다.
- `Modifiers Editor Engine`을 추가해 modifier 활성화와 modifier별 설정을 편집한다.
- Interaction / Modifiers는 Action 전용이 아니라 Effect Timeline에도 같은 엔진으로 연결했다.
- Runtime 연결은 하지 않았다. Runtime 해석과 Action Modifier Engine은 다음 Task 범위다.
- 추가 정리: Runtime의 사전 포즈 애니메이션을 제거했다. `actor_pose_helper.js`는 neutral pose만 반환하고, `runSpeedMotion.js`/이동 연동 UI는 제거했다.
- Firebase 저장 흐름을 정리했다. 업로드 버튼은 Project State metadata와 PSD/PNG/WebP Storage asset을 같은 규칙으로 올리고, 다운로드 버튼은 Firestore metadata의 Storage URL을 Runtime source로 적용한다.
- 저장 metadata는 actor PNG/PSD, effect PNG/PSD, background PSD preview/layer/source URL을 보존한다.

## 개발 원칙 문서 정리

이번 정리는 구현 작업이 아니라 앞으로의 Codex 개발 기준을 고정한 문서 작업이다.

반영 내용:

- 새 기능은 먼저 `Timeline`, `Interaction`, `Modifiers`, `Runtime Rule` 중 어디에 속하는지 분류한다.
- 같은 기능은 Action용, Effect용, Projectile용으로 따로 만들지 않는다.
- Runtime은 Action 이름을 보고 새 동작을 특별 처리하지 않는다.
- 새 Engine은 기존 공통 블록으로 표현할 수 없을 때만 제안한다.
- Codex는 새 기능 구현 전에 기능 분류, 공통 시스템 재사용 가능성, 새 Engine 필요 여부, 재사용 범위, 가장 단순한 MVP를 먼저 보고한다.

변경 문서:

- `00_MANIFEST.md`
- `02_DECISIONS.md`
- `13_ACTION_MODEL.md`
- `99_CURRENT_SPRINT.md`

현재 Editor target 구조:

```text
Timeline Target
├─ Property
├─ Interaction
└─ Modifiers
```

## Sprint 핵심 목표

Action을 하드코딩된 동작 목록이 아니라 사용자가 직접 제작 가능한 데이터 구조로 확장한다.

최종 개념:

```text
Action = Timeline + Interaction + Modifiers
```

- Timeline: 파츠 위치, 회전, 크기 등 keyframe animation.
- Interaction: 충돌 / 피격 / 공격 / 방어 같은 상호작용 박스.
- Modifiers: 무적, 색 변화, 이지인/이지아웃, 중력 무시, 히트스톱 같은 Action 전용 옵션.

핵심 원칙:

- 하드코딩 Action을 늘리지 않는다.
- 새로운 Action은 코드가 아니라 데이터로 만든다.
- Runtime은 Editor에서 만든 Action 데이터를 읽어 실행한다.
- Editor 원본 데이터와 Runtime 계산값은 분리한다.

## Action 분류 목표

Action을 두 종류로 나눈다.

```text
Action
├─ Basic Actions
└─ Skills
```

### Basic Actions

기존 기본 동작이다.

예:

- `idle`
- `Q`
- `W`
- `E`
- `Space`

이번 Sprint에서는 기존 구조를 최대한 유지한다.

목표:

- 기존 Basic Action이 깨지지 않는다.
- 기존 Runtime 이동 / 점프 / 기본 동작이 유지된다.
- Basic Action 전체를 무리하게 뜯지 않는다.

### Skills

사용자가 새로 만드는 사용자 정의 Action이다.

목표:

- `+ Skill` 버튼으로 새 Skill 생성.
- Skill 이름 설정.
- 발동 키 설정.
- 빈 Timeline 생성.
- Interaction 설정.
- Modifiers 설정.

## Action Properties 목표

기존 Action Properties Controller는 유지한다.

내부를 다음처럼 나눈다.

```text
Action Properties
├─ 기본 설정
├─ Interaction
└─ Modifiers
```

기본 설정 후보:

- 액션 이름.
- 액션 종류.
- 발동 키.
- 길이.
- 루프 여부.
- 재생 속도.

## Interaction 설계

기존 “판정” 용어는 `Interaction`으로 정리한다.

한국어 UI 표시는 `상호작용`을 우선 후보로 둔다.

Interaction 항목:

- 충돌.
- 피격.
- 공격.
- 방어.

동작:

- 체크 OFF: 해당 Interaction Box 없음, Canvas에 표시 안 함.
- 체크 ON: 해당 Interaction Box 생성, Canvas에 표시, 위치 / 크기 조정 가능.

의미:

- 충돌: 벽, 바닥, 오브젝트와 부딪히는 영역.
- 피격: 공격을 맞는 영역.
- 공격: 상대에게 타격을 주는 영역.
- 방어: 공격을 막는 영역.

주의:

- Runtime attackBox를 Editor source로 사용하지 않는다.
- Interaction Box는 Editor 데이터에서 생성한다.
- 표시/편집은 가능한 기존 Transform / Property 공통 기능을 사용한다.

## Modifiers 설계

기존 “특수효과” 개념은 `Modifiers`로 정리한다.

한국어 UI 후보:

- 모디파이어.
- 액션 옵션.

Modifier 의미:

- Interaction은 다른 객체와의 상호작용 박스다.
- Modifier는 Action 실행 중 캐릭터 자신에게 적용되는 규칙이다.

후보:

- 무적 시간.
- 색 변화.
- 이지인 / 이지아웃.
- 중력 무시.
- 이동 보정.
- 히트스톱.
- 슈퍼아머.
- 방향 고정.
- 입력 잠금.
- 카메라 흔들림.
- 잔상.

## Modifier Engine 방향

Modifiers를 Runtime 곳곳에 하드코딩하지 않는다.

추천 구조:

```text
Action Data
└─ modifiers[]

Runtime
└─ action_modifier_engine.js
```

역할:

- Editor: 어떤 Modifier를 붙일지 설정.
- Action Modifier Engine: 현재 frame에서 어떤 Modifier가 켜져 있는지 해석.
- Runtime: 해석 결과를 캐릭터 상태 / 렌더 / 물리 / 전투에 적용.

MVP 후보:

- 무적.
- 색 변화.

## 데이터 구조 초안

초안이다. 구현 전에 현재 저장 구조와 충돌 여부를 조사한다.

```js
action: {
  id: "skill_001",
  type: "skill",
  name: "Fire Slash",
  trigger: {
    input: "KeyA"
  },
  timeline: {
    // 기존 Action Timeline 데이터 사용
  },
  interactions: {
    collision: {
      enabled: true,
      boxes: []
    },
    hurt: {
      enabled: true,
      boxes: []
    },
    attack: {
      enabled: false,
      boxes: []
    },
    guard: {
      enabled: false,
      boxes: []
    }
  },
  modifiers: [
    {
      type: "invincible",
      enabled: true,
      startFrame: 5,
      endFrame: 12
    },
    {
      type: "tint",
      enabled: true,
      startFrame: 8,
      endFrame: 16,
      color: "#ff4444"
    }
  ]
}
```

## Runtime 방향

목표:

- Runtime은 Editor에서 만든 Action 데이터를 그대로 실행한다.

유지할 것:

- 이동.
- 중력.
- 충돌.
- 피격 판정.
- 공격 판정.
- 게임 규칙.

줄일 것:

- 하드코딩된 공격 자세.
- 자동 팔 흔들림.
- Action별 임의 보정.
- Editor Timeline과 별개로 들어가는 사전 애니메이션.

주의:

- Runtime 전체 재작성은 하지 않는다.
- Basic Action 동작을 한 번에 삭제하지 않는다.
- Runtime 연결은 MVP 범위부터 작게 한다.

## 작업 순서

### Step 1. 현재 Action 구조 조사

확인할 것:

- 현재 Action 목록이 어디에 정의되어 있는가.
- Basic Action과 Skill을 나눌 수 있는 구조인가.
- `actor_action_helper.js`는 입력/물리/상태 전환을 담당하고, 사전 포즈 애니메이션은 `actor_pose_helper.js`/run motion 보정 쪽에 있었는가.
- InteractionObject와 기존 판정 데이터가 어디에 저장되는가.
- Action Properties Controller가 어디까지 확장 가능한가.

주요 확인 후보:

- `src/game_config.js`
- `src/actor_action_helper.js`
- `src/actor_runtime_engine.js`
- `src/timeline_pose_controller.js`
- `src/timeline_pose_adapter.js`
- `src/interaction_object_editor.js`
- `src/interaction_region_runtime_helper.js`
- `src/combat_engine.js`
- `src/part_editor_controller.js`
- `src/property_field_groups.js`
- `src/project_data_normalizer.js`

### Step 2. Action 분류 추가

목표:

- Basic Actions / Skills 개념 추가.
- 기존 액션은 Basic Actions로 유지.
- Skill은 아직 빈 데이터 구조만 추가.

주의:

- 기존 Basic Action 저장/실행을 깨지 않는다.
- 저장 구조 변경이 필요하면 작은 migration 또는 초기화 전략을 먼저 문서화한다.

### Step 3. Skill 생성 UI 추가

목표:

- `+ Skill` 버튼.
- 이름 입력.
- 발동 키 설정.
- 빈 Timeline 생성.

주의:

- 기존 Action Timeline UI를 최대한 재사용한다.
- 새 Timeline 엔진을 만들지 않는다.

### Step 4. Interaction UI 추가

목표:

- 접기/펼치기 섹션.
- 충돌 / 피격 / 공격 / 방어 체크박스.
- 체크 시 Canvas Box 표시.
- Box는 기존 Transform / Property 공통 기능을 최대한 사용.

주의:

- Runtime attackBox를 Editor source로 쓰지 않는다.
- Interaction Box는 Action 데이터에서 관리한다.

### Step 5. Modifiers UI 추가

목표:

- Modifier 목록 표시.
- 체크 시 해당 Modifier 설정 UI 표시.
- Modifier마다 다른 설정 UI 허용.

주의:

- 모든 Modifier를 만들지 않는다.
- MVP Modifier만 구현한다.

### Step 6. Modifier Engine 초안

목표:

- `action_modifier_engine.js` 생성.
- 현재 frame 기준으로 modifiers 해석.
- MVP 1~2개만 Runtime에 연결.

추천 MVP:

- 무적.
- 색 변화.

### Step 7. Runtime 연결

목표:

- Skill 발동 키 입력 처리.
- Skill Timeline 재생.
- Interaction 적용.
- Modifier Engine 적용.

주의:

- Runtime 전체 재작성 금지.
- Basic Actions 정상 유지.

## 이번 Sprint에서 하지 않을 것

- 모든 Modifier 완성.
- 모든 스킬 밸런싱.
- 전투 시스템 전체 완성.
- Stage / HUD 대개편.
- Background 리팩토링.
- 기존 Basic Action 전면 삭제.
- Runtime 전체 재작성.
- Editor Core 공통화 추가 심화.

## 완료 조건

- Action이 Basic Actions / Skills로 구분된다.
- `+ Skill`로 빈 Skill을 만들 수 있다.
- Skill에 발동 키를 설정할 수 있다.
- Skill Timeline을 만들 수 있다.
- Interaction 섹션에서 충돌 / 피격 / 공격 / 방어를 켜고 끌 수 있다.
- 체크한 Interaction Box가 Canvas에 표시된다.
- Modifier 섹션이 생긴다.
- 최소 1~2개 Modifier가 데이터로 저장되고 Runtime에서 해석된다.
- Runtime이 Skill 데이터를 읽어서 실행한다.
- 기존 Basic Actions는 깨지지 않는다.

## 검증 계획

정적 검증:

- `npm run check`.
- `git diff --check`.

Editor QA:

- 기존 Basic Action 선택 / keyframe 편집 정상.
- 새 Skill 생성.
- Skill 이름 변경.
- Skill 발동 키 설정.
- Skill Timeline keyframe 생성.
- Interaction 체크 ON/OFF.
- 체크한 Interaction Box Canvas 표시.
- Interaction Box Transform 조작.
- Modifier 추가/삭제/설정 저장.

Runtime QA:

- Basic Action 기존 동작 유지.
- Skill 발동 키 입력 시 Skill 실행.
- Skill Timeline 재생.
- 무적 Modifier frame 범위 해석.
- 색 변화 Modifier frame 범위 해석.

## 구조 결정 검토

`02_DECISIONS.md` 반영 후보:

- Action은 `Timeline + Interaction + Modifiers`로 구성한다.
- 새로운 Action은 코드가 아니라 데이터로 만든다.
- Runtime은 Action 데이터를 해석하고, 하드코딩 Action을 늘리지 않는다.

이번 문서 작성 단계에서는 계획을 기록했다.

구현 시작 전 또는 Step 1 조사 후 `02_DECISIONS.md`에 공식 결정으로 반영할지 다시 확인한다.

## 알려진 위험 요소

- 저장 구조 확장 가능성이 높다. 저장 구조 변경은 작게 분리해야 한다.
- 기존 Basic Action runtime과 새 Skill runtime이 한동안 공존할 수 있다.
- Interaction Box와 기존 InteractionObject/Runtime combat source가 겹칠 수 있다.
- Modifier는 범위를 키우기 쉽다. MVP를 무적/색 변화 정도로 제한해야 한다.
- Runtime 연결은 Editor 데이터와 Runtime 계산값 분리 원칙을 지켜야 한다.

## 다음 작업

1. Step 1 조사부터 시작한다.
2. 현재 Action 목록, 저장 위치, Runtime action helper 흐름을 정리한다.
3. Basic Action / Skill 분리가 가능한 최소 데이터 경계를 제안한다.
4. 조사 결과를 기반으로 구현 범위를 다시 확정한다.
