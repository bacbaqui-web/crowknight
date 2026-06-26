# Crow Knight 제작툴 아키텍처

## 1. 목표

`setting.html`은 단순 설정 화면이 아니라 횡스크롤 액션 게임을 제작하는 툴이다.

최종적으로 이 프로젝트는 아래처럼 역할이 분리되어야 한다.

- `setting.html`: 게임 제작툴, 에디터, 미니 엔진 툴
- `index.html`: 제작툴로 만든 결과물을 실행하는 플레이 화면
- `src`: 툴 런타임, 게임 런타임, 공통 엔진 코드
- `assets`: 캐릭터, 시각 효과, 배경 등 제작 리소스

이 문서의 목적은 앞으로 기능 추가와 리팩토링을 할 때 기준이 되는 구조를 정의하는 것이다.

## 2. 기본 원칙

- 제작툴의 안정성을 게임 기능보다 우선한다.
- 제작툴의 작동 모델은 After Effects식 레이어/프로퍼티/키프레임 구조를 기준으로 한다.
- 같은 UI 패턴은 같은 내부 시스템을 사용해야 한다.
- 작업 흐름은 캐릭터 파트와 스테이지 파트로 나눈다.
- 캐릭터 파트는 셋업, 애니메이션, 이펙트 세션을 기본으로 한다.
- 스테이지 파트는 배경뿐 아니라 진행 규칙, 적 성장, 카드 보상, 점수 시스템까지 포함한다.
- 파츠 애니메이션, 시각 효과, 히트박스처럼 시간에 따라 바뀌는 값은 모두 타임라인 트랙으로 취급한다.
- 툴 전용 코드와 게임 실행 코드는 분리한다.
- 저장 데이터 구조는 명확하고 마이그레이션 가능해야 한다.
- 작업에 사용되는 파일 에셋의 최종 기준 원본은 Firebase Storage에 업로드된 파일이다.
- 새 기능은 기존 컨트롤러에 덧붙이기보다 적절한 도메인 모듈에 추가한다.
- 큰 리팩토링은 한 번에 뒤엎지 않고 공통 코어를 넓혀가는 방식으로 진행한다.

### 2.1 After Effects식 작동 모델

제작툴의 기본 편집 감각은 After Effects를 기준으로 한다.

완전히 같은 UI를 복제한다는 뜻이 아니라, 아래 작동 원리를 따른다는 뜻이다.

- 컴포지션: 하나의 편집 단위다. 이 프로젝트에서는 캐릭터 동작, 시각 효과, 장면 또는 게임 제작 단위를 컴포지션처럼 본다.
- 레이어: 시간축 위에서 편집되는 대상이다. 캐릭터 파츠, 시각 효과, 히트박스, 배경, 카메라 연출은 모두 레이어처럼 다룬다.
- 프로퍼티: 레이어가 가진 값이다. 위치, 크기, 회전, 투명도, 앵커, 히트박스 크기, 넉백 값 등이 프로퍼티다.
- 키프레임: 특정 프레임에서 프로퍼티 값을 저장한 것이다.
- 타임라인: 모든 레이어와 프로퍼티가 시간에 따라 변하는 공간이다.
- 프리뷰: 현재 타임라인 상태를 즉시 재생하거나 확인하는 기능이다.

이 모델을 적용하면 아래 규칙이 생긴다.

- 시각 효과는 예외 기능이 아니라 시각 효과 레이어다.
- 히트박스는 보이지 않는 레이어다.
- 캐릭터 파츠는 이미지 레이어다.
- 배경은 장면 레이어다.
- 파츠 애니메이션/시각 효과/히트박스의 차이는 타임라인 시스템의 차이가 아니라 adapter의 차이다.
- 복사/붙여넣기, 키프레임 이동, 선택, 재생, undo는 모든 레이어에서 같은 규칙으로 작동해야 한다.
- 선택한 레이어와 선택한 프로퍼티가 현재 편집 대상이 된다.
- 빈 프레임에 값을 붙여넣으면 그 위치에 키프레임이 생기는 것이 기본 동작이다.

앞으로 "에펙처럼"이라고 말하면 이 문서에서는 위 모델을 따른다는 의미로 해석한다.

### 2.2 용어 정리

앞으로 문서와 코드에서 아래 용어를 구분한다.

- 캐릭터 파트: 캐릭터 하나를 제작하는 큰 영역이다. 셋업, 애니메이션, 이펙트 세션을 포함한다.
- 스테이지 파트: 배경과 실제 게임 진행 규칙을 제작하는 큰 영역이다. 배경, 진행, 적 성장, 카드 보상, 점수 규칙을 포함한다.
- 셋업: 캐릭터 이름, PSD/파츠, rig, 전체 크기, 기본 피격 히트박스, HP, 사용할 동작/스킬을 정하는 단계다.
- 애니메이션: 선택한 동작/스킬의 파츠 키프레임과 동작 보정값을 만드는 단계다.
- 이펙트 세션: 시각 효과, 공격 히트박스, 활성 프레임, 사운드, 잔상 같은 연출과 판정을 맞추는 단계다.
- 시각 효과: 공격 이펙트 이미지처럼 화면에 보이는 효과다. 문맥상 혼동될 수 있으면 그냥 "효과" 대신 "시각 효과"라고 쓴다.
- 카드 효과: 레벨업 카드가 플레이 중 적용하는 능력치/동작/스킬 강화다. 시각 효과와 다른 개념이다.
- 동작: idle, run, jump, roll, attack1처럼 캐릭터가 수행하는 기본 상태 또는 행동 단위다.
- 스킬: 캐릭터가 사용할 수 있는 능력 단위다. 필요하면 하나 이상의 동작, 공격 히트박스, 시각 효과를 묶는다.
- 카드: 레벨업 때 제시되는 선택지다. 카드는 스킬 자체가 아니라 플레이 중 캐릭터를 강화하는 보상이다.
- 포즈: 현재 코드에서 파츠 키프레임 데이터를 부르는 구현 용어다. 장기적으로 UI에서는 동작/스킬 애니메이션이라는 이름을 우선한다.
- Firebase 설정 업로드: 프로젝트 설정 JSON을 저장하는 동작이다.
- 에셋 업로드: PSD, 이미지 같은 파일을 Firebase Storage에 올리는 동작이다.

