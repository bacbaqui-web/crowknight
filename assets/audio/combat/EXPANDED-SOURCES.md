# 확장 효과음 — 2026-10-27

게임에서 직접 재생하는 짧은 녹음/효과음 22개를 추가했습니다. 원본은 아래 CC0 자료이며, 편집·중첩·피치 변경을 거친 파생본입니다. 전차/도화선/마법은 재질 녹음을 조합한 디자인 효과음으로 실제 전차나 마법의 현장 녹음은 아닙니다. 기존 타격·패링·경험치·체력 소리는 유지합니다.

| 출처·제작자 | 적용 |
| --- | --- |
| [Impact Sounds — Kenney](https://kenney.nl/assets/impact-sounds) | 풀밭 발걸음 3종, 착지, 둔탁한 충격, 금속 충돌 |
| [RPG Audio — Kenney](https://kenney.nl/assets/rpg-audio) | 천 마찰, 금속 잠금·걸쇠·딸깍임, 물체 떨어짐, 기계 마찰의 소재 |
| [RPG Sound Pack — artisticdude](https://opengameart.org/content/rpg-sound-pack) | 사슬갑옷, 쓰러짐, 마법 준비, 화염 발사의 소재 |
| [Medieval Weapon Textures — Ben Jaszczak & Brian Nelson](https://opengameart.org/content/medieval-sound-effects-weapon-textures) | 실제 English Longbow Shoot 녹음의 첫 발사 구간 |
| [Fire Crackling — AntumDeluge](https://opengameart.org/content/fire-crackling) | 불 타는 소리, 도화선, 화염 발사의 소재 |
| [Balloon Sounds — Gniffelbaf / AntumDeluge](https://opengameart.org/content/balloon-sounds) | 풍선 파열 녹음 |
| [Explosions — EZduzziteh](https://opengameart.org/content/explosions-4) | 폭발 2종과 피치를 낮춘 대형 폭발 |

모든 원본 페이지에서 CC0를 확인했습니다. [CC0 안내](https://creativecommons.org/publicdomain/zero/1.0/). 파일별 원본명·SHA-256·출처·중첩 비율·지연·편집 정보는 `expanded-sources.json`. Kenney 번들 고지는 `KENNEY-LICENSE.txt`, `KENNEY-RPG-LICENSE.txt`입니다.

제작: `python3 tools/prepare_combat_audio.py <source-directory>`. FFmpeg 필요. 44.1kHz 모노 16bit WAV, 앞 무음 제거, 짧은 페이드, 최고 진폭 약 -2.5dBFS. 원본 대신 짧은 파생본만 배포하고 브라우저에서 외부 음원 사이트에 접근하지 않습니다.

재생 설정: `src/combat_sound_catalog.js`. 이벤트 감지와 오디오 출력은 별도 모듈로 분리. 좌우 팬, 거리 감쇠(1,400 이상 생략), 24보이스 제한, 같은 이벤트 최대 4보이스, 이벤트별 재생 간격과 중요도, 마스터 압축. 음량·음소거 설정은 브라우저에 저장합니다.
