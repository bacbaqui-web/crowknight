export const EFFECT_EDITOR_MARKUP = `
<summary>8방향 이펙트 조절</summary>
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
      <canvas
        width="640"
        height="400"
        aria-label="화살표와 이펙트 히트박스 미리보기"
      ></canvas>
      <label class="effect-check"
        ><input type="checkbox" data-effect-all />8방향 동시 미리보기</label
      >
      <small
        >화살표 끝에 초승달이 놓입니다. 주황 테두리는 실제 히트박스입니다. 위쪽
        3방향은 캐릭터 뒤에 그립니다.</small
      >
    </div>
    <div class="effect-editor-controls">
      <div class="effect-compass" aria-label="조절할 이펙트 방향">
        <button
          type="button"
          data-effect-direction="up-left"
          aria-label="왼쪽 위 이펙트"
          aria-pressed="false"
        >
          ↖
        </button>
        <button
          type="button"
          data-effect-direction="up"
          aria-label="위쪽 이펙트"
          aria-pressed="false"
        >
          ↑
        </button>
        <button
          type="button"
          data-effect-direction="up-right"
          aria-label="오른쪽 위 이펙트"
          aria-pressed="false"
        >
          ↗
        </button>
        <button
          type="button"
          data-effect-direction="left"
          aria-label="왼쪽 이펙트"
          aria-pressed="false"
        >
          ←
        </button>
        <span>캐릭터</span>
        <button
          type="button"
          data-effect-direction="right"
          aria-label="오른쪽 이펙트"
          aria-pressed="true"
        >
          →
        </button>
        <button
          type="button"
          data-effect-direction="down-left"
          aria-label="왼쪽 아래 이펙트"
          aria-pressed="false"
        >
          ↙
        </button>
        <button
          type="button"
          data-effect-direction="down"
          aria-label="아래쪽 이펙트"
          aria-pressed="false"
        >
          ↓
        </button>
        <button
          type="button"
          data-effect-direction="down-right"
          aria-label="오른쪽 아래 이펙트"
          aria-pressed="false"
        >
          ↘
        </button>
      </div>
      <label class="effect-check"
        ><input type="checkbox" data-effect-linked checked />8방향 함께
        맞추기</label
      >
      <small>켜면 한 방향의 조정값을 나머지 방향에도 회전해 적용합니다.</small>
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
      <small
        >위치 0은 원본 간격입니다. 좌우 위치는 선택한 화살표의 옆
        방향입니다.</small
      >
      <label class="effect-check"
        ><input type="checkbox" data-effect-guides checked />플레이 중 8방향
        화살표 표시</label
      >
    </div>
  </div>
  <div class="effect-editor-actions">
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
