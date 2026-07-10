# 99 Task Report

## Ranking Message Encouragement Bubbles 표시 조건 조정

### 1. 메시지 저장 구조

- 기존 랭킹 엔트리 `{ name, score, message, createdAt }` 구조를 유지했다.
- `ranking_message_helper.js`를 추가해 `message`를 20자, 한 줄, URL 금지 기준으로 정규화한다.
- 랭킹 등록 폼의 `rankingMessage`도 `maxlength=20`으로 맞췄다.

### 2. Firebase 조회 방식

- 기존 `rankingEntries` Firestore 컬렉션 조회 경로를 그대로 사용한다.
- `loadRemoteRankings()`가 가져온 최근/원격 랭킹 엔트리의 `message` 필드를 말풍선 데이터로 재사용한다.
- 새 컬렉션을 만들지 않아 랭킹 DB와 응원 메시지의 Source of Truth를 하나로 유지했다.

### 3. 말풍선 Runtime 구조

- `encouragement_bubble_view.js`를 추가했다.
- `index.html`의 `#encouragementBubbles` DOM 레이어 안에 말풍선을 생성한다.
- `ranking_controller.js`는 랭킹 목록이 로드/등록/동기화/삭제될 때 말풍선을 갱신한다.
- 결과 대시보드가 열렸을 때만 `setActive(true)`로 말풍선을 표시한다.

### 4. 이동 방식

- 말풍선마다 대시보드 주변 시작 위치와 작은 흔들림 폭/속도를 랜덤으로 부여한다.
- `requestAnimationFrame`으로 각 말풍선이 자기 자리 주변에서만 천천히 둥실거리게 했다.
- 화면을 가로질러 이동하거나 화면 밖으로 나갔다가 되돌아오는 방식은 제거했다.
- 클릭하면 약 1.8초 동안 멈추고 살짝 확대된다.
- 말풍선을 잡고 움직이면 위치를 옮길 수 있고, 놓은 위치가 새 기준점이 된다.
- 말풍선 크기와 글자 크기를 기존보다 크게 조정했다.
- 긴 메시지는 말풍선 크기를 유지한 채 메시지 글씨만 단계적으로 줄여 끝까지 보이게 했다.

### 5. 동시 표시 개수

- 최근 메시지 풀은 최대 100개를 사용한다.
- 화면에 동시에 표시하는 말풍선은 최대 24개로 제한했다.

### 6. 성능 고려 사항

- Canvas 월드 렌더가 아니라 DOM UI 레이어로 구현해 카메라 이동과 분리했다.
- 말풍선 수를 제한하고 transform 기반의 작은 위치 변화만 사용했다.
- 결과 대시보드가 닫혀 있을 때는 DOM과 애니메이션을 비워 게임 플레이를 방해하지 않게 했다.

### 7. QA 결과

- `npm run check` 통과.
- `git diff --check` 통과.
- 브라우저에서 결과 대시보드 표시 시점의 말풍선 이동/클릭 효과는 수동 확인이 필요하다.

### 8. 코덱스 의견

- 현재 구조에서는 별도 채팅 시스템을 만들지 않고 기존 랭킹 메시지를 재사용하는 방식이 가장 안전하다.
- 말풍선을 DOM 레이어로 두면 게임 분위기를 살리면서도 Combat/Action/Runtime 좌표계와 섞이지 않는다.
- 향후에는 메시지 종류별 색상, 시즌별 메시지 풀, 신고/숨김 기능을 별도 moderation layer로 추가하는 것이 좋다.
