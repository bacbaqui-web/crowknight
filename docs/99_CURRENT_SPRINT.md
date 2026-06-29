# 99_CURRENT_SPRINT.md

## Sprint 목표

JS 파일 수를 줄인다.

캐릭터 PSD refresh와 Effect asset refresh의 중복 Runtime helper를 하나로 합친다.

## 핵심 원칙

- 큰 파일에 무작정 흡수하지 않는다.
- 같은 asset refresh/upload 책임은 같은 파일로 모은다.
- 중복 helper를 제거한다.
- 저장 구조는 변경하지 않는다.
- Runtime combat 규칙은 변경하지 않는다.

## 완료한 작업

- `src/assetRefreshRuntime.js` 추가.
- Character PSD refresh/upload 흐름을 `assetRefreshRuntime.js`로 이동.
- Effect asset refresh/upload 흐름을 `assetRefreshRuntime.js`로 이동.
- 중복 `fetchJson()` helper를 하나로 통합.
- 중복 binary upload 흐름을 `uploadBinaryAsset()`로 통합.
- `src/characterPsdRuntime.js` 제거.
- `src/effectAssetRuntime.js` 제거.
- `src/tuningPanelAssetActions.js` import를 공통 asset refresh 파일로 변경.
- `docs/10_SRC_MAP.md`에서 삭제/추가 파일 항목 갱신.

## 변경한 파일과 변경 이유

- `src/assetRefreshRuntime.js`
  - Editor asset refresh/upload Runtime helper 통합.
- `src/tuningPanelAssetActions.js`
  - Character/Effect asset refresh import 경로 변경.
- `src/characterPsdRuntime.js`
  - 삭제. 기능은 `assetRefreshRuntime.js`로 이동.
- `src/effectAssetRuntime.js`
  - 삭제. 기능은 `assetRefreshRuntime.js`로 이동.
- `docs/10_SRC_MAP.md`
  - 소스 지도 갱신.
- `docs/99_CURRENT_SPRINT.md`
  - 이번 Sprint 결과 기록.

## 변경된 데이터 흐름

Before:

```text
tuningPanelAssetActions
→ characterPsdRuntime
→ fetchJson / uploadCharacterPsd

tuningPanelAssetActions
→ effectAssetRuntime
→ fetchJson / uploadEffectAsset
```

After:

```text
tuningPanelAssetActions
→ assetRefreshRuntime
→ fetchJson / uploadBinaryAsset
```

## 제거한 중복 또는 예외 처리

- Character/Effect asset refresh 파일 분리 제거.
- 중복 `fetchJson()` 제거.
- 중복 POST upload boilerplate 제거.
- JS 파일 수: `src` 기준 142개 → 141개.

## 유지한 구조와 의도적으로 건드리지 않은 부분

- Character asset loader는 `loadCharacterAssets()` 유지.
- Effect asset loader는 `loadEffectAsset()` 유지.
- API endpoint는 기존 값 유지.
- Panel button binding 구조는 유지.
- 저장 구조는 변경하지 않음.
- Runtime combat system은 변경하지 않음.

## 아직 남아있는 예외 처리

- Effect runtime renderer는 아직 `actorEffectsRenderer.js`에 별도 존재.
- Effect context active key는 synthetic key `effect`를 사용한다.
- Master/root는 아직 `anchorX/anchorY` 기반이다.
- Group edit는 screen-space group transform이다.
- Background/Stage/HUD는 아직 editable object handle 시스템에 흡수되지 않았다.

## 검증 방법 및 결과

- 통과: `npm run check`.
- 통과: `git diff --check`.
- 통과: `assetRefreshRuntime.js` import smoke test.
- 통과: `tuningPanelAssetActions.js` import smoke test.
- 통과: 삭제 파일 import 검색.
  - `src`에서 `characterPsdRuntime` 참조 없음.
  - `src`에서 `effectAssetRuntime` 참조 없음.
- 통과: `src` 파일 수 141개 확인.
- 제한: 실제 PSD/Effect asset upload API QA는 아직 수행하지 않음.

## 알려진 위험 요소

- `assetRefreshRuntime.js`가 Character와 Effect asset refresh를 함께 가진다.
- 둘 다 Editor asset refresh/upload 책임이라 현재 통합 경계는 자연스럽다.
- Asset 종류가 더 늘면 asset type별 config 기반으로 확장할 수 있다.

## 다음 Sprint 추천

1. 미사용 export 정리.
   - `interactionObjectPartSources()`
   - `createEditableObject()`
   - `centeredEditableTransform()`
   - `centerOffsetEditableTransform()`
   - `editableTransformBounds()`
2. Effect runtime renderer 공통화 검토.
   - `actorEffectsRenderer.js`가 editable object render/source와 더 합쳐질 수 있는지 확인.
3. 작은 파일 통합 후보 재검토.
   - 큰 파일을 키우지 않는 범위에서만 진행.

## 리팩토링 후보와 이유

- `src/assetRefreshRuntime.js`
  - 이번 Sprint에서 Character/Effect asset refresh를 통합함. Asset 종류 증가 시 config화 후보.
- `src/actorEffectsRenderer.js`
  - Runtime Effect render entry가 아직 별도.
- `src/editableObjectModel.js`
  - 미사용 export 후보가 남아 있음.
- `src/tuningInteractionObjects.js`
  - 미사용 source helper 후보가 남아 있음.

## 파일 크기 또는 구조상 주의할 점

- `src/tuningNormalize.js`: 465줄. 저장 schema 책임 집중.
- `src/puppetPlayer.js`: 440줄. Runtime state/helper 책임 집중.
- `src/tuningPanel.js`: 421줄. 추가 흡수 시 파일 비대화 주의.
- `src/tuningEffectTimelineController.js`: 398줄. Effect UI/timeline 책임 집중.
- `src/puppetPlayerRenderer.js`: 394줄. render/edit region 기록 책임 집중.
- `src/assetRefreshRuntime.js`: 72줄. 이번 Sprint에서 asset refresh helper를 통합함.
