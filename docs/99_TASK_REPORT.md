# 99 Task Report

## 배포 Runtime Background 좌우 반복 수정

### 1. 실제 Storage 이미지 크기

- Firebase Storage에서 배포 Runtime이 읽는 `background-preview.webp`와 확인한 PSD layer WebP는 모두 `2048 x 752`였다.
- 확인 layer: `psd_layer_001`, `psd_layer_016`, `psd_layer_017`, `psd_layer_019`.
- 모든 확인 URL에는 `?v=1783674403665` cache busting 값이 붙어 있었다.

### 2. metadata 배경 크기

- Firestore `projectSettings/crowKnight`의 `releaseVersion`은 `1783674403665`였다.
- metadata의 `background.psdPreview.width / height`는 `2048 x 752`였다.
- `background.type`은 `layers`, `background.scale`은 `1`이었다.
- 원격 Storage 이미지 크기와 metadata 크기는 일치했다.

### 3. tileWidth 계산 방식

- 기존 PSD layer 반복은 이미지 전체 폭이 아니라 alpha trim 결과 폭을 사용했다.
- 원격 ground layer 예시:
  - naturalWidth: `2048`
  - metadata width: `2048`
  - alphaWidth: `768`
  - 기존 computedTileWidth: `551.489`
  - 전체 이미지 기준 computedTileWidth: `1470.638`
- front layer 예시:
  - `psd_layer_017`: alphaWidth `768`, layer scale `1.7`, 기존 tileWidth `937.532`, 전체 이미지 기준 `2500.085`
  - `psd_layer_019`: alphaWidth `769`, layer scale `2.2`, 기존 tileWidth `1214.856`, 전체 이미지 기준 `3235.404`
- 수정 후 PSD layer 반복 폭은 `image.naturalWidth * coverScale * layer.scale` 기준이다.

### 4. 깨짐 유형

- 이미지 해상도 불일치가 아니라 반복 기준 폭 불일치였다.
- PSD layer는 2048px 캔버스 전체 기준으로 맞춰진 이미지인데, 렌더러가 투명 여백을 잘라낸 768px 영역만 반복해서 타일 간 시각적 위치가 압축되어 보였다.
- 계산상 타일 간 픽셀 gap은 overlap 보정으로 `-1px`였으나, 전체 캔버스 기준 반복이 아니어서 경계가 틈/잘림처럼 보이는 상태였다.

### 5. 로컬과 배포 차이

- Firestore metadata와 Storage 이미지 크기는 로컬 `assets/backgrounds/current`의 확인 파일 크기와 같았다.
- 배포 전용 문제처럼 보인 이유는 Firebase Runtime이 layer WebP URL을 직접 읽으면서 PSD layer 반복 경로를 타고, 이 경로의 alpha trim 반복 폭 문제가 드러났기 때문이다.

### 6. 수정 내용

- `src/background_renderer.js`의 PSD layer draw 경로를 alpha trim 반복에서 전체 WebP 캔버스 반복으로 변경했다.
- `getImageMetrics()` / alpha trim cache를 제거했다.
- 일반 image background 반복, Storage 업로드, metadata 구조, 해상도는 변경하지 않았다.

### 7. 브라우저 QA 결과

- 코드 기준으로 원격 이미지 URL / natural size / metadata size / tileWidth 계산을 확인했다.
- `https://crow-knight.web.app/index.html`과 `https://crow-knight.firebaseapp.com/index.html`은 확인 시점에 `404`를 반환해 실제 배포 화면 수동 QA는 실행하지 못했다.
- `npm run check` 통과.
- `git diff --check` 통과.

### 8. 코덱스 의견

- 이번 문제는 Storage 이미지나 Firestore metadata가 아니라 렌더러의 반복 기준 선택 문제였다.
- PSD export가 전체 캔버스 크기의 layer WebP를 만들고 있으므로, 반복도 alpha bounds가 아니라 전체 캔버스 기준을 쓰는 편이 Photoshop에서 맞춘 좌우 타일 의도와 더 일치한다.
- alpha trim은 성능 최적화로는 유용하지만, 반복 배경에서는 투명 여백 자체가 정렬 정보이므로 제거하는 것이 안전하다.
