# 풍선 폭격병

승인된 잡몹 시안의 회색 깡통 투구, 낡은 올리브 군복과 기운 누런 풍선을 사용합니다. 금색 장식·고글·망토는 없습니다.

- `parts-sheet.png`: 기본 내장 imagegen으로 승인 시안을 투명 부속 시트로 변환.
- `source-crops.json`: 각 PNG 추출 영역. 원본 시트는 보존합니다.
- `enemy.psd`: 새 15레이어 PSD, 900×1300. 기본 조립 부속을 별도 레이어로 보관하며 찢어진 풍선 레이어는 숨김 상태입니다. 기존 PSD는 수정하지 않았습니다.
- `fragment_r.png`: 추가 파열 조각 원본. 현재 런타임은 shield 조각을 양쪽으로 회전해 표시합니다.

기존 편집기 슬롯 대응: cape=풍선, backpack=매다는 줄/안전띠, collar=폭탄 주머니, weapon=폭탄, shield=파열 조각. body/head 및 팔·다리는 원래 용도대로 사용합니다. 전투 상태와 투하·추락은 `src/balloon_bomber_runtime.js`, 사망 표현은 `src/balloon_bomber_renderer.js`에 분리했습니다.

- 크기 0.8, 기본 부유 높이 60. 지상 충돌 판정 없음.
- 현재 위치의 손에서 아래로 폭탄을 투하. 첫 투하 1.2초, 이후 1.8초마다. 착지 후 1.25초 예고 뒤 반경 50 폭발, 기본 피해 15.
- 풍선만 피격 대상. 공중의 공격 액션만 허용하며 지상 공격·투사체·그냥 점프는 불가. 쿼터뷰에서도 실제 공격 높이를 확인합니다.
- 유효한 공중 공격 한 번에 풍선 파열 → 투하 중단 → 거꾸로 추락 → 머리가 지면에 닿으면 사망/보상 1회. 지상 전투 단계 없음.
- 이미 떨어진 폭탄은 남고, 게임 재시작 시 제거됩니다. 동시 출현 2명, 재출현 간격 12초.

이미지 생성: 기본 내장 imagegen, transparent_background=true. 참조 승인 시안 `exec-c55c63ea-18b7-485f-9e81-87b8521abe20.png`, 생성 원본 `exec-2909d2e5-1873-4111-a199-224c0246fe82.png`.

생성 프롬프트:

> Convert approved common balloon bomber into transparent PRODUCTION CUTOUT PARTS SHEET. Exactly preserve its plain dented gray bucket helmet with dark slit, faded olive tunic, plain brown boots, dark gloves, patched ochre balloon, brown rope harness. Same thick black outline flat 2D cartoon style. No gold, no goggles, no cape, no elite ornaments. NO assembled figure or vignettes, no labels, no ground, no background or glow. Arrange exactly 4x4 equal grid cells with generous transparent margins, all isolated and completely visible. Row1: (1) intact round ochre patched balloon with two simple straps, no hanging ropes; (2) two long suspension ropes connected to shoulder and waist harness, no body; (3) gray bucket helmet only; (4) olive torso only with rope belt but NO arms or pouch. Row2: (1) left upper arm sleeve; (2) left forearm with closed gripping mitten; (3) right upper arm sleeve; (4) right forearm with open downward bomb-dropping mitten. Row3: (1) left thigh olive fabric; (2) left shin with brown boot; (3) right thigh olive fabric; (4) right shin with brown boot. Row4: (1) small brown bomb pouch; (2) one round black fuse bomb; (3) one large torn deflated ochre balloon fragment with stitches; (4) another different torn deflated ochre balloon fragment. Keep part silhouettes simple, complete joints with overlap for rigging. Facing right mild side view matching reference. Render limbs in neutral loosely dangling pose for rotating later. True transparent background.
