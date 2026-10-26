# 덫 사냥꾼

승인된 황토색 망토·철투구 잡몹 디자인을 독립 PNG 15개, 추가 파손 이미지, 16레이어 `enemy.psd`로 제작했습니다. PSD는 각 부속을 시트 위치에 배치한 편집용 원본이며 런타임 조립 위치는 `tools/author_trapper.py`와 actor tuning에서 관리합니다. 기존 PSD는 수정하지 않았습니다.

- `weapon`: 손에 든 쥐덫
- `collar`: 바닥에 설치된 열린 덫. 캐릭터 몸에서는 숨김.
- `shield`: 닫힌 덫. 캐릭터 몸에서는 숨김. 파괴 효과는 이 이미지의 양쪽을 벌려 표시.
- `trap_broken`: 추가 파손 디자인 참고 이미지. 현재 런타임은 사용하지 않음.
- 나머지: 머리, 몸통, 망토, 가방, 좌우 상완·하완·허벅지·종아리.
- `source-crops.json`: 원본 시트에서 자른 사각 영역. 투명 가장자리의 희미한 흔적을 제외해 부속 크기를 맞춤.

## 동작

까마귀와 170~300 거리를 유지하며, 4초 간격으로 1초 설치 자세를 취합니다. 동작 중 0.55초 지점에 덫을 내려놓고 추가 0.55초 뒤 작동합니다. 개체당 최대 3개, 수명 18초, 기본 피해 15, 이동 불가 1초. 공격은 가능하며 걷기·점프·구르기와 공격 전진 거리는 제한됩니다. 해제 후 0.5초 재속박 면역. 바닥 공격 한 번에 파괴되고, 점프로 회피 가능합니다. 이미 놓인 덫은 설치자가 죽어도 수명이 끝날 때까지 남습니다. 동시 출현 2명, 재출현 간격 14초.

## 이미지 생성 기록

내장 image_gen 사용. 승인 콘셉트: `concept.png`. 최종 부속 시트: `parts-sheet.png`. 참고 원본은 `.codex/generated_images/01a16fd4-5c79-7fa0-aadd-1f79d644c708/exec-0428003c-8005-43a6-8f7e-52d550aefb73.png`.

제작 프롬프트:

> Convert the approved reference trap-setter grunt into a production CUTOUT PARTS SHEET, transparent background. Preserve EXACT character identity, colors, thick black outline, simple muted flat cartoon style. No assembled poses, no text, no backdrop, no shadows outside shapes, no glow. Landscape 1536x1024, 4 columns x 4 rows of equally sized cells, every part centered and completely isolated inside its cell with large transparent margins. Row1: gray bucket helmet head; olive tunic torso with belt WITHOUT arms/legs; short ochre cape; brown hip satchel. Row2: left upper arm sleeve and joint tab; left forearm with glove; right upper arm sleeve and joint tab; right forearm with glove. Row3: left thigh; left shin with boot; right thigh; right shin with boot. Row4: carried CLOSED toothed spring trap with handle; OPEN ARMED ground trap with jaws fully laid flat apart and pressure plate accessible in middle, slightly overhead side perspective; CLOSED SNAPPED ground trap with both jaws meeting upright; BROKEN trap with bent spring and broken teeth. Each arm/leg is a separate complete piece with overlap tab for puppet rigging, preserve reference shapes, boots face right. Traps are steel toothed jaw rat traps, strong clear distinction between laid-flat OPEN and upright CLOSED jaws. No gore or anatomy. Exactly 16 isolated items in regular grid.

최종 배경 제거 프롬프트:

> Background extraction ONLY. Remove ALL dark background, colored halos, shadows and grid seams around every isolated item. Empty space must be absolutely fully transparent alpha=0, NOT translucent black. Keep all 16 drawings, outlines, positions, sizes and grid layout unchanged. This is a clean sprite sheet cutout for a game; every pixel between items must be transparent, no glow, no shadows, no background color. Preserve opaque character fills and black outlines exactly.
