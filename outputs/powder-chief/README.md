# 화약 공병장 구현 검증

- `walk-and-bomb.mp4`: 실제 게임 렌더러로 걷기→투척→착지 예고→폭발을 재생한 7초 영상. 상대 착지점은 시연용 고정 좌표입니다.
- `idle.png`, `beta.html.png`, `quarter-view.html.png`, `setting.html.png`: 조립/베타/쿼터뷰/에디터 확인.
- `tests.log`: 관련 JS 54개 통과.
- `renderer-regression.log`: 정규화 호환성·런타임 8개와 공병장 7개 통과(공병장 검사는 앞 로그와 중복).
- `snapshot-tests.log`: 스냅샷 9개 통과. 별도로 에셋 API 9개 통과.
- 기존 바닥 타일 가시성 검사 1개는 수정 전 HEAD 별도 디렉터리에서도 실패했습니다. 공병장 구현과 별개입니다.
- `original-psd-hashes.json`: 작업 전 기존 PSD 10개 해시. 완료 시 모두 존재하며 SHA-256 동일 확인.