## 3. 툴에서 보장해야 하는 기본 기능

### 3.1 전체 제작 워크플로우

제작툴은 사용자가 캐릭터와 스테이지를 순서대로 완성할 수 있도록 배치되어야 한다.

큰 작업 파트:

1. 캐릭터 파트
2. 스테이지 파트
3. 저장/플레이 확인

기본 제작 흐름:

1. 캐릭터 파트 - 셋업
2. 캐릭터 파트 - 애니메이션
3. 캐릭터 파트 - 이펙트
4. 스테이지 파트 - 배경/진행/보상/적 성장
5. 저장/플레이 확인

캐릭터 파트 - 셋업:

- 캐릭터를 선택하거나 새 캐릭터를 만든다.
- 캐릭터 이름을 정한다.
- 해당 캐릭터의 PSD 파일을 불러오고 업로드한다.
- PSD에서 생성된 파츠를 배치하고 rig를 맞춘다.
- 캐릭터 전체 크기를 정한다.
- 캐릭터의 기본 피격 히트박스를 정한다.
- 캐릭터의 HP와 기본 전투 수치를 정한다.
- 이 캐릭터가 사용할 동작과 스킬을 선택한다.

캐릭터 파트 - 애니메이션:

- 캐릭터 셋업에서 선택한 동작과 스킬만 편집 대상으로 보여준다.
- 각 동작과 스킬은 타임라인을 가진 제작 단위다.
- 사용자는 동작별 파츠 애니메이션을 만든다.
- 동작과 스킬에 적용되는 이동 속도, 가속, 무적 시간, 쿨타임, 특수 판정 같은 동작 보정값을 정한다.
- 동작 중 함께 재생될 시각 효과는 시각 효과 레이어로 연결하되, 구체적인 이미지와 공격 판정은 이펙트 세션에서 확정한다.

캐릭터 파트 - 이펙트:

- 선택된 동작과 스킬의 공격 히트박스를 설정한다.
- 공격 히트박스의 켜짐/꺼짐 프레임을 정한다.
- 동작마다 같이 나올 시각 효과 이미지를 선택하고 업로드한다.
- 시각 효과 이미지의 위치, 크기, 회전, 투명도, 타이밍을 맞춘다.
- 필요하면 카메라 흔들림, 사운드, 잔상 같은 연출 트랙을 추가한다.
- 실제 게임 미리보기로 동작, 판정, 시각 효과가 함께 맞는지 확인한다.

스테이지 파트:

- 배경 PSD 또는 이미지를 업로드한다.
- 배경 레이어, 패럴랙스, 바닥 위치, 월드 경계를 조정한다.
- 캐릭터가 오른쪽으로 계속 이동하는 기본 진행 규칙을 정한다.
- 적 등장 규칙, 적 종류, 적 성장 곡선, 난이도 상승 규칙을 정한다.
- 일정 수의 적을 처치하거나 경험치를 모으면 레벨업하도록 정한다.
- 레벨업 시 네 개의 카드 보상이 뜨고, 플레이어는 그중 하나를 선택한다.
- 카드 보상은 공격력 증가, 이동속도 증가, 구르기 성능 증가, 점프력 증가, 공격범위 증가, 생명력 회복, 방어 수치에 비례한 공격 보너스 같은 강화 효과를 가진다.
- 카드의 "구르기 성능 증가"가 실제로 구르기 강도, 무적 시간, 쿨타임, 이동 거리 중 무엇을 바꾸는지는 카드 데이터에서 따로 정의한다.
- 레벨이 오르거나 진행 거리가 길어질수록 더 강한 적이 등장하도록 설정한다.
- 얼마나 전략적으로 카드를 선택했는지에 따라 더 많은 적을 무찌르고 더 높은 점수를 얻는 구조로 만든다.
- 캐릭터가 완성된 동작과 카드 강화값으로 스테이지 안에서 자연스럽게 움직이는지 확인한다.

게임 플레이 모델:

- 장르는 오른쪽 진행형 횡스크롤 액션 로그라이트로 본다.
- 플레이어 캐릭터는 계속 오른쪽으로 전진하며 등장하는 적을 무찌른다.
- 적 처치, 경험치, 진행 거리 같은 기준으로 레벨이 오른다.
- 레벨업마다 무작위 카드 네 장이 제시되고 하나만 선택한다.
- 카드는 즉시 플레이어 캐릭터의 능력치, 동작, 스킬, 방어, 회복, 공격 범위 등을 강화한다.
- 레벨과 진행도가 높아질수록 적의 체력, 공격력, 수, 패턴이 강해진다.
- 플레이의 핵심 재미는 랜덤 카드 선택을 통해 현재 캐릭터 빌드를 만들고, 강해지는 적을 어디까지 버티며 처치하는지에 있다.
- 최종 평가는 처치 수, 점수, 진행 거리, 도달 레벨 같은 값으로 한다.

저장/플레이 확인:

