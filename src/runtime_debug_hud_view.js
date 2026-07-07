import { getRuntimeDebugState, isRuntimeDebugEnabled, toggleRuntimeDebugEnabled } from './runtime_debug_state.js';

export function createRuntimeDebugHud({ parent }) {
  const root = document.createElement('div');
  root.className = 'runtime-debug-root';

  const toggle = document.createElement('button');
  toggle.className = 'runtime-debug-toggle';
  toggle.type = 'button';
  toggle.title = '상호작용 디버그 표시';
  toggle.textContent = '디버그';
  toggle.addEventListener('click', () => {
    toggleRuntimeDebugEnabled();
    render();
  });

  const panel = document.createElement('section');
  panel.className = 'runtime-debug-hud';
  panel.setAttribute('aria-label', '런타임 디버그 HUD');

  root.append(toggle, panel);
  parent?.append(root);

  function render() {
    const enabled = isRuntimeDebugEnabled();
    root.classList.toggle('is-enabled', enabled);
    toggle.classList.toggle('is-on', enabled);
    toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    panel.hidden = !enabled;
    if (!enabled) return;

    const state = getRuntimeDebugState();
    panel.replaceChildren(renderSummary(state), renderEvents(state.events));
  }

  render();
  return { render };
}

function renderSummary(state) {
  const action = state.action;
  const flow = state.flow;
  const regions = state.regions;
  const last = state.last;
  const list = document.createElement('dl');
  list.className = 'runtime-debug-summary';
  appendDebugRow(list, '현재 액션', `${action.key} / ${action.name}`);
  appendDebugRow(list, 'Action Key', action.key);
  appendDebugRow(list, '트리거', action.trigger);
  appendDebugRow(list, '입력 방식', displayTriggerMode(action.triggerMode));
  appendDebugRow(list, '프레임', `${action.frame} / ${action.frameCount}`);
  appendDebugRow(list, '공격 ON 프레임', action.attackFrames);
  appendDebugRow(list, '공격 프레임 수', action.activeAttackFrameCount);
  appendDebugRow(list, 'Frame Value', displayAttackFrameValue(action.attackFrameValue));
  appendDebugRow(list, 'active', fallbackText(action.attackFrameValue?.active));
  appendDebugRow(list, 'attack', fallbackText(action.attackFrameValue?.attack));
  appendDebugRow(list, 'damage', fallbackText(action.attackFrameValue?.damage));
  appendDebugRow(list, 'knockback', fallbackText(action.attackFrameValue?.knockback));
  appendDebugRow(list, '실행 체인', displayFlowChain(flow));
  appendDebugRow(list, '실패 이유', displayFlowFailure(flow));
  appendDebugRow(list, '방향', displayFacing(action.facing));
  appendDebugRow(list, '공격 박스', renderStatusValue(regions.attackCreated));
  appendDebugRow(list, '피격 박스', renderStatusValue(regions.hurtCreated));
  appendDebugRow(list, '공격/피격 접촉', renderStatusValue(regions.attackHurtOverlap));
  appendDebugRow(list, '충돌/피격 접촉', renderStatusValue(regions.collisionHurtOverlap));
  appendDebugRow(list, '방어 성공', renderStatusValue(regions.guardBlock));
  appendDebugRow(list, '데미지', fallbackText(last.damage));
  appendDebugRow(list, '넉백', fallbackText(last.knockback));
  appendDebugRow(list, '생성 안 된 이유', fallbackText(displayReason(last.skipReason)));
  if (!action.hasAttackFrames) appendDebugNotice(list, '이 Action에는 공격 프레임이 없습니다.');
  return list;
}

function renderEvents(events) {
  const section = document.createElement('section');
  section.className = 'runtime-debug-event-section';
  const title = document.createElement('h3');
  title.textContent = '최근 판정 로그';
  const caption = document.createElement('p');
  caption.textContent = '최근 Runtime 판정 기록 1-10';
  const list = document.createElement('ol');
  list.className = 'runtime-debug-events';
  events.forEach((event) => {
    const item = document.createElement('li');
    item.textContent = eventCountLabel(eventLabel(event), event.count);
    list.append(item);
  });
  section.append(title, caption, list);
  return section;
}

function appendDebugRow(list, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const detail = document.createElement('dd');
  if (value && typeof value === 'object' && 'nodeType' in value) {
    detail.append(value);
  } else {
    detail.textContent = value;
  }
  list.append(term, detail);
}

function appendDebugNotice(list, message) {
  const detail = document.createElement('dd');
  detail.className = 'runtime-debug-notice';
  detail.textContent = message;
  list.append(document.createElement('dt'), detail);
}

