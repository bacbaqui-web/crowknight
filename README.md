# Puppet Character Animation Beta

파츠별 PNG를 조합해서 주인공과 적 캐릭터가 돌아다니고 싸우는 샘플입니다.

## 실행

VSCode에서 Live Server로 `index.html` 실행.

- 플레이 화면: `index.html`
- 캐릭터 설정 화면: `setting.html`
- 검사: `npm run check`
- 포맷: `npm run format`

## 조작

- 이동: 방향키
- 점프: Space
- 공격: Q
- 구르기: W
- 방어: E

## 교체할 이미지

캐릭터별 폴더 안 PNG를 같은 이름으로 교체하세요.

- 주인공: `assets/characters/player`
- 적1: `assets/characters/enemy1`
- 적2: `assets/characters/enemy2`
- 적3: `assets/characters/enemy3`
- 적4: `assets/characters/enemy4`

## 캐릭터 설정

`setting.html`에서 주인공/적1/적2/적3/적4를 선택해서 이름, 이동 능력치, 히트박스, 파츠 위치를 조절할 수 있습니다.

## 공격 이펙트

공격 궤적은 `assets/effects/attack` 폴더의 `slash_1.png`, `slash_2.png`, `slash_3.png`를 교체해서 바꿀 수 있습니다.