- 최종 저장/플레이 확인에서는 파일 에셋이 Firebase Storage에 업로드된 값을 기준으로 한다.
- 프로젝트 설정은 Firebase 프로젝트 상태 업로드/다운로드 시스템으로 저장한다.
- `index.html` 플레이 화면은 제작툴과 같은 캐릭터, 동작, 시각 효과, 스테이지 설정을 읽어야 한다.

데이터 기준:

- 캐릭터 정의는 이름, 에셋 참조, rig, 전체 크기, 피격 히트박스, HP, 사용 동작/스킬 목록을 포함한다.
- 동작/스킬 정의는 고유 ID, 이름, 타입, 타임라인, 동작 보정값, 공격 판정, 연결된 시각 효과를 포함한다.
- 스테이지 정의는 배경, 바닥/월드 경계, 적 등장 규칙, 난이도 성장 규칙, 레벨업 조건, 카드 보상 풀, 점수 규칙을 포함한다.
- 카드 정의는 고유 ID, 이름, 설명, 등장 조건, 강화 대상, 강화량, 중첩 가능 여부를 포함한다.
- 적 정의는 이름, 에셋 참조, HP, 공격력, 이동/공격 패턴, 등장 레벨, 성장 배율을 포함한다.
- 선택되지 않은 동작과 스킬은 기본 UI에서 숨기되, 기존 데이터는 사용자가 삭제를 확정하기 전까지 보존한다.
- 새 동작이나 스킬을 선택하면 기본 타임라인, 기본 히트박스, 기본 시각 효과 슬롯을 자동 생성한다.

### 3.2 프로젝트/저장 시스템

- 현재 선택 캐릭터와 전체 프로젝트 상태 저장
- 로컬 저장과 불러오기
- Firebase 업로드/다운로드
- 프로젝트 기본값 복구
- undo/redo
- 설정 버전 변화에 대응하는 정규화/마이그레이션

현재 오른쪽 위 `Firebase 업로드`, `Firebase 다운로드` 버튼은 앞으로도 기본 저장/동기화 시스템으로 유지한다.

기본 규칙:

- Firebase 업로드는 현재 제작툴의 전체 프로젝트 상태를 원격 저장소에 올린다.
- Firebase 다운로드는 원격 저장소의 프로젝트 상태를 받아와 현재 작업 환경에 반영한다.
- 이 시스템은 간편한 프로젝트 백업/복구/기기 간 이동 수단으로 계속 사용한다.
- 로컬 저장은 빠른 자동 저장과 임시 복구용으로 사용한다.
- Firebase 저장은 명시적으로 사용자가 누르는 기준 저장 지점으로 사용한다.
- 저장 데이터에는 캐릭터 정의, 동작/스킬 타임라인, 시각 효과 설정/키프레임, 스테이지 설정, 선택된 세션 정보가 포함되어야 한다.
- 다운로드 후에는 저장 데이터 정규화와 마이그레이션을 반드시 거친다.
- 업로드 전에는 현재 로컬 상태가 최신인지 보장해야 한다.
- 저장 실패/다운로드 실패는 툴 UI에서 명확히 보여야 한다.

설정 상태와 파일 에셋은 분리해서 생각한다.

- 설정 상태: 캐릭터 정의, 동작/스킬 키프레임, 시각 효과 키프레임, 스테이지 설정, 세션 선택 정보처럼 JSON으로 저장 가능한 값이다.
- 파일 에셋: 캐릭터 PSD/파츠 이미지, 시각 효과 이미지, 배경 PSD/이미지처럼 실제 바이너리 파일이다.
- 설정 상태는 Firebase 프로젝트 상태 저장/다운로드 시스템으로 동기화한다.
- 파일 에셋은 Firebase Storage에 업로드하고, 설정 상태에는 Storage 경로/URL/버전 같은 참조 정보만 남기는 것을 기준으로 한다.
- 따라서 최종 저장과 플레이 확인에서는 플레이 화면과 제작툴 미리보기가 같은 Storage 기준 에셋을 참조해야 한다.

현재 오른쪽 위 `초기화` 버튼은 선택 캐릭터의 설정 초기화 기능이다.

초기화 규칙:

- 초기화는 저장 시스템과 다르게 파괴적 편집 작업으로 취급한다.
- 초기화 전에는 확인창이 필요하다.
- 초기화는 undo 가능한 작업이어야 한다.
- 전체 프로젝트 초기화가 필요해지면 선택 캐릭터 초기화와 버튼/문구를 명확히 분리한다.

관련 코드:

- `src/saveStateStorage.js`
- `src/firebaseProjectState.js`
- `src/firebaseStorageAssets.js`
- `src/tuningNormalize.js`
- `src/tuningPanelUndoState.js`

### 3.3 캐릭터/파츠 편집

- 캐릭터 선택
- 캐릭터 이름 편집
- 파츠 이미지 교체/새로고침
- 파츠 위치, 크기, 회전, 투명도 편집
- 관절/앵커 편집
- 레이어 순서 편집
- 캐릭터 전체 크기 편집
- 기본 피격 히트박스 편집
- HP와 기본 전투 수치 편집
- 사용할 동작/스킬 선택
- 캔버스 드래그 편집
- 다중 파츠 선택과 그룹 편집

관련 코드:

- `src/actorState.js`
- `src/actorTuning.js`
- `src/tuningPanelPartController.js`
- `src/tuningCanvasPointerDrag.js`
- `src/tuningCanvasDragFactory.js`
- `src/tuningParts.js`
- `src/playerDefaultRig.js`

### 3.4 타임라인 애니메이션

