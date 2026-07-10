# 99 Task Report

## Background 반복 브라우저 확대율 안정화

### 1. 기존 Background tileWidth 기준

- PSD layer 반복 폭은 `image.naturalWidth * coverScale * layer.scale` 기준이었다.
- 배포 metadata와 Storage image 기준으로 확인한 대표 값:
  - `psd_layer_016`: naturalWidth `2048`, computedTileWidth `1470.638`
  - `psd_layer_017`: naturalWidth `2048`, layer scale `1.7`, computedTileWidth `2500.085`
  - `psd_layer_019`: naturalWidth `2048`, layer scale `2.2`, computedTileWidth `3235.404`
- tileWidth 자체는 `window.devicePixelRatio`를 곱하지 않았다.

### 2. CSS pixel / Canvas pixel / World 좌표 관계

- `index.html`의 canvas CSS 크기는 `.full-stage canvas`에서 `--stage-canvas-width / --stage-canvas-height`를 사용한다.
- 현재 `syncCanvasToLayout()`은 full-stage에서 측정된 layout size를 `canvas.width / canvas.height`와 `world.viewW / world.viewH`에 함께 넣는다.
- `canvas_layout_helper.js`에는 `window.devicePixelRatio`와 page zoom compensation이 있지만, Background renderer의 반복 좌표는 최종적으로 Canvas/World 좌표계에서 계산된다.
- `drawClipLayerImage()`는 tileWidth를 World 좌표 폭으로 계산하고, destination x/width도 같은 좌표계로 `drawImage()`에 넘긴다.

### 3. zoom에 따라 깨진 실제 원인

- tileWidth 계산은 DPR을 직접 쓰지 않았지만, 기존 destination 좌표는 `Math.round()`로 CSS/World 좌표 정수에 맞췄다.
- 브라우저 확대율이 바뀌면 `window.devicePixelRatio`가 바뀌고, CSS/World 정수 픽셀이 실제 물리 픽셀 경계와 맞지 않을 수 있다.
- 그 결과 타일의 오른쪽 끝과 다음 타일의 왼쪽 시작이 물리 픽셀 기준에서 fractional edge가 되어 반복 경계가 틈/잘림처럼 보일 수 있었다.

### 4. devicePixelRatio 처리 방식

- Background tileWidth에는 `devicePixelRatio`를 곱하지 않았다.
- 대신 destination edge만 현재 `window.devicePixelRatio` 기준으로 정렬한다.
- 왼쪽 edge는 `floor(value * dpr) / dpr`, 오른쪽 edge는 `ceil(value * dpr) / dpr`로 계산한다.
- 임의의 `+1px` overlap 보정은 제거했다.

### 5. 수정한 World 기준 반복 계산

- `src/background_renderer.js`의 PSD layer 반복 draw에서:
  - `left = alignDevicePixelDown(x, pixelRatio)`
  - `right = alignDevicePixelUp(x + width, pixelRatio)`
  - `drawWidth = right - left`
  - 로 변경했다.
- legacy layered background의 parallax 반복도 같은 edge 정렬 방식을 사용하게 했다.
- tile origin / tileWidth는 기존 World 좌표 계산을 유지한다.
- 변경 후 계산 QA에서 DPR `0.5 / 0.8 / 1 / 1.25 / 1.5 / 2` 모두 `gapOrOverlap = 0`으로 확인했다.

### 6. zoom별 브라우저 QA

- Playwright CLI 버전은 확인했지만 프로젝트 dependency로 import되지 않아 자동 브라우저 스크립트는 실행하지 못했다.
- 로컬 dev server는 `http://127.0.0.1:4177/setting.html`로 열렸으나, 실제 zoom 50/80/100/125/150/200 화면 수동 QA는 아직 별도 실행하지 못했다.
- 코드 계산 QA:
  - zoom/DPR `50%`: gap `0`
  - zoom/DPR `80%`: gap `0`
  - zoom/DPR `100%`: gap `0`
  - zoom/DPR `125%`: gap `0`
  - zoom/DPR `150%`: gap `0`
  - zoom/DPR `200%`: gap `0`
- `npm run check` 통과.
- `git diff --check` 통과.

### 7. 코덱스 의견

- 이번 수정은 Canvas 전체 DPR 렌더링 구조를 갈아엎지 않고, Background 반복 경계에서 fractional pixel seam을 제거하는 최소 변경이다.
- 장기적으로는 `canvas.width = cssWidth * devicePixelRatio`와 base context transform을 공통화하는 것이 더 정석이다.
- 다만 현재 렌더러에는 `ctx.setTransform(1, 0, 0, 1, 0, 0)`을 screen-space overlay 용도로 직접 호출하는 코드가 있어, 전체 DPR transform 적용은 별도 Sprint로 분리하는 편이 안전하다.
