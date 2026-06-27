# CURRENT_SPRINT.md

## Sprint

Push 전 최종 정리

이번 Sprint 목표: Stage Editor 기반 작업을 최종 검증하고, Clip Studio 원본/참조와 PSD 이름을 정리한 뒤 commit/push한다.

## 완료

- `docs/tool-architecture.md`를 읽고 현재 구조를 확인했다.
- `assets/clip_file/`의 Clip Studio 원본 `.clip` 파일을 제거했다.
- `tools/clip_preview_watcher.py`와 `package.json`의 `clip:*` script를 제거했다.
- 배경 refresh 경로를 `.clip` 기준에서 PSD 기준으로 정리했다.
- `src/clipBackgroundRuntime.js`를 `src/psdBackgroundRuntime.js`로 rename했다.
- 배경 업로드 input은 `.psd`만 허용하도록 정리했다.
- dev server refresh API를 `/api/psd/refresh`로 정리했다.
- `assets/characters/player/까마귀.psd`를 `assets/characters/player/player.psd`로 rename했다.
- 코드/asset 범위에서 `.clip`, `clip_file`, 한글 player PSD 경로 참조가 남지 않음을 확인했다.
- Runtime, Combat, Stage 기능은 새로 추가하지 않았다.

## 검증

- `npm run check`: 통과
- `git diff --check`: 통과
- Prettier 확인: `npm run check`에서 통과
- Python compile: `tools/dev_server.py`와 PSD 관련 tools 통과
- 수동 확인: `.venv/bin/python tools/dev_server.py` 기동 성공
- 수동 확인: `http://127.0.0.1:4173/setting.html` HTTP 200 응답 확인
- Git 상태 확인: clip 삭제와 player PSD rename이 의도된 변경으로 표시됨

## 남은 작업

- 현재 위험 요소: `docs/tool-architecture.md`는 공식 문서이므로 이번 Sprint에서 직접 수정하지 않았다.
- 현재 위험 요소: `setting.html`은 500줄 이상이며 이후 Panel 분리 작업이 계속 필요하다.
- 다음 Sprint 제안: PSD background naming이 저장 데이터와 Firebase 경로에서 일관되게 유지되는지 실제 업로드 플로우로 확인한다.

## 특이사항

- 설계상 고민: Clip Studio 원본 제거와 PSD 파이프라인 유지가 충돌하지 않도록 `.clip` 전용 경로만 제거하고 PSD refresh 기능은 유지했다.
- 변경하지 않은 이유: Architecture 문서는 ChatGPT 관리 대상이므로 수정하지 않았다.
- Push 상태: commit 및 push 직전 최종 검증 단계까지 완료했다.
