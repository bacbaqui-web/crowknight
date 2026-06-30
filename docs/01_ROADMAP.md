# Crow Knight Roadmap

이 문서는 현재 프로젝트가 어디까지 왔는지만 보여준다.

현재 큰 방향:

```text
Action Authoring
↓
Runtime Cleanup
↓
Combat
↓
Stage
↓
HUD
```

| Milestone        | 현재 상태 | 성공 기준                                                    | 다음 목표                                                          |
| ---------------- | --------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Foundation       | 진행중    | 제작툴 구조가 안정적으로 확장된다.                           | 공통 경계와 문서 운영을 유지한다.                                  |
| Setup            | 진행중    | 캐릭터 기본 상태를 직관적으로 만들고 조정할 수 있다.         | 선택, 편집, 미리보기 흐름을 더 안정화한다.                         |
| Action Authoring | 진행중    | Action을 Timeline + Interaction + Modifiers 데이터로 만든다. | Basic Actions를 보존하면서 Skill authoring 경계를 추가한다.        |
| Runtime Cleanup  | 대기      | Runtime이 Action을 생성하지 않고 Action 데이터를 해석한다.   | 하드코딩된 Action 규칙을 유지/이동/제거 대상으로 분류해 정리한다.  |
| Effect           | 대기      | 행동과 연결된 시각 효과를 Timeline 기준으로 제작할 수 있다.  | Action과 같은 편집 경험으로 정리한다.                              |
| Combat           | 대기      | Interaction 데이터가 전투 판정에 일관되게 반영된다.          | 공격/피격/방어/충돌 판정 source를 Action 데이터 기준으로 정리한다. |
| Stage            | 진행중    | 배경과 월드 규칙을 하나의 제작 흐름으로 다룰 수 있다.        | Stage 제작 패널을 단계적으로 확장한다.                             |
| Save             | 대기      | 제작 상태를 저장하고 다시 불러와도 같은 결과가 나온다.       | 새 Action 데이터의 저장/불러오기 QA를 진행한다.                    |
| HUD              | 대기      | Runtime HUD가 제작툴 데이터와 충돌하지 않는다.               | Action/Combat 안정화 뒤 HUD 편집 경계를 재검토한다.                |
