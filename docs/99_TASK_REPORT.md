# 99 Task Report

## 1. 증상

- Effect 탭의 애니메이션 속도 / 재생 속도 설정은 UI와 저장 경로가 존재한다.
- Effect Preview는 `effectSettings.playbackRate`를 사용한다.
- 실제 Play 렌더에서는 Effect 진행률이 Action 진행률에 묶여 있어 Effect 속도 설정이 반영되지 않았다.

## 2. 원인

- `editor_debug_view.js`의 Effect Preview는 `effectSettings.duration`, `effectSettings.playbackRate`, `effectSettings.playback`으로 진행률을 계산한다.
- `actor_canvas_renderer.js`의 Runtime Effect draw는 `player.getActionFrameProgress()` 값을 그대로 `effectFrameAt()`에 전달했다.
- 그래서 Effect 설정의 재생 속도는 저장되어도 실제 Play의 Effect 프레임 선택에는 쓰이지 않았다.

## 3. 수정 내용

- `src/actor_canvas_renderer.js`에서 Runtime Effect 진행률 계산을 분리했다.
- 실제 Play에서는 `effectSettings.duration / playbackRate / playback` 기준으로 Effect 진행률을 계산한다.
- Action Preview 중에는 기존처럼 `getActionFrameProgress()`를 유지해 에디터 Action Preview 동작을 바꾸지 않았다.

## 4. Runtime 적용 경로

```text
player.actionKey
→ effectSettings[actionKey]
→ customActionElapsed 또는 stateTime
→ timelinePlaybackProgress()
→ effectFrameAt(actor.tuning, actionKey, effectProgress)
→ drawAttackTrail()
```

## 5. QA 결과

- 데이터 QA: `duration=1`, `playbackRate=2`, `customActionElapsed=0.25`일 때 Effect 진행률이 `0.5`로 계산되어 중간 프레임 위치가 사용되는 것을 확인했다.
- `npm run check` 통과.
- `git diff --check` 통과.
- 브라우저 수동 체감 QA는 사용자가 이어서 확인해야 한다.

## 6. 코덱스 의견

- 이번 문제는 Effect 설정 저장 문제가 아니라 Preview와 Runtime이 서로 다른 시간 source를 사용한 문제다.
- Effect Timeline의 속도는 Action 속도와 별개 설정이므로 Runtime Effect draw도 `effectSettings`를 읽는 현재 구조가 맞다.
- `action_trigger_engine.js`는 810줄로 리팩토링 권장 기준을 넘었다. 당장 이번 수정 범위는 아니지만, 시전 / 캔슬 / 수식 Runtime이 더 커지기 전에 기능별 분리를 검토하는 것이 좋다.
