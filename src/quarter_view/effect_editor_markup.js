export const EFFECT_EDITOR_MARKUP = `
<summary>5방향 이펙트 조절</summary>
<div class="effect-editor-content">
  <div class="effect-editor-selects">
    <label
      >캐릭터<select
        data-effect-actor
        aria-label="이펙트 캐릭터"
        disabled
      ></select
    ></label>
    <label
      >공격<select data-effect-action aria-label="조절할 공격" disabled></select
    ></label>
  </div>
  <div class="effect-editor-grid">
    <div class="effect-preview-pane">
      <div class="effect-zoom-controls">
        <button type="button" data-effect-zoom-out aria-label="미리보기 축소">−</button>
        <input type="range" data-effect-zoom aria-label="미리보기 확대율" min="50" max="400" step="5" value="100" />
        <output data-effect-zoom-value>100%</output>
        <button type="button" data-effect-zoom-in aria-label="미리보기 확대">+</button>
        <button type="button" data-effect-fit>화면 맞춤</button>
      </div>
      <canvas
        width="640"
        height="400"
        aria-label="화살표와 이펙트 히트박스 미리보기"
      ></canvas>
      <button type="button" data-effect-play aria-pressed="false" disabled>▶ 반복 재생</button>
      <label class="effect-check"
        ><input type="checkbox" data-effect-all />5방향 동시 미리보기</label
      >
      <small
        >설정 화면과 같은 핸들입니다. 중심 점: 앵커 · 파란 원: 이동 · 노랑: 너비 · 초록: 높이 · 분홍: 전체 크기 · 보라 원: 회전. 휠로 확대하고 빈 곳 드래그, Alt+드래그 또는 마우스 가운데/오른쪽 드래그로 화면을 이동하세요. 주황 테두리는 히트박스입니다.</small
      >
    </div>
    <div class="effect-editor-controls">
      <div class="effect-compass" aria-label="조절할 이펙트 방향">
        <button type="button" data-effect-direction="up" aria-label="위쪽 이펙트" aria-pressed="false">↑</button>
        <button type="button" data-effect-direction="up-right" aria-label="오른쪽 위 이펙트" aria-pressed="false">↗</button>
        <button type="button" data-effect-direction="right" aria-label="오른쪽 이펙트" aria-pressed="true">→</button>
        <button type="button" data-effect-direction="down-right" aria-label="오른쪽 아래 이펙트" aria-pressed="false">↘</button>
        <button type="button" data-effect-direction="down" aria-label="아래쪽 이펙트" aria-pressed="false">↓</button>
      </div>
      <small>오른쪽이 기본입니다. 다른 방향에는 자동 회전해 적용하고, 각 방향에서는 추가 보정만 저장합니다. 왼쪽은 거울상입니다.</small>
      <p data-effect-edit-mode role="status"></p>
      <label class="effect-slider"
        >앞뒤 위치 (px)<input
          type="number"
          data-effect-field="distance"
          aria-label="이펙트 앞뒤 위치"
          min="-250"
          max="400"
          step="1"
          value="0" /><input
          type="range"
          data-effect-field="distance"
          aria-label="이펙트 앞뒤 위치 슬라이더"
          min="-250"
          max="400"
          step="1"
          value="0"
      /></label>
      <label class="effect-slider"
        >좌우 위치 (px)<input
          type="number"
          data-effect-field="side"
          aria-label="이펙트 좌우 위치"
          min="-250"
          max="250"
          step="1"
          value="0" /><input
          type="range"
          data-effect-field="side"
          aria-label="이펙트 좌우 위치 슬라이더"
          min="-250"
          max="250"
          step="1"
          value="0"
      /></label>
      <label class="effect-slider"
        >너비 (%)<input
          type="number"
          data-effect-field="width"
          aria-label="이펙트 너비"
          min="25"
          max="300"
          step="1"
          value="100" /><input
          type="range"
          data-effect-field="width"
          aria-label="이펙트 너비 슬라이더"
          min="25"
          max="300"
          step="1"
          value="100"
      /></label>
      <label class="effect-slider"
        >높이 (%)<input
          type="number"
          data-effect-field="height"
          aria-label="이펙트 높이"
          min="25"
          max="300"
          step="1"
          value="100" /><input
          type="range"
          data-effect-field="height"
          aria-label="이펙트 높이 슬라이더"
          min="25"
          max="300"
          step="1"
          value="100"
      /></label>
      <label class="effect-slider">회전각 (°)<input type="number" data-effect-field="rotation" aria-label="이펙트 회전각 (°)" min="-180" max="180" step="1" value="0" /><input type="range" data-effect-field="rotation" aria-label="이펙트 회전각 (°) 슬라이더" min="-180" max="180" step="1" value="0" /></label>
      <label class="effect-slider">앵커 앞뒤 (px)<input type="number" data-effect-field="anchorX" aria-label="이펙트 앵커 앞뒤 (px)" min="-300" max="300" step="1" value="0" /><input type="range" data-effect-field="anchorX" aria-label="이펙트 앵커 앞뒤 (px) 슬라이더" min="-300" max="300" step="1" value="0" /></label>
      <label class="effect-slider">앵커 위아래 (px)<input type="number" data-effect-field="anchorY" aria-label="이펙트 앵커 위아래 (px)" min="-300" max="300" step="1" value="0" /><input type="range" data-effect-field="anchorY" aria-label="이펙트 앵커 위아래 (px) 슬라이더" min="-300" max="300" step="1" value="0" /></label>
      <small
        >위치 0은 원본 간격입니다. 좌우 위치는 선택한 화살표의 옆
        방향입니다. 앵커 0은 이미지 중심이며, 앵커가 화살표 끝에 놓입니다. 앵커 앞뒤 +는 이미지 앞쪽, 위아래 +는 위쪽입니다. 회전·크기는 이 점을 기준으로 적용됩니다.</small
      >
      <label class="effect-slider">공중 높이 (px)<input type="number" data-effect-field="elevation" aria-label="이펙트 공중 높이" min="-300" max="300" step="1" value="0" /><input type="range" data-effect-field="elevation" aria-label="이펙트 공중 높이 슬라이더" min="-300" max="300" step="1" value="0" /></label>
      <label class="effect-check"
        ><input type="checkbox" data-effect-guides checked />플레이 중 8방향
        화살표 표시</label
      >
    </div>
  </div>
  <div class="effect-editor-actions">
    <button type="button" data-effect-reset-adjustment>이 방향 보정 초기화</button>
    <button type="button" data-effect-reset>이 공격 초기화</button>
    <button type="button" data-effect-export>설정 내보내기</button>
    <button type="button" data-effect-load>설정 불러오기</button>
    <input
      type="file"
      data-effect-import
      accept="application/json,.json"
      hidden
    />
  </div>
  <p data-effect-status role="status">
    PLAY 후 조절하세요. 설정은 이 브라우저에 자동 저장됩니다.
  </p>
</div>
`;