타임라인은 제작툴의 핵심 엔진이다.

필수 기능:

- 키프레임 추가
- 키프레임 삭제
- 키프레임 선택
- 빈 슬롯 선택
- 키프레임 드래그 이동
- 시작/끝 프레임 편집
- 프레임 복사/붙여넣기
- 프레임 수 조절
- 재생 속도 조절
- 반복/한 번 재생
- undo/redo 연동
- 미리보기 연동

현재 타임라인 대상:

- 선택된 동작/스킬의 파츠 애니메이션 타임라인
- 선택된 동작/스킬에 연결된 시각 효과 타임라인

참고: 현재 코드와 일부 파일명에서는 파츠 애니메이션 타임라인을 `포즈 타임라인`이라고 부른다.

앞으로 타임라인 대상이 될 수 있는 것:

- 공격 히트박스
- 구르기 히트박스
- 피격/파편 시각 효과
- 배경 이벤트
- 카메라 연출

관련 코드:

- `src/timelineControllerActions.js`
- `src/timelineControllerView.js`
- `src/timelineFrameClipboard.js`
- `src/timelineFrameRead.js`
- `src/timelineKeyframeMutations.js`
- `src/timelineRenderer.js`
- `src/timelineState.js`
- `src/timelineControllerContract.js`
- `src/tuningTimelineAccessors.js`
- `src/tuningTimelinePreview.js`

공통 타임라인 컨트롤러 계약:

동작 타임라인과 시각 효과 타임라인은 최소한 아래 메서드를 공통으로 제공해야 한다.

- `addKeyframe`
- `deleteKeyframe`
- `copyFrame`
- `pasteFrame`
- `resetAnimation`
- `resetSelectionState`
- `currentFrameValue`
- `writeFrameValue`
- `hasFrameSelection`
- `stepDuration`
- `togglePlayback`
- `togglePlaybackMode`
- `updatePlaybackRate`
- `updateSetting`
- `stopPreview`
- `syncPreview`

각 타임라인은 이 공통 계약 위에 세션별 확장 메서드를 추가할 수 있다.

- 동작 타임라인: 파츠 필드 렌더링, 그룹 편집, 포즈 툴바 동기화
- 시각 효과 타임라인: 효과 필드 렌더링, 효과 이미지 미리보기, 효과 선택 초기화

### 3.5 동작/스킬 애니메이션 편집

현재 코드의 포즈 편집 UI는 장기적으로 동작/스킬 애니메이션 세션으로 확장되어야 한다.

동작과 스킬은 여러 파츠를 동시에 다루는 타임라인 대상이다.

기본 동작:

- idle
- run
- jump
- fall
- glide
- roll
- guard
- guardBreak
- hurt
- death

기본 전투/스킬:

- jumpAttack
- attack1
- attack2
- attack3

동작/스킬 편집 기능:

- 동작/스킬별 파츠 키프레임 편집
- 파츠별 위치/크기/회전/투명도
- 마스터 파츠 편집
- 여러 파츠 선택 후 그룹 편집
- 동작/스킬 재생과 미리보기
- 동작/스킬 프레임 복사/붙여넣기
- 동작/스킬별 이동 속도, 무적 시간, 쿨타임 같은 보정값 편집

중요한 방향:

캐릭터 셋업에서 선택한 동작과 스킬만 이 세션에 나타나야 한다.

관련 코드:

- `src/tuningPoseTimelineController.js`
- `src/tuningPoseTimelinePanelView.js`
- `src/tuningFieldValues.js`
- `src/tuningGroupPoseEdit.js`
- `src/puppetPlayerPose.js`

### 3.6 시각 효과/이펙트 편집

시각 효과는 단일 파츠처럼 다루는 타임라인 대상이다.

현재 시각 효과 슬롯:

- attack1
- attack2
- attack3
- jumpAttack
- 기타 동작/스킬별 시각 효과 슬롯

시각 효과 편집 기능:

- 위치
- 크기
- 회전
- 투명도
- 앵커
- 키프레임 복사/붙여넣기
- 재생/미리보기

중요한 방향:

시각 효과는 별도의 예외 시스템이 아니라 "타임라인을 가진 단일 파츠"처럼 다루는 것이 좋다.
시각 효과 이미지 선택과 업로드는 캐릭터 파트의 이펙트 세션 핵심 작업으로 본다.

관련 코드:

- `src/tuningEffectTimelineController.js`
- `src/tuningEffectTimelinePanelView.js`
- `src/effectVisualValues.js`
- `src/settingsEffectPreviewRenderer.js`
- `src/actorEffectsRenderer.js`

### 3.7 게임플레이 튜닝

제작툴은 애니메이션뿐 아니라 실제 게임 동작 수치도 조절해야 한다.

현재 주요 튜닝 항목:

- 캐릭터 전체 크기
- 캐릭터 HP
- 이동 속도
- 이동 가속도
- 이동 상하 움직임
- 점프 높이
- 활강 시간/낙하 속도
- 구르기 강도
- 구르기 무기 여부
- 구르기 쿨타임
- 구른 뒤 무적
- 공격 쿨타임
- 콤보 유지 시간
- 피격 무적
- 각 동작/스킬별 애니메이션 강도
- 각 동작/스킬별 이동 보정, 무적 시간, 쿨타임, 사용 가능 조건

관련 코드:

- `src/tuningMotionFieldRows.js`
- `src/tuningPanelControlSetup.js`
- `src/tuningControlValueTransforms.js`
- `src/playerDefaultTuning.js`
- `src/puppetPlayerActions.js`
- `src/runSpeedMotion.js`

### 3.8 전투/충돌 편집