function eventLabel(event) {
  const payload = event.payload || {};
  if (event.type === 'attack-region-created' || event.type === 'attack-region-skipped') {
    return `${displayEventType(event.type)} ${payload.key || ''} F${fallbackText(payload.frame)} active=${fallbackText(
      payload.rawActive
    )} attack=${fallbackText(payload.rawAttack)} ${displayReason(payload.reason)}`.trim();
  }
  if (event.type === 'attack-hurt-overlap' || event.type === 'collision-hurt-overlap') {
    return `${displayEventType(event.type)} 데미지=${fallbackText(payload.damage)}`;
  }
  if (event.type === 'attack-hurt-no-overlap') {
    return `${displayEventType(event.type)} ${displayReason(payload.reason)}`.trim();
  }
  if (event.type === 'trigger-failed' || event.type === 'action-start-failed') {
    return `${displayEventType(event.type)} ${fallbackText(payload.actionKey)} ${fallbackText(payload.reason)}`.trim();
  }
  if (event.type === 'trigger-input') {
    return `${displayEventType(event.type)} pressed=${fallbackText(payload.pressed)} held=${fallbackText(payload.keys)}`;
  }
  if (event.type === 'trigger-match') {
    return `${displayEventType(event.type)} ${fallbackText(payload.actionKey)} ${fallbackText(payload.consumed)}`;
  }
  if (event.type === 'action-start') {
    return `${displayEventType(event.type)} ${fallbackText(payload.actionKey)} 시작=${fallbackText(payload.started)}`;
  }
  if (event.type === 'damage-applied') {
    return `${displayEventType(event.type)} 데미지=${fallbackText(payload.damage)} HP=${fallbackText(payload.targetHp)}`;
  }
  return displayEventType(event.type);
}

function eventCountLabel(label, count) {
  const amount = Number(count || 1);
  return amount > 1 ? `${label} x ${amount}` : label;
}

function renderStatusValue(value) {
  const status = document.createElement('span');
  status.className = `runtime-debug-status ${value ? 'is-on' : 'is-off'}`;
  status.textContent = value ? '● ON' : '● OFF';
  return status;
}

function displayAttackFrameValue(value = {}) {
  const exists = value.hasSource ? '있음' : '없음';
  return `${value.key || 'attackInteractionObject'} / ${exists} / ${value.sourceType || '없음'}`;
}

function displayFlowChain(flow = {}) {
  const steps = [
    ['입력', flow.input],
    ['Trigger', flow.trigger],
    ['Action', flow.action],
    ['Frame', flow.frame],
    ['Attack ON', flow.attackOn],
    ['Region', flow.region],
    ['Damage', flow.damage],
  ];
  return steps.map(([label, passed]) => `${label} ${passed ? '✅' : '❌'}`).join(' → ');
}

function displayFlowFailure(flow = {}) {
  const order = ['input', 'trigger', 'action', 'frame', 'attackOn', 'region', 'damage'];
  const labels = {
    input: '입력 실패',
    trigger: 'Trigger 실패',
    action: 'Action 실패',
    frame: 'Frame 실패',
    attackOn: 'Attack ON 실패',
    region: 'Region 실패',
    damage: 'Damage 실패',
  };
  const failed = order.find((key) => flow[key] !== true);
  if (!failed) return '없음';
  return `${labels[failed]}: ${flow.reasons?.[failed] || '-'}`;
}

function fallbackText(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${value}`;
}

function displayTriggerMode(value) {
  if (value === 'tap') return '누름';
  if (value === 'press') return '누르는 중';
  if (value === 'pressLoop') return '누르는 동안 반복';
  return fallbackText(value);
}

function displayFacing(value) {
  if (value === 'left') return '왼쪽';
  if (value === 'right') return '오른쪽';
  return fallbackText(value);
}

function displayEventType(type) {
  const labels = {
    'hurt-region': '피격 박스 생성',
    'attack-region-created': '공격 박스 생성',
    'attack-region-skipped': '공격 박스 생성 안 됨',
    'attack-hurt-overlap': '공격/피격 접촉',
    'attack-hurt-no-overlap': '공격/피격 접촉 없음',
    'collision-hurt-overlap': '충돌/피격 접촉',
    'guard-block': '방어 성공',
    'collision-overlap': '충돌 접촉',
    'action-start': '액션 시작',
    'action-stop': '액션 종료',
    'trigger-failed': 'Trigger 실패',
    'trigger-input': '입력 감지',
    'trigger-match': 'Trigger 일치',
    'action-start-failed': 'Action 시작 실패',
    'damage-applied': '데미지 적용',
  };
  return labels[type] || type;
}

function displayReason(reason) {
  const labels = {
    'active=true and attack=true': '활성 + 공격 켜짐',
    'active=false and attack=false': '활성 꺼짐 + 공격 꺼짐',
    'active=false': '활성 꺼짐',
    'attack=false': '공격 꺼짐',
    'attack region was not created': '공격 박스가 생성되지 않음',
    'active=true attack=true but attack geometry is missing': '공격 설정은 켜졌지만 박스 위치를 만들 수 없음',
    'attack region and hurt region do not overlap': '공격 박스와 피격 박스가 닿지 않음',
    'attack/hurt overlap 없음': '공격 박스와 피격 박스가 닿지 않음',
  };
  return labels[reason] || reason || '';
}
