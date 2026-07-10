export function renderStageRulesPanels(panel, { definitions = STAGE_RULES_PANEL_DEFINITIONS } = {}) {
  const mount = panel.querySelector('#stageRulesPanelMount');
  if (!mount) return;

  mount.replaceChildren(...definitions.map(createStageRulesPanel));
}

const STAGE_RULES_PANEL_DEFINITIONS = Object.freeze([
  {
    key: 'worldPhysics',
    title: '스테이지 물리',
    fields: [
      {
        type: 'number',
        id: 'stageFloorScreenY',
        label: '카메라 높이',
        min: 0,
        max: 4000,
        step: 1,
        unit: 'px',
        title: '플레이어가 화면 세로에서 보일 기준 위치입니다.',
      },
      {
        type: 'number',
        id: 'worldPhysicsGravity',
        label: '중력',
        min: 0,
        max: 100,
        step: 0.05,
        unit: 'px/f²',
        title: '매 Action Timeline frame마다 Y velocity에 더해지는 값입니다.',
      },
      {
        type: 'number',
        id: 'worldPhysicsInertia',
        label: '관성',
        min: 0,
        max: 300,
        step: 1,
        unit: 'frame',
        title: '입력이나 힘이 멈춘 뒤 velocity가 0이 되기까지 걸리는 frame 수입니다.',
      },
      {
        type: 'number',
        id: 'worldPhysicsAirControl',
        label: '공중 조작',
        min: 0,
        max: 100,
        step: 0.05,
        unit: 'px/f',
        title: '공중에서 좌우 입력이 있을 때 X velocity에 더하는 값입니다.',
      },
      {
        type: 'number',
        id: 'worldPhysicsCameraShakePower',
        label: '흔들림 강도',
        min: 0,
        max: 100,
        step: 0.5,
        unit: '',
        title: '공격박스와 피격박스가 닿았을 때 적용할 흔들림 강도입니다.',
      },
      {
        type: 'number',
        id: 'worldPhysicsCameraShakeFrames',
        label: '흔들림 시간',
        min: 0,
        max: 120,
        step: 1,
        unit: 'frame',
        title: '공격박스와 피격박스가 닿았을 때 흔들림이 유지되는 frame 수입니다.',
      },
      {
        type: 'checkbox',
        id: 'worldPhysicsCameraShakeDecay',
        label: '점점 약해짐',
        title: '흔들림이 시간이 지나며 약해지게 합니다.',
      },
    ],
  },
  {
    key: 'difficultyIncrease',
    title: '난이도 증가',
    fields: [
      {
        type: 'number',
        id: 'difficultyBossKillInterval',
        label: '단계 상승 보스 처치 수',
        min: 1,
        max: 999,
        step: 1,
      },
      {
        type: 'number',
        id: 'difficultyBossHpPerLevel',
        label: '단계당 보스 HP 증가',
        min: 0,
        max: 999,
        step: 1,
      },
      {
        type: 'number',
        id: 'difficultySwordmanSpawnPerLevel',
        label: '칼잡이 단계당 동시 등장 증가',
        min: 0,
        max: 200,
        step: 1,
      },
      {
        type: 'number',
        id: 'difficultyArcherSpawnPerLevel',
        label: '활잡이 단계당 동시 등장 증가',
        min: 0,
        max: 200,
        step: 1,
      },
      {
        type: 'text',
        id: 'difficultyWarningText',
        label: '경고 문구',
        maxLength: 40,
      },
    ],
  },
  {
    key: 'enemyAi',
    title: 'Enemy AI',
    fields: [
      {
        type: 'mount',
        id: 'enemyAiPanelMount',
      },
    ],
  },
]);

function createStageRulesPanel(definition) {
  const section = document.createElement('section');
  section.className = 'setting-section';
  section.dataset.collapsible = '';
  section.dataset.section = definition.key;

  const toggle = document.createElement('button');
  toggle.className = 'section-toggle';
  toggle.type = 'button';
  toggle.textContent = definition.title;

  const content = document.createElement('div');
  content.className = 'section-content';
  content.append(...definition.fields.map(createFieldElement));

  section.append(toggle, content);
  return section;
}

function createFieldElement(field) {
  if (field.type === 'select') return createSelectField(field);
  if (field.type === 'rangeNumber') return createRangeNumberField(field);
  if (field.type === 'checkbox') return createCheckboxField(field);
  if (field.type === 'number') return createNumberField(field);
  if (field.type === 'text') return createTextField(field);
  if (field.type === 'mount') return createMountField(field);
  if (field.type === 'summary') return createSummaryField(field);
  return document.createTextNode('');
}

function createSelectField(field) {
  const row = document.createElement('label');
  row.className = 'select-row';

  const label = document.createElement('span');
  label.textContent = field.label;

  const select = document.createElement('select');
  select.id = field.id;
  select.append(...field.options.map(createOption));

  row.append(label, select);
  return row;
}

function createRangeNumberField(field) {
  const row = document.createElement('label');
  row.className = 'setting-row';

  const label = document.createElement('span');
  label.textContent = field.label;

  const range = createNumberInput({
    id: field.rangeId,
    type: 'range',
    min: field.min,
    max: field.max,
    step: field.step,
  });
  const number = createNumberInput({
    id: field.numberId,
    type: 'number',
    min: field.min,
    max: field.max,
    step: field.step,
  });

  row.append(label, range, number);
  return row;
}

function createCheckboxField(field) {
  const row = document.createElement('label');
  row.className = 'select-row';
  row.title = field.title || field.label;

  const label = document.createElement('span');
  label.textContent = field.label;

  const input = document.createElement('input');
  input.id = field.id;
  input.type = 'checkbox';

  row.append(label, input);
  return row;
}

function createNumberField(field) {
  const row = document.createElement('label');
  row.className = 'select-row';
  if (field.unit) row.classList.add('has-unit');

  const label = document.createElement('span');
  label.textContent = field.label;

  const input = createNumberInput({
    id: field.id,
    type: 'number',
    min: field.min,
    max: field.max,
    step: field.step,
  });

  row.append(label, input);
  if (field.unit) {
    const unit = document.createElement('span');
    unit.className = 'field-unit-label';
    unit.textContent = field.unit;
    unit.title = field.title || field.unit;
    unit.setAttribute('aria-label', unit.title);
    row.append(unit);
  }
  return row;
}

function createTextField(field) {
  const row = document.createElement('label');
  row.className = 'select-row';

  const label = document.createElement('span');
  label.textContent = field.label;

  const input = document.createElement('input');
  input.id = field.id;
  input.type = 'text';
  if (field.maxLength) input.maxLength = Number(field.maxLength);

  row.append(label, input);
  return row;
}

function createSummaryField(field) {
  const summary = document.createElement('div');
  summary.id = field.id;
  summary.className = 'part-fields';
  return summary;
}

function createMountField(field) {
  const mount = document.createElement('div');
  mount.id = field.id;
  mount.className = 'stage-ai-panel-mount';
  return mount;
}

function createOption(optionDefinition) {
  const option = document.createElement('option');
  option.value = optionDefinition.value;
  option.textContent = optionDefinition.label;
  return option;
}

function createNumberInput({ id, type, min, max, step }) {
  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  return input;
}