전투/충돌 편집은 캐릭터 파트의 이펙트 세션 중심 기능이다.

필수 기능:

- 플레이어 피격 히트박스 편집
- 공격 히트박스 편집
- 점프 공격 히트박스 편집
- 구르기 히트박스 편집
- 경직/넉백/파편 힘 편집
- 디버그 박스 표시

미래 방향:

히트박스도 시간에 따라 바뀔 수 있으므로 타임라인 트랙으로 편입할 수 있어야 한다.
선택된 동작과 스킬마다 공격 히트박스와 활성 프레임을 따로 가질 수 있어야 한다.

관련 코드:

- `src/combatSystem.js`
- `src/combatGeometry.js`
- `src/settingsDebugRenderer.js`
- `src/tuningMotionFieldRows.js`

### 3.9 스테이지 편집

필수 기능:

- 배경 레이어 관리
- 배경 이미지 교체/새로고침
- 패럴랙스 속도
- 월드 경계
- 바닥 위치
- 오른쪽 진행 규칙
- 적 등장 규칙
- 적 종류와 성장 곡선
- 레벨업 조건
- 카드 보상 풀
- 카드 강화 효과
- 점수 계산 규칙
- 플레이 화면 미리보기 반영

현재는 배경 이미지 편집이 중심이지만, 장기적으로 스테이지 파트는 실제 게임 진행을 설계하는 영역이 되어야 한다.

스테이지 파트에서 다룰 게임 시스템:

- 기본은 자동 오른쪽 진행으로 한다. 입력으로 얼마나 보조할지는 스테이지 진행 규칙에서 별도로 정한다.
- 진행 중 적 등장
- 적 처치 수 또는 경험치 기반 레벨업
- 레벨업 시 네 장의 카드 보상 제시
- 카드 하나 선택 후 즉시 강화 적용
- 레벨/거리/시간에 따른 적 강화
- 처치 수, 진행 거리, 도달 레벨 기반 점수

관련 코드:

- `src/backgroundPanelController.js`
- `src/backgroundRenderer.js`
- `src/sceneSession.js`
- `src/clipBackgroundRuntime.js`

### 3.10 미리보기/디버그

제작툴은 항상 현재 편집 상태를 즉시 확인할 수 있어야 한다.

필수 기능:

- 선택한 캐릭터 미리보기
- 동작/스킬 애니메이션 미리보기
- 시각 효과 미리보기
- 히트박스 디버그 표시
- 앵커/관절 표시
- 캔버스 편집 핸들 표시
- 실제 게임 움직임 테스트

관련 코드:

- `src/previewState.js`
- `src/tuningTimelinePreview.js`
- `src/tuningPanelDebugView.js`
- `src/editHandleRenderer.js`
- `src/tuningEditHandleGeometry.js`

### 3.11 에셋 업로드/스토리지 기준

작업에 들어가는 모든 파일 에셋은 업로드 버튼을 통해 Firebase Storage에 반영되는 것을 최종 기준으로 한다.

대상 에셋:

- 캐릭터 PSD와 파츠 이미지
- 시각 효과 이미지
- 배경 PSD와 배경 레이어 이미지
- 나중에 추가될 사운드, 타일셋, 카메라 리소스 같은 제작 파일

기본 규칙:

- 업로드 버튼을 누르고 업로드가 성공한 순간 해당 에셋은 Firebase Storage의 기준 파일로 갱신된다.
- 로컬에서 선택한 파일은 업로드가 완료되기 전까지 임시 입력값이다.
- 업로드 성공 후에는 Storage URL, 경로, 버전 값을 설정 상태에 반영한다.
- 저장, 공유, `index.html` 플레이는 모두 Storage에 올라간 파일을 기준으로 동작해야 한다.
- 개발 중 로컬 watcher/API로 임시 미리보기를 할 수 있지만, 업로드가 성공한 뒤에는 Storage 참조가 기준이 되어야 한다.
- 같은 에셋을 다시 업로드하면 기존 Storage 에셋이 새 버전으로 갱신된 것으로 취급한다.
- 별도 버전 관리 기능을 만들기 전까지는 이전 에셋으로 되돌리는 기능을 보장하지 않는다.
- 캐시 때문에 예전 이미지가 보이지 않도록 업로드 시점의 버전 값이나 갱신 시간을 참조에 포함한다.
- 업로드 실패 시에는 기존 Storage 에셋과 설정 상태를 유지하고, 실패 상태를 UI에 명확히 보여준다.
- 새로고침 버튼은 로컬 watcher/API에서 다시 빌드한 에셋을 불러온 뒤 Storage와 설정 상태를 갱신하는 동작으로 정리한다.
- 초기화 버튼은 에셋 업로드가 아니라 설정 초기화이므로 업로드 버튼과 의미를 분리한다.

파트별 기준:

- 캐릭터/파츠: PSD 업로드 버튼은 캐릭터 원본 PSD와 생성된 파츠 이미지를 갱신하는 동작이다.
- 파츠 위치: 위치, 크기, 회전, 앵커 값은 파일 에셋이 아니라 설정 상태다. 이 값은 프로젝트 저장 업로드로 동기화한다.
- 시각 효과: 효과 업로드 버튼은 현재 선택한 시각 효과 슬롯의 이미지 에셋을 갱신하는 동작이다.
- 배경: 배경 업로드 버튼은 배경 PSD/레이어 이미지를 갱신하고, 갱신된 Storage 참조를 스테이지 설정에 반영하는 동작이다.

관련 코드:

