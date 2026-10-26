# 충각 전차장

대포·포탑을 제거한 돌진형 보스입니다. 기존 보스의 황금 투구, 올리브 망토, 아이보리 테두리와 붉은 문양을 유지합니다.

- `parts-sheet.png`: 기본 imagegen 도구로 생성한 투명 부속 시트. 원본 전차 시안을 참조해 대포와 포탑을 제거했습니다.
- `source-crops.json`: 생성 시트에서 각 PNG를 추출한 영역. 바퀴 3개는 같은 원형 원본을 사용합니다.
- `enemy.psd`: 14개 레이어, 1600×1200, 실제 조립 좌표의 4배 크기. 기존 PSD를 수정하지 않고 새로 만들었습니다.
- `character.json`: 보스 목록 등록 정보. 액션/리그는 `tools/author_ram_tank.py`가 작성합니다.

기존 편집기 파츠 슬롯을 사용합니다. 부속별 위치·크기·회전은 리그에서 조절하며, 차량은 팔/다리 관절 연결 대신 독립 배치로 그립니다. 차량의 조립 순서는 `src/ram_tank_runtime.js`의 `TANK_PART_ORDER`에서 관리합니다.

| 슬롯                              | 부속               |
| --------------------------------- | ------------------ |
| body                              | 차체               |
| backpack                          | 궤도               |
| upperLegL / upperLegR / lowerLegL | 바퀴 3개           |
| weapon                            | 앞쪽 충각          |
| head / collar                     | 조종수 투구 / 상체 |
| upperArmL / upperArmR             | 조종수 양팔        |
| cape                              | 망토               |
| shield                            | 깃발               |
| lowerLegR                         | 배기관             |
| lowerArmL                         | 해치 테두리        |

동작은 1초 방향 고정 예고 → 0.9초 돌진 → 0.3초 감속 → 1.2초 빈틈입니다. 최대 이동 거리 682.5, 최고 속도 650/초. 한 돌진은 대상마다 한 번만 기본 20 피해와 밀침을 줍니다. 정지/접근/예고/회복 구간에는 공격 판정이 없습니다. 쿼터뷰에서는 X/Z 방향이 처음 조준대로 고정되며 높이 판정을 유지합니다. 현재 HP 480, 동시 1대, 재출현 40초입니다. 타이밍·이동 프로필은 전용 런타임 모듈에서 관리합니다.

생성 방식: 기본 내장 imagegen. 참조: 이 대화에서 승인된 전차 시안 `exec-ba9d79c7-1bd4-4f43-9c19-673c558a4724.png`. 생성 원본: `exec-e74c124b-4514-4973-a86c-ff227a0688df.png`.

생성 프롬프트 핵심: “Edit the provided tank boss design into a production CUTOUT PARTS SHEET for the SAME character, but REMOVE THE CANNON AND TURRET COMPLETELY: this is a low ramming tank, with commander directly in an open hatch on low hull. Preserve same thick black outline, simple flat olive/charcoal/brass/brown/ivory/red cartoon style, golden bucket helmet with slash-circle emblem. TRANSPARENT background, no glow, no shadows, no assembled figure, no labels, no text, no grid borders.” 이어서 차체·궤도·원형 바퀴·충각 / 투구·상체·양팔 / 망토·깃발·배기관·해치를 4×3 부속 시트로 지정했습니다. 대포/포탑/총열 금지, 오른쪽을 향한 측면, 연결 부위는 겹쳐 조립 가능하도록 요청했습니다.
