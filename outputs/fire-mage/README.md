# 화염 마도사 검증

- `floating-ground-fire.mp4`: 실제 게임 렌더러의 부유 이동→연속 발사→바닥 연소→순차 소멸 9초 시연. 목표 위치는 시연용 고정 좌표입니다.
- `idle.png`, `beta.html.png`, `quarter-view.html.png`, `setting.html.png`: 조립과 각 실행 화면 확인.
- `tests.log`: 새 보스 10개 및 기존 보스·창잡이·쿼터 판정·정규화 호환성 등 JS 72개 통과.
- `snapshot-tests.log`, `asset-tests.log`: Python 스냅샷/에셋 API 각 9개 통과.
- `original-psd-hashes.json`: 작업 시작 시 기존 PSD 11개 SHA-256. 완료 시 모두 존재하며 해시 동일 확인.

원본·기존 6개 캐릭터 데이터는 보존했습니다. 이번 보스의 부유는 시각적 부유로, 자유 고도 비행 시스템은 아닙니다.

`quarter-mage-fixture.png`: 실제 쿼터뷰 AI 시전·바닥 피해 확인. 브라우저 응답에서만 출현 거리를 320~340으로 줄인 검증용 배치이며 저장 데이터는 변경하지 않았습니다.