- `src/firebaseStorageAssets.js`
- `src/characterPsdRuntime.js`
- `src/effectAssetRuntime.js`
- `src/clipBackgroundRuntime.js`
- `src/backgroundPanelController.js`
- `src/tuningPanel.js`

## 4. 현재 구조의 문제점

### 4.1 UI는 같지만 내부 시스템이 갈라져 있음

파츠 애니메이션 타임라인과 시각 효과 타임라인은 UI가 비슷하지만 내부 컨트롤러가 나뉘어 있다.

- `src/tuningPoseTimelineController.js`
- `src/tuningEffectTimelineController.js`

이 때문에 한쪽에서 고친 기능이 다른 쪽에 자동 반영되지 않는 문제가 생겼다.

최근 일부 공통화가 진행된 상태:

- 공통 컨트롤러 계약: `timelineControllerContract.js`
- 키프레임 추가/삭제: `timelineControllerActions.js`
- 선택/드래그 선택/드래그 이동: `timelineControllerActions.js`
- 복사/붙여넣기 코어: `timelineFrameClipboard.js`
- 렌더/드래그 바인딩: `timelineControllerView.js`
- 툴바 상태 동기화: `tuningTimelinePanelSync.js`
- 재생 설정 동기화: `tuningTimelinePanelSync.js`, `tuningTimelineDom.js`
- 미리보기 동기화 흐름: `tuningTimelinePreview.js`
- 시각 효과 타임라인 adapter: `effectTimelineAdapter.js`
- 파츠 애니메이션 타임라인 adapter: `poseTimelineAdapter.js`

아직 분리되어 있는 부분:

- 필드 렌더링
- adapter별 복사/붙여넣기 확장 로직
- 패널별 선택 상태 처리

### 4.2 `tuningPanel.js`가 너무 많은 책임을 가짐

`tuningPanel.js`는 패널 생성, 상태 연결, 선택 상태, undo, 컨트롤러 생성까지 여러 책임을 가진다.

현재는 일부 분리가 진행되어 500줄 안팎이지만, 앞으로 다시 커지면 유지보수가 어려워진다.

분리 후보:

- 패널 부트스트랩
- 컨트롤러 조립
- 파일/에셋 액션
- 전역 단축키
- 선택 상태 관리

### 4.3 게임 런타임과 툴 런타임의 경계가 약함

일부 코드는 게임 실행과 툴 편집 양쪽에서 사용된다.

좋은 방향:

- 게임 런타임: 실제 플레이에 필요한 코드
- 툴 런타임: 편집 UI와 캔버스 핸들
- 공통 엔진: 애니메이션 계산, 프레임 보간, 전투 판정 등

### 4.4 제작 흐름이 패널 기능 단위로 흩어져 있음

현재 UI는 캐릭터를 만드는 순서보다 기능별 패널에 가깝다.

이 때문에 사용자는 아래 작업 순서를 직접 기억해야 한다.

- 캐릭터 선택
- PSD 업로드
- 파츠 배치와 rig
- 캐릭터 크기/피격 히트박스/HP 설정
- 사용할 동작과 스킬 선택
- 동작 애니메이션 제작
- 이펙트, 공격 히트박스, 연출 설정
- 스테이지 배경, 적 성장, 카드 보상, 점수 규칙 설정

좋은 방향:

- 제작툴은 크게 캐릭터 파트와 스테이지 파트로 나뉘어야 한다.
- 캐릭터 파트는 셋업, 애니메이션, 이펙트 세션으로 나뉘어야 한다.
- 이후 세션은 앞 세션의 결과를 받아서 편집 대상을 자동으로 줄여야 한다.
- 선택한 동작과 스킬만 타임라인, 이펙트, 플레이 테스트에 나타나야 한다.
- 스테이지 파트는 배경 편집과 게임 진행 규칙 편집을 함께 가져야 한다.
- 사용자가 지금 무엇을 완성 중인지 세션 단위로 알 수 있어야 한다.

## 5. 목표 아키텍처

목표 구조:

```text
setting.html
  └─ Tool Shell
      ├─ Workflow Shell
      │   ├─ Character Part
      │   │   ├─ Setup Session
      │   │   ├─ Animation Session
      │   │   └─ Effect Session
      │   └─ Stage Part
      │       ├─ Background Session
      │       ├─ Progression Session
      │       ├─ Enemy Scaling Session
      │       └─ Card Reward Session
      ├─ Project System
      ├─ Actor Definition Editor
      ├─ Rig / Part Editor
      ├─ Action / Skill Registry
      ├─ Timeline Editor Core
      │   ├─ Pose Adapter
      │   ├─ Effect Adapter
      │   ├─ Hitbox Adapter
      │   └─ Future Track Adapter
      ├─ Combat / Hitbox Editor
      ├─ Gameplay Tuning
      ├─ Stage / Background Editor
      ├─ Stage Progression Editor
      ├─ Card Reward Editor
      ├─ Enemy Scaling Editor
      ├─ Asset Storage / Upload System
      ├─ Preview Runtime
      └─ Save / Load System

index.html
  └─ Game Runtime
      ├─ Actor Runtime
      ├─ Combat Runtime
      ├─ Animation Runtime
      ├─ Effect Runtime
      ├─ Scene Runtime
      ├─ Progression Runtime
      ├─ Card Reward Runtime
      ├─ Enemy Scaling Runtime
      └─ Input Runtime
```

## 6. Timeline Core 설계

타임라인 코어는 파츠 애니메이션, 시각 효과, 히트박스가 공유하는 시스템이다.

### 6.1 Timeline Core가 책임지는 것

