# 창잡이

- 초록 목망토, 황토색 투구, 긴 창. 방패 없음.
- `parts-sheet.png`: 이미지 생성 도구의 원본 시트.
- 실행용 PNG 12개: 머리·몸통·망토·좌우 상완/하완·좌우 허벅지/정강이·창.
- 기존 칼잡이의 몸통/다리 이동 데이터를 기반으로 창을 잡는 자세와 준비→찌르기→회수를 조정함.
- 찌르기: 1.2초, 6~7프레임 공격 판정, 재사용 1.6초. 최대 2마리, 재등장 4초.
- 개별 이미지와 관절 좌표는 설정 화면에서 추가 조정 가능. 생성 이미지에는 원본보다 약한 음영이 남아 있음.

## 생성 방식과 프롬프트

Built-in image_gen. 기존 칼잡이 PNG와 첫 창잡이 파츠 시안을 참고하여 생성.

> Edit the spearman cutout sheet: forest green neck cape instead of red; ochre bucket helmet and dark olive body. Remove the shield entirely. Flat simple geometric shapes and thick irregular black outlines matching Crow Knight. Twelve detached parts on transparent alpha: head, body, cape, two upper arms, two forearms, two thighs, two shins/boots, long spear. Separate elbows and knees with joint overlap. No text, background, assembled character, or extra props.

게임용 분리 과정에서 상완/하완을 관절 부근으로 잘라내고 창을 오른쪽 방향으로 회전했습니다. 기존 캐릭터 PNG와 PSD는 변경하지 않았습니다.
