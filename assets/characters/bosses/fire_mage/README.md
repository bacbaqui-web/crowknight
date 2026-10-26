# 화염 마도사

승인된 불타는 투구·올리브/아이보리/붉은 문양 망토 디자인을 공중 부유 보스로 구현했습니다.

- 실행용 부속 11개: 머리, 머리 불꽃, 몸통, 목망토, 등망토, 좌우 위팔/아래팔, 좌우 옷자락(upper_leg).
- `enemy.psd`: 신규 11레이어 PSD. 기존 PSD 11개는 변경하지 않았습니다.
- `parts-sheet.png`와 `source-crops.json`: image_gen 부속 시트와 픽셀 기준 추출 좌표. `ground_fire.png`는 독립 불길 효과이며 `assets/effects/fire_mage/effect_ground_fire.png`에 실행용 복사본을 둡니다.
- `tools/author_fire_mage.py`: 부유/발사 타임라인 저작 도구. 해당 보스의 draft 데이터만 다시 작성합니다.
- `dev/fire-mage/`: 실제 게임 렌더러/투사체 모듈로 동작을 확인하는 페이지.

## 동작

- 체력 300, 최대 1명, 재등장 35초. 부유는 지상 기준 위치 위에서 옷자락과 몸을 흔드는 시각적 표현이며 고도 조종 AI는 아닙니다.
- 머리 불꽃과 각 지면 불꽃은 시뮬레이션 시간을 따라 독립적으로 변형됩니다. 일시정지 시 불꽃과 피해 시간도 멈춥니다.
- 시전 3초, 재사용 6.8초. 준비 0.75초 뒤 0.16초 간격으로 8개 발사. 기본 동작 전환 블렌딩 시간이 더해질 수 있습니다.
- 방향을 준비 시작 때 고정합니다. 처음 80px, 이후 60px 간격으로 가까운 바닥부터 차례로 불을 깝니다. 쿼터뷰에서는 깊이 방향도 같은 간격입니다.
- 비행 중에는 피해가 없고 착지 후 불꽃마다 3초 유지합니다. 마지막 0.45초는 피해 없이 사라집니다. 먼저 깔린 불부터 꺼집니다.
- 타오르는 바닥에 머무르면 0.65초 간격으로 기본 피해 10. 여러 불길이 겹쳐도 대상별 공통 간격으로 연속 피해를 제한합니다. 옆으로 벗어나거나 불꽃 높이 위로 점프해서 피할 수 있습니다.
- 피격·사망·시전 중단 시 이후 발사를 취소합니다. 이미 깔린 불은 수명이 끝날 때까지 남습니다. 게임 초기화 시 제거합니다.

## 이미지 생성 기록

Built-in image_gen 사용. 승인 시안에서 배경/광번짐과 조립 예시를 제거하는 편집 후 부속을 추출했습니다. 새 이미지 원본도 Codex 생성 폴더에 보존했습니다.

최종 편집 프롬프트:

> Edit this exact parts sheet ONLY by removing ALL background and ALL soft glow/shadows around every object. Deliver clean hard-edged cutouts on fully transparent background (alpha 0 everywhere outside each black or red outline). No brown or grey haze, no red halo around flames. Keep every object's exact position, shape, colors and details unchanged. The entire area between the sprites MUST be completely empty, not dark. No background whatsoever. Remove the two sleeve stubs attached to the torso in top row second column; torso only there, since sleeves already have independent pieces. Everything else unchanged.
