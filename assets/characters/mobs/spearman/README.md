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

## 양손 창 자세 보정

- 팔꿈치를 굽혀 앞손/뒷손을 창대의 30px 간격에 배치합니다.
- 준비 → 당기기/멈춤 → 팔 뻗기 → 느린 회수. 몸을 실어도 발 위치는 유지합니다.
- `tools/author_spearman_pose.py`는 기존 타임라인 형식으로 관절 위치를 계산해 저장하는 오프라인 저작 도구입니다. 실행 중 IK 계산이나 새 렌더러는 추가하지 않았습니다. 이 도구를 다시 실행하면 창잡이 팔/창 타임라인을 다시 작성합니다.
- 좌우 482개 시점에서 실제 렌더 변환의 손–창 잡는 지점 최대 오차 0.074px 확인.

## 생존 투창

- 출현 후 30초 이상 생존하면 현재 동작이 끝난 뒤 투창을 준비합니다.
- 붉은 선 예고 1초: 처음 0.6초 조준, 마지막 0.4초 방향 고정. 고정된 직선으로 속도 900px/s, 최대 1300px 비행하며 유도하지 않습니다.
- 한 번만 던지고 창/찌르기를 제거한 상태로 맨손 접근합니다. 재등장 시 창과 생존 시간을 복원합니다.
- 예고 도중 사망/피격 시 발사를 취소하며, 살아있으면 1초 이후 다시 준비할 수 있습니다. 일시정지 중에는 시간이 진행되지 않습니다.
- `tools/author_spearman_throw.py`가 투창 준비/팔 뻗기 동작을 작성합니다. 양손 자세를 재생성할 경우 `author_spearman_pose.py` 다음에 이 도구를 실행합니다.
- `outputs/spearman-video/`의 MP4는 실제 렌더러와 게임 동작을 재생한 시연입니다. 투창 시연의 까마귀 점프는 회피를 보여주기 위해 연출했습니다.

투창 시연 MP4는 변경 전 8초 설정으로 촬영된 영상입니다. 현재 게임의 투창 대기 시간은 30초입니다.

## 투창 후 주먹 공격

- 창을 던진 뒤에만 `맨손 주먹` AI를 켭니다. 65px 이내에서 준비→짧은 잽→회수(0.9초), 공격 시작 간격 1.2초입니다.
- 판정은 창끝을 따라가지 않고 주먹 주변 24×22px 영역에서 5~6프레임에만 켜집니다. 재등장하면 주먹 AI를 끄고 창을 복원합니다.
- `tools/author_spearman_punch.py`로 해당 동작만 재작성할 수 있습니다. 전체 동작을 재생성할 때는 자세→투창→주먹 순으로 실행합니다.
