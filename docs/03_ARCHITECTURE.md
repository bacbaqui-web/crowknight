# Crow Knight Architecture

이 문서는 현재 구조만 설명한다.

## Surfaces

- 제작툴 화면: 캐릭터, 행동, 효과, 스테이지를 제작한다.
- 실행 화면: 제작툴 데이터를 읽어 게임을 실행한다.
- 공통 영역: 렌더링, 저장, 에셋, Timeline, Canvas 편집 흐름을 공유한다.

## Workflow

| Session | 역할                  | 주요 연결                          |
| ------- | --------------------- | ---------------------------------- |
| Setup   | 캐릭터 기본 상태 제작 | Selection, Canvas, Layer, Save     |
| Action  | 캐릭터 행동 제작      | Timeline, Part Property, Preview   |
| Effect  | 시각 효과 제작        | Timeline, Effect Property, Preview |
| Stage   | 배경과 월드 규칙 제작 | Background, Stage Rules, Scene     |
| Common  | 미리보기와 저장       | Canvas, Project State, Assets      |

## State

- Selection State: 현재 선택된 편집 대상을 가진다.
- Editing State: 현재 Canvas/Property 편집 초점을 가진다.
- Group Edit State: 여러 대상을 함께 편집할 때의 임시 값을 가진다.
- Workflow State: 현재 활성 Session을 가진다.
- Undo State: 편집 전후 snapshot을 가진다.
- Project State: 저장 가능한 actors, scene, assets 상태를 가진다.

## Timeline

- Action Timeline과 Effect Timeline은 공통 Timeline 구조를 공유한다.
- 각 Timeline은 adapter를 통해 자기 데이터만 읽고 쓴다.
- Timeline은 keyframe 추가, 삭제, 이동, 선택, 복사, 붙여넣기를 담당한다.
- Preview는 Timeline 상태를 읽어 현재 Canvas에 반영한다.

## Canvas

- Canvas는 Setup, Action, Effect 편집 surface를 공유한다.
- 선택된 target에 따라 handle geometry가 만들어진다.
- Drag는 move, resize, rotate, opacity 같은 편집 동작으로 변환된다.
- 편집 결과는 현재 context의 저장 대상에 기록된다.

## Runtime

- Runtime은 제작툴 데이터를 읽어 실행 상태로 변환한다.
- 캐릭터 렌더링, 행동 상태, 효과, 전투 판정, HUD, 배경을 실행 화면에서 처리한다.
- Runtime에서 필요한 호환 데이터는 Editor 원본에서 전달받는다.

## Save / Assets

- Project State는 actor, scene, tuning, asset reference를 저장한다.
- Local 저장과 remote 저장은 같은 project state를 기준으로 한다.
- PSD, effect image, background asset은 제작툴에서 교체하고 Runtime이 읽을 수 있는 형태로 로드된다.

## Implementation Documents

- 파일을 찾을 때: `10_SRC_MAP.md`
- 데이터 저장 위치를 볼 때: `11_DATA_MODEL.md`
- 사용자 행동 저장 흐름을 볼 때: `12_EDITOR_FLOW.md`
