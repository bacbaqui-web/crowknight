# 화약 공병장

사용자가 승인한 고글·그을린 투구·비대칭 어깨 보호대·화약통·폭탄 주머니 시안으로 만든 독립 보스입니다. 기존 보스의 올리브/아이보리/붉은 문양 망토를 유지합니다.

- `parts-sheet.png`: 승인된 image_gen 시안 원본. `source-crops.json`: 원본 픽셀 기준 분리 영역.
- 실행 부속 14개: 머리, 몸통, 망토, 목망토, 등짐, 좌우 위팔/아래팔/허벅지/정강이, 폭탄(weapon).
- `pouch.png`, `fuse.png`, `spark.png`: 추가 장식/효과 원본. 등짐의 도화선과 몸통 주머니는 해당 파츠에 포함되어 있습니다.
- `enemy.psd`: 새로 작성한 14개 레이어 PSD. 기존 PSD는 수정하지 않았습니다. 실행 PNG가 원본 시안 해상도를 보존하며 PSD는 게임 크기의 4배로 조립했습니다.
- `tools/author_powder_chief.py`: 새 보스의 관절/동작 데이터 저작. 실행하면 draft의 해당 보스 데이터만 다시 작성합니다.
- `dev/powder-chief/`: 실제 PuppetPlayer와 투사체 런타임을 사용하는 동작 확인 페이지.

## 첫 전투 패턴

체력 360, 최대 1명, 재등장 간격 30초. 380px 밖에서 천천히 접근하며 620px 이내에서 폭탄 투척을 우선합니다. 투척 동작 2.4초, 시작 간격 최소 4.8초. 폭탄은 발사 시점 목표 바닥 위치로 1초간 포물선 이동, 착지 후 1.25초 예고, 반경 85px 폭발(0.35초)을 실행합니다. 예고 도중 피해가 없고 폭발 한 번에 기본 피해 20을 한 번만 줍니다. 발사 후 목표를 추적하지 않습니다. 이미 던진 폭탄은 보스 사망 후에도 도화선이 끝나면 폭발하며 게임 초기화 시 제거됩니다. 쿼터뷰 깊이 및 점프 높이 회피를 지원합니다.

이번 구현은 단일 폭탄 패턴입니다. 연속 살포·화약통 돌진은 아직 추가하지 않았습니다.

## 이미지 생성 기록

Built-in image_gen으로 승인된 최종 시안을 생성하고, 구현에서는 그 이미지를 다시 그리지 않고 부속을 추출했습니다.

> Evolve the powder engineer commander with brass work goggles, soot-marked ochre bucket helmet and circle-slash faceplate, asymmetric shoulder armor, crossed leather straps, apron and bomb pouches. Preserve dark olive boss cape with ivory trim and faded brick-red markings. Huge powder barrel with bomb plaque, metal hoops and coiled fuse. Thick black outlined flat cutout art, assembled preview and separated puppet parts, transparent background.