- 프레임 수
- 슬롯 계산
- 키프레임 목록
- 키프레임 선택
- 빈 슬롯 선택
- 키프레임 추가/삭제
- 키프레임 이동
- 복사/붙여넣기
- 재생 설정
- 반복/한 번 재생
- undo 연결 지점
- UI 버튼 상태

### 6.2 Adapter가 책임지는 것

타임라인 대상마다 데이터 구조가 다르므로 adapter가 필요하다.

공통 adapter 형태:

```js
const adapter = {
  key(),
  ensureData(tuning),
  keyframes(tuning),
  currentFrame(context),
  readField(frame, prop),
  writeField(context, prop, value),
  addKeyframe(tuning, t),
  deleteKeyframe(tuning, id),
  moveKeyframe(tuning, id, t),
  copyFrame(context),
  pasteFrame(context, copiedFrame, targetId),
  renderFields(container, context),
  syncPreview(context),
};
```

파츠 애니메이션 adapter:

- 여러 파츠를 다룬다.
- 선택 파츠/다중 선택/마스터 파츠 개념이 있다.
- 그룹 편집이 필요하다.

시각 효과 adapter:

- 단일 파츠처럼 다룬다.
- 위치/크기/회전/투명도/앵커만 다룬다.
- 나중에 시각 효과 이미지 선택도 adapter에 포함할 수 있다.

히트박스 adapter:

- x/y/w/h/rot와 전투 수치를 다룬다.
- 공격 타이밍에 따라 켜짐/꺼짐이 필요할 수 있다.

## 7. 추천 폴더 구조

현재는 `src` 루트에 파일이 많다.

장기적으로 아래처럼 분류하는 것을 권장한다.

```text
src/
  engine/
    animation/
    combat/
    actor/
    scene/
    math/

  game/
    main.js
    input/
    hud/
    ranking/
    progression/
    card-reward/
    enemy-scaling/

  tool/
    shell/
    project/
    panel/
    canvas/
    timeline/
    adapters/
      poseTimelineAdapter.js
      effectTimelineAdapter.js
      hitboxTimelineAdapter.js
    workflow/
    actor/
    part/
    action-skill/
    effect/
    stage/
    card-reward/
    enemy-scaling/
    preview/

  shared/
    config/
    assets/
    storage/
    utils/
```

이 구조는 한 번에 이동하지 않는다.

우선 타임라인 기능은 `tool/timeline`, 캐릭터 제작 기능은 `tool/actor`, 스테이지 제작 기능은 `tool/stage` 성격의 모듈로 분리하고, 기존 파일은 단계적으로 이동한다.

## 8. 리팩토링 계획

### 8.1 1단계: 타임라인 공통 코어 강화

기술 리팩토링 관점에서 현재 진행 중인 단계다.

완료된 것:

- 공통 타임라인 컨트롤러 계약
- 공통 타임라인 컨트롤러 반환 형태 정리
- 공통 키프레임 추가/삭제 액션
- 공통 선택/드래그 액션
- 공통 선택 상태 반영/refresh 액션
- 공통 드래그 이동 preview 액션
- 공통 복사/붙여넣기 코어
- 공통 복사/초기화 액션
- 공통 붙여넣기 액션
- 공통 mutation 마무리 액션
- 공통 트랙 렌더 생성기
- 공통 드래그 바인더
- 공통 툴바 상태 동기화
- 공통 재생 설정 동기화
- 공통 미리보기 동기화 흐름
- 공통 미리보기 재생 시작/정지 헬퍼
- 공통 active time adapter 계약
- 공통 current frame adapter 계약
- selection 기반 frame write adapter 경계
- 1차 `createTimelineControllerCore()` 도입
- 공통 컨트롤러 반환 메서드 조립
- core 기반 keyframes/active time 헬퍼
- core 기반 frame selection 검사 헬퍼
- 시각 효과 타임라인 adapter
- 파츠 애니메이션 타임라인 adapter
- 공통 adapter 계약: `timelineAdapterContract.js`

다음 작업:

- 패널별 선택 상태 차이 정리
- `createTimelineControllerCore()` 적용 범위 확장

### 8.2 2단계: 시각 효과 타임라인을 adapter로 이전

시각 효과는 파츠 애니메이션보다 단순하므로 먼저 이전한다.

목표:

- `tuningEffectTimelineController.js`를 얇게 만든다.
- 시각 효과 데이터 접근은 `effectTimelineAdapter`로 이동한다.
- 기존 UI와 저장 구조는 유지한다.

현재 완료된 것:

- `src/effectTimelineAdapter.js`가 시각 효과 키, 설정, offset, 키프레임 접근을 맡는다.
- 시각 효과 키프레임 추가/삭제/이동/초기화/mutation 호출이 adapter 경계를 지난다.
- 시각 효과 preview 생성 입력이 adapter로 이동했다.
- 시각 효과 active time 계산이 adapter로 이동했다.
- 시각 효과 current frame 계산이 adapter로 이동했다.
- 시각 효과 프레임 복사/붙여넣기와 붙여넣기 대상 프레임 계산이 adapter 경계를 지난다.

남은 것:

- 선택 상태와 UI 후처리 차이를 단일 컨트롤러가 다룰 수 있는 형태로 정리한다.
- 단일 컨트롤러가 요구할 세부 adapter 메서드를 더 좁힌다.

### 8.3 3단계: 파츠 애니메이션 타임라인을 adapter로 이전

파츠 애니메이션은 다중 파츠/그룹 편집 때문에 더 복잡하다.

목표:

- `tuningPoseTimelineController.js`를 얇게 만든다.
- 파츠별 읽기/쓰기 로직을 `poseTimelineAdapter`로 이동한다.
- 그룹 편집은 파츠 애니메이션 adapter의 확장 기능으로 둔다.

