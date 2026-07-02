# FIREBASE_RULES.md

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
