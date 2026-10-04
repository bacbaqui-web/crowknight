# Crow Knight

캐릭터·Action·Effect·Stage 제작툴과 데이터 기반 횡스크롤 게임입니다.

## 로컬 실행

```sh
npm install
npm run setup:python
npm run dev
```

- 세팅: `http://127.0.0.1:4173/setting.html`
- 베타: `http://127.0.0.1:4173/beta.html`
- 공개 snapshot 로컬 확인: `http://127.0.0.1:4173/index.html`
- 공개 사이트: https://bacbaqui-web.github.io/crowknight/

## 제작과 배포

1. 세팅에서 수정하면 로컬 draft와 beta snapshot에 자동 저장됩니다. 저장 오류는 상단에 표시됩니다.
2. 상단 **베타 플레이**로 이동합니다. 베타 기록은 공개 랭킹에 들어가지 않습니다.
3. 베타에서 **PLAY**를 누르면 **공개 배포** 버튼이 활성화됩니다.
4. 공개 배포는 플레이한 beta revision의 설정·이미지를 고정하고 Git 커밋/push합니다.
5. GitHub Pages에서 같은 revision이 확인되면 **공개 게임에 반영했습니다**가 표시됩니다.

배포에는 `release.config.json`의 브랜치와 원격 저장소 push 권한이 필요합니다. 게임 코드 변경은 먼저 커밋하고 배포해야 합니다. 다른 staged 변경이 있거나 베타가 바뀌면 배포를 중단합니다. push 실패 후 같은 버튼으로 재시도할 수 있습니다.

`setting.html`은 로컬 Python dev server에서 사용합니다. 세팅과 베타는 같은 runtime code를 쓰고 제작 데이터·이미지 snapshot을 분리합니다. runtime code 변경까지 별도 버전으로 고정하는 구조는 아닙니다.

## 저장 구조

- `data/draft.json`: 제작 원본 상태
- `data/beta.json`: 현재 베타 플레이 snapshot
- `data/published.json`: 공개 플레이 snapshot
- `release-assets/`: 내용 hash로 고정한 파생 이미지
- `assets/`: 로컬 제작 에셋과 원본 PSD
- Firestore: 공개 랭킹만 사용
- Firebase Storage: 사용하지 않음

PSD는 기존 경로에 보존하며 snapshot에 포함하지 않습니다. 기존 Storage 객체 128개는 백업했고 원격에서 자동 삭제하지 않습니다. 예전 PSD 복사본은 Git 제외된 `runtime/firebase-migration-backup`에 보관합니다. `tools/migrate_firebase_assets.py`는 초기 이전용이며 다시 실행하면 현재 draft/beta/published를 초기화하므로 일상 작업에 사용하지 않습니다.

## 검사

```sh
npm run check
npm test
```

설계는 `docs/00_MANIFEST.md`, 구조는 `docs/03_ARCHITECTURE.md`, 파일 위치는 `docs/10_SRC_MAP.md`를 참고합니다. 전체 구조 감사와 분리 후보는 `docs/21_REFACTOR_AUDIT.md`에 기록합니다.