현재 완료된 것:

- `src/poseTimelineAdapter.js`가 포즈 키, 설정, offset, 키프레임, 파츠 source 접근을 맡는다.
- 포즈 키프레임 추가/삭제/이동/초기화/mutation 호출이 adapter 경계를 지난다.
- 포즈 preview 생성 입력과 드래그 preview가 adapter로 이동했다.
- 포즈 active time 계산이 adapter로 이동했다.
- 포즈 current frame 계산이 adapter로 이동했다.
- 포즈 프레임 복사/붙여넣기와 붙여넣기 대상 프레임 계산이 adapter 경계를 지난다.

남은 것:

- 그룹 편집 선택 상태와 UI 후처리 차이를 단일 컨트롤러가 다룰 수 있는 형태로 정리한다.
- 단일 컨트롤러가 요구할 세부 adapter 메서드를 더 좁힌다.

### 8.4 4단계: 단일 Timeline Controller 도입

최종 목표:

```js
createTimelineController({
  adapter,
  elements,
  undo,
  preview,
});
```

파츠 애니메이션, 시각 효과, 히트박스는 모두 같은 컨트롤러를 사용하고 adapter만 다르게 한다.

### 8.5 5단계: 툴/게임 런타임 분리

목표:

- `src/tool`
- `src/game`
- `src/engine`
- `src/shared`

로 점진적으로 이동한다.

## 9. 앞으로 기능 추가 시 체크리스트

새 기능을 추가하기 전에 아래를 확인한다.

- 이 기능은 게임 런타임 기능인가, 툴 기능인가, 공통 엔진 기능인가?
- 이 기능은 캐릭터 파트인가, 스테이지 파트인가?
- 캐릭터 파트라면 셋업, 애니메이션, 이펙트 중 어느 세션에 속하는가?
- 스테이지 파트라면 배경, 진행 규칙, 적 성장, 카드 보상, 점수 중 어느 영역에 속하는가?
- 이 기능은 캐릭터 전체 값인가, 특정 동작/스킬에 속한 값인가?
- 이 기능은 한 번의 플레이 중 변하는 런타임 강화값인가, 제작툴에서 고정하는 기본값인가?
- 시간에 따라 바뀌는 값인가?
- 타임라인 트랙으로 표현할 수 있는가?
- 기존 adapter로 표현 가능한가?
- 새 adapter가 필요한가?
- 선택한 동작/스킬 목록에 따라 보이거나 숨겨져야 하는가?
- 카드 보상이나 적 성장 규칙에 의해 값이 변할 수 있는가?
- Firebase Storage에 올라간 에셋 참조가 필요한가?
- 저장 데이터 정규화가 필요한가?
- undo/redo가 필요한가?
- 미리보기가 필요한가?
- 디버그 표시가 필요한가?
- `index.html` 플레이 화면도 같은 데이터를 읽어야 하는가?
- 파츠 애니메이션과 시각 효과 중 한쪽에만 적용되는 중복 코드를 만들고 있지는 않은가?

## 10. 현재 리팩토링 우선순위

1. 캐릭터 파트와 스테이지 파트 기준으로 UI 흐름 재배치
2. 캐릭터 파트를 셋업, 애니메이션, 이펙트 세션으로 분리
3. 캐릭터 정의에 사용 동작/스킬 목록 추가
4. 스테이지 정의에 배경, 진행 규칙, 적 성장, 카드 보상, 점수 규칙 추가
5. 패널별 선택 상태 차이를 단일 컨트롤러 옵션으로 정리
6. 단일 `createTimelineController` 도입 준비
7. 히트박스 타임라인화 검토
8. `tuningPanel.js` 부트스트랩/조립 책임 분리
9. `src/tool`, `src/game`, `src/engine`, `src/shared` 구조로 점진 이동

## 11. 유지보수 경고

현재 파일 크기 기준으로 주의할 파일:

- `docs/tool-architecture.md`: 900줄 이상
- `setting.html`: 500줄 이상
- `src/tuningEffectTimelineController.js`: 500줄 안팎
- `src/tuningPanel.js`: 500줄 안팎
- `src/tuningPoseTimelineController.js`: 500줄 안팎

이 파일들은 계속 기능이 추가되면 AI 작업에서도 많은 컨텍스트를 요구한다.

권장:

- 문서는 개요, 워크플로우, 타임라인 설계, 리팩토링 계획으로 분리한다.
- CSS는 패널 영역별로 분리한다.
- `tuningPanel.js`는 조립/상태/버튼 액션을 분리한다.
- `setting.html`은 구조만 유지하고 반복 UI는 JS 렌더링 또는 템플릿화한다.

## 12. 결론

이 프로젝트의 중심은 더 이상 단순한 캐릭터 설정이 아니라 제작툴이다.

따라서 앞으로의 방향은 다음과 같다.

- 게임 결과물보다 제작툴 안정성을 먼저 본다.
- 제작툴은 캐릭터 파트와 스테이지 파트로 나눈다.
- 캐릭터 파트는 셋업, 애니메이션, 이펙트 순서로 진행한다.
- 스테이지 파트는 배경뿐 아니라 오른쪽 진행, 적 성장, 카드 보상, 점수 규칙을 포함한다.
- 파츠 애니메이션/시각 효과/히트박스는 모두 타임라인 대상이다.
- 타임라인은 반드시 하나의 공통 시스템으로 합친다.
- 각 기능의 차이는 adapter로 표현한다.
- 리팩토링은 작은 공통 코어부터 넓혀간다.
