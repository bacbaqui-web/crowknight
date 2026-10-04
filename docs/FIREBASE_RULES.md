# Firebase 서비스 경계

2026-10-04 이후 게임 설정과 이미지는 Git 관리 파일에서 로드한다. Firebase는 공개 랭킹만 사용한다.

- 신규 Storage upload/download는 없다. 기존 Storage 객체는 migration backup이며 자동 삭제하지 않았다.
- `projectSettings/crowKnight`는 더 이상 게임이 읽거나 쓰지 않는다. 아래 이전 규칙은 현재 클라우드 규칙을 적용했다는 의미가 아니다.
- `rankingEntries`의 기존 공개 제출 동작은 유지한다. 인증/서버 검증과 rule 강화는 별도 작업이다.

## 이전 개발용 규칙 — 참고용 보존

현재 개발 단계에서 필요한 Firebase 규칙이다.

주의:

- 아래 규칙은 개발용 공개 규칙이다.
- 인증/계정 시스템을 붙이면 반드시 `request.auth` 기준으로 좁혀야 한다.
- Storage 경로는 `crow-knight/assets/**`만 사용한다.

## Firebase Storage Rules

```js
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /crow-knight/assets/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## Cloud Firestore Rules

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /projectSettings/crowKnight {
      allow read, write: if true;
    }

    match /rankingEntries/{entryId} {
      allow read, write: if true;
    }
  }
}
```
