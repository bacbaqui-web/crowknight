# 99 Task Report

## 로컬 제작 / 웹 플레이 배포 구조 정리

### 1. 최종 제작/배포 구조

- `setting.html`: 로컬 제작툴로 유지한다.
- `index.html`: 웹 플레이용 Runtime으로 Firebase metadata / Storage asset만 읽는다.

### 2. setting.html 역할

- 로컬 `assets`와 로컬 project metadata를 사용한다.
- PSD Import / PNG-WebP 생성 / Character / Action / Effect / Background / AI / Stage / 저장 작업을 담당한다.
- 우측 상단 버튼은 `업로드`와 `닫기`만 남겼다.

### 3. index.html 역할

- `loadSavedState({ source: "firebase" })`로 Firebase metadata만 읽는다.
- 로컬 character index, 로컬 project-default-state, PSD background refresh를 사용하지 않는다.
- Firebase metadata를 못 읽으면 로컬 fallback 없이 오류 안내를 표시한다.

### 4. Storage 업로드 대상

- 캐릭터 파츠 PNG.
- Effect PNG.
- Background preview WebP/PNG.
- Background layer WebP/PNG.
- PSD는 업로드하지 않는다.

### 5. Database 업로드 대상

- Project state metadata.
- Character metadata.
- Effect metadata.
- Background metadata.
- Runtime metadata.
- `releaseVersion`.

### 6. 업로드 순서

1. 로컬 state를 저장한다.
2. 로컬 PNG/WebP asset을 Firebase Storage에 업로드한다.
3. Storage URL을 담은 배포용 snapshot을 만든다.
4. 배포용 metadata snapshot을 Firestore `projectSettings/crowKnight`에 업로드한다.

### 7. Asset Resolver 구조

- `setting.html`은 로컬 effect / character source를 우선 사용한다.
- `index.html`은 Firebase metadata에 들어 있는 Storage URL만 사용한다.
- 배포 snapshot은 로컬 제작 state를 직접 Firebase URL로 덮어쓰지 않는다.

### 8. releaseVersion 처리

- 업로드 시 `Date.now()` 기반 `releaseVersion`을 생성한다.
- Firestore metadata와 state JSON에 `releaseVersion`을 저장한다.
- Storage download URL은 `?v=releaseVersion`을 사용한다.

### 9. QA 결과

- `npm run check` 통과.
- `git diff --check` 통과.
- 브라우저 Firebase 업로드 / Storage 생성 / Database 갱신 / index 반영 수동 QA는 아직 별도 실행하지 않았다.

### 10. 코덱스 의견

- 제작툴과 웹 Runtime이 같은 `main.js`를 공유하므로, 페이지 mode에 따른 source 선택 분리가 현재 구조에서 가장 작은 변경이다.
- 장기적으로는 `editor_main.js`와 `runtime_main.js`를 분리하면 로컬 API / Firebase Runtime 경계가 더 명확해진다.
