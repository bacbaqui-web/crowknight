# CURRENT TASK REPORT

## Latest Task: frameGroup master write 버그 수정

## 1. 이번에 한 일

`src/timeline_action_adapter.js`의 `ensureOffset(part)`가 기존 offset 객체를 다시 normalize해서 교체하지 않도록 확인했다.

현재 구현:

```js
function ensureOffset(part) {
  if (tuning().actionOffsets?.[key()]?.[part]) return;
  ensureActionOffset(tuning(), key(), part);
}
```

## 2. 확정된 원인

`ensureActionOffset()`은 단순 존재 보장 함수가 아니라, 기존 offset도 normalize하면서 새 객체로 교체한다.

기존 offset이 있는 상태에서도 이 함수가 다시 호출되면 `writeActionTimelineFrameValue()`가 교체 전 낡은 `frames` 객체에 값을 쓰게 된다.

그 결과 frameGroup/master Properties write가 실제 `actor.tuning.actionOffsets[actionKey].master`에 남지 않았다.

## 3. 수정 내용

기존 offset이 있으면 즉시 return한다.

offset이 없을 때만 `ensureActionOffset()`을 호출한다.

저장 구조, Runtime, Renderer, `group_transform_adapter`는 변경하지 않았다.

## 4. QA

- `npm run check` 통과
- `git diff --check` 통과

브라우저 직접 QA는 이번 실행 환경에서 수행하지 않았다.

## 5. 코덱스 의견

이번 버그는 Transform/Renderer 문제가 아니라 Action adapter의 offset 보장 경계 문제였다.

앞으로 `ensure*` 함수가 실제로 객체를 교체하는지, 단순 보장만 하는지 이름과 역할을 분리하면 같은 유형의 버그를 줄일 수 있다.
