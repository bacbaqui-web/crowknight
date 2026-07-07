# Puppet Character Animation Beta

파츠별 PNG를 조합해서 주인공과 적 캐릭터가 돌아다니고 싸우는 샘플입니다.

## 실행

로컬 제작툴은 dev server로 실행합니다.

- 플레이 화면: `index.html`
- 캐릭터 설정 화면: `setting.html`
- 로컬 제작툴 실행: `npm run dev`
- 검사: `npm run check`
- 포맷: `npm run format`

`setting.html`은 로컬 제작 전용 페이지입니다. Firebase Hosting 같은 웹 배포 대상에서 제외합니다.
PSD 업로드 / 새로고침 / 로컬 저장 API를 사용하려면 Live Server가 아니라 Crow Knight dev server 주소로 엽니다.

## 조작

- 이동: 방향키
- 점프: Space
- 공격: Q
- 구르기: W
- 방어: E

## 교체할 이미지

캐릭터별 폴더 안 PNG를 같은 이름으로 교체하세요. 현재 로컬 기본 캐릭터 기준은 `assets/characters/index.json`입니다.

- 주인공: `assets/characters/players/player_01`
- 잡몹: `assets/characters/mobs/enemy_01`
- 보스: `assets/characters/bosses/boss_01`

## 캐릭터 설정

`setting.html`에서 주인공 / 잡몹 / 보스 그룹을 선택한 뒤 캐릭터 이름, 이동 능력치, 히트박스, 파츠 위치를 조절할 수 있습니다. 제작 중 캐릭터 목록은 로컬 `assets/characters/index.json`을 기준으로 읽습니다.

## 제작툴 아키텍처

`setting.html`은 장기적으로 횡스크롤 액션 게임 제작툴로 확장합니다.

- 설계 기준: [docs/tool-architecture.md](docs/tool-architecture.md)

## 공격 이펙트

공격 궤적은 `assets/effects/attack` 폴더의 `slash_1.png`, `slash_2.png`, `slash_3.png`를 교체해서 바꿀 수 있습니다.
