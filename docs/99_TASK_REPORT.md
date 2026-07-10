# 99 Task Report

## 시작/결과 화면 타이틀 UI 및 플레이어 중앙 카메라

### 1. 카메라 변경 내용

- `src/camera_view.js`에서 카메라 focus를 항상 `playerActor.player.x / y` 기준으로 반환하게 했다.
- 기존 selected actor 중심, floor clamp, zoom별 edit focus 분기는 제거했다.
- 화면 흔들림은 기존처럼 focus 좌표에 반영한다.

### 2. 시작 화면 변경 내용

- 기존 `Puppet Action Beta`, `Crow Knight`, `게임 시작` 문구를 제거했다.
- `assets/title/crow_knight_title_2.webp`를 시작 화면 중앙에 배치했다.
- 시작 화면 타이틀 이미지 표시 크기를 기존 제한 대비 약 2배로 키웠다.
- 타이틀 바로 아래에 흰색 캡슐형 `PLAY` 버튼을 배치했다.
- 시작 화면 배경은 `rgba(0, 0, 0, 0.9)`로 변경했다.

### 3. 결과 화면 변경 내용

- 결과 화면 배경도 `rgba(0, 0, 0, 0.9)`로 변경했다.
- 기존 결과 패널은 `result-panel`로 유지했다.
- 결과 패널 위에 `assets/title/dashboard_top.webp`를 배치했다.
- 결과 패널 아래에 `assets/title/dashboard_bottom.webp`를 배치했다.
- `Run Complete` 문구를 제거했다.
- 랭킹 등록 메시지 라벨을 `하고 싶은 말`로 변경했다.
- 다시하기 버튼 SVG를 더 완성도 있는 회전 화살표 형태로 수정했다.

### 4. 색상 정리

- 시작/결과 화면과 Run HUD의 초록 계열 색을 제거했다.
- 버튼, 점수, 랭킹 강조색, HUD 아이콘을 흰색/검정/회색 계열로 맞췄다.
- 인스타/X 아이콘은 grayscale 처리했다.
- 레진 아이콘은 원본 빨간색을 유지하도록 grayscale 대상에서 제외했다.

### 5. 추가된 Title Asset

- `assets/title/crow_knight_title.webp`
- `assets/title/crow_knight_title_2.webp`
- `assets/title/dashboard_top.webp`
- `assets/title/dashboard_bottom.webp`

### 6. QA 결과

- 코드 구조 확인 완료.
- 로컬 dev server는 `http://127.0.0.1:4177/setting.html`로 열렸다.
- 시작 화면 스크린샷 QA에서 타이틀 이미지와 `PLAY` 버튼만 표시되는 것을 확인했다.
- title asset 로컬 응답 확인:
  - `crow_knight_title_2.webp`: `200`
  - `dashboard_top.webp`: `200`
  - `dashboard_bottom.webp`: `200`
- 결과 화면은 DOM/CSS 구조와 asset 경로를 확인했다. 실제 결과 화면 수동 QA는 아직 별도 실행하지 않았다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 7. 코덱스 의견

- 결과 화면의 랭킹/등록 로직은 그대로 두고 DOM wrapper만 추가한 방식이라 기능 영향이 작다.
- 카메라를 플레이어 좌표에 완전히 고정하면 바닥/벽 경계 클램프가 사라지므로, 스테이지 가장자리에서도 플레이어가 항상 가운데에 남는다.
- 플레이어의 발밑 좌표가 화면 중앙에 오는 구조라, 시각적으로 몸 중심을 정확히 가운데에 두고 싶으면 이후 `player.y - visualCenterOffset` 옵션을 별도로 두는 것이 좋다.
