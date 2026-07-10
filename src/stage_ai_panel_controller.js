import { actionDescriptors } from './action_authoring_data.js';
import { normalizeCharacterGroup } from './character_group_data.js';
import { resolveEnemyAiSettings, writeEnemyAiSettings } from './enemy_ai_settings_helper.js';

const ENEMY_AI_GROUPS = new Set(['mobs', 'bosses']);

export function createStageAiPanelController({
  actors = [],
  elements = {},
  beginChange = () => {},
  commitChange = () => {},
  saveState = () => {},
  stageRulesController = null,
} = {}) {
  const mount = elements.enemyAiPanelMount;
  let activeGuide = null;

  mount?.addEventListener('input', handleFieldInput);
  mount?.addEventListener('change', handleFieldChange);
  mount?.addEventListener('click', handlePanelClick);

  function sync() {
    render();
  }

  function getActiveGuide() {
    if (!activeGuide) return null;
    const actor = actors.find((item) => item.id === activeGuide.actorId);
    if (!actor) return null;
    const settings = actor.tuning?.actionSettings?.[activeGuide.actionKey] || {};
    const ai = resolveEnemyAiSettings(settings);
    if (!ai.enabled) return null;
    return {
      actor,
      actionKey: activeGuide.actionKey,
      minRange: ai.minRange,
      maxRange: ai.maxRange,
    };
  }

  function render() {
    if (!mount) return;
    const enemyActors = actors.filter(isEnemyAiActor);
    if (!enemyActors.length) {
      mount.replaceChildren(emptyMessage('AI를 설정할 잡몹/보스 캐릭터가 없습니다.'));
      return;
    }

    mount.replaceChildren(...enemyActors.map(renderActorAiBlock));
  }

  function createSpawnNumberInput(actorId, labelText, field, value, { min, max, step }) {
    const label = document.createElement('label');
    label.className = 'stage-ai-spawn-field';
    label.addEventListener('click', (event) => event.stopPropagation());

    const text = document.createElement('span');
    text.textContent = labelText;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(value ?? 0);
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.dataset.enemyActorSpawnField = field;
    input.dataset.actorId = actorId;

    label.append(text, input);
    return label;
  }

  function renderActorAiBlock(actor) {
    const block = document.createElement('section');
    block.className = 'stage-ai-actor';
    block.dataset.actorId = actor.id;

    const actorHeader = document.createElement('div');
    actorHeader.className = 'stage-ai-actor-header';

    const title = document.createElement('h3');
    title.className = 'stage-ai-actor-title';
    title.textContent = actor.name || actor.id;

    const spawnRule = stageRulesController?.getEnemyActorSpawnRule?.(actor.id) || {};
    const spawnFields = document.createElement('div');
    spawnFields.className = 'stage-ai-actor-spawn-fields';
    spawnFields.append(
      createSpawnNumberInput(actor.id, '동시', 'maxAlive', spawnRule.maxAlive, { min: 0, max: 200, step: 1 }),
      createSpawnNumberInput(actor.id, '리스폰', 'intervalSec', spawnRule.intervalSec, {
        min: 0.1,
        max: 300,
        step: 0.1,
      })
    );

    actorHeader.append(title, spawnFields);

    const table = document.createElement('div');
    table.className = 'stage-ai-action-table';
    table.append(renderHeaderRow(), ...actionDescriptors(actor.tuning).map((action) => renderActionRow(actor, action)));

    block.append(actorHeader, table);
    return block;
  }

  function renderHeaderRow() {
    const row = document.createElement('div');
    row.className = 'stage-ai-row stage-ai-header-row';
    ['Action', 'AI', 'Min', 'Max', 'Cool', '%', 'Prio'].forEach((label) => {
      const cell = document.createElement('span');
      cell.textContent = label;
      row.append(cell);
    });
    return row;
  }

  function renderActionRow(actor, action) {
    const settings = actor.tuning?.actionSettings?.[action.key] || {};
    const ai = resolveEnemyAiSettings(settings);
    const row = document.createElement('div');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.className = 'stage-ai-row stage-ai-action-row';
    row.dataset.actorId = actor.id;
    row.dataset.actionKey = action.key;
    row.classList.toggle('is-selected', activeGuide?.actorId === actor.id && activeGuide?.actionKey === action.key);

    const name = document.createElement('span');
    name.className = 'stage-ai-action-name';
    name.textContent = action.name;
    row.append(name);

    row.append(
      createCheckbox(actor.id, action.key, 'enabled', ai.enabled),
      createNumberInput(actor.id, action.key, 'minRange', ai.minRange, { min: 0, max: 99999, step: 1 }),
      createNumberInput(actor.id, action.key, 'maxRange', ai.maxRange, { min: 0, max: 99999, step: 1 }),
      createNumberInput(actor.id, action.key, 'cooldown', ai.cooldown, { min: 0, max: 999, step: 0.1 }),
      createNumberInput(actor.id, action.key, 'chance', ai.chance, { min: 0, max: 100, step: 1 }),
      createNumberInput(actor.id, action.key, 'priority', ai.priority, { min: -9999, max: 9999, step: 1 })
    );

    return row;
  }

  function createCheckbox(actorId, actionKey, field, value) {
    const label = document.createElement('label');
    label.className = 'stage-ai-checkbox-cell';
    label.addEventListener('click', (event) => event.stopPropagation());

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    setFieldDataset(input, actorId, actionKey, field);

    label.append(input);
    return label;
  }

  function createNumberInput(actorId, actionKey, field, value, { min, max, step }) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(value);
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.addEventListener('click', (event) => event.stopPropagation());
    setFieldDataset(input, actorId, actionKey, field);
    return input;
  }

  function setFieldDataset(input, actorId, actionKey, field) {
    input.dataset.aiField = field;
    input.dataset.actorId = actorId;
    input.dataset.actionKey = actionKey;
  }

  function handlePanelClick(event) {
    const row = event.target.closest?.('[data-action-key][data-actor-id]');
    if (!row || row.dataset.aiField) return;
    activeGuide = {
      actorId: row.dataset.actorId,
      actionKey: row.dataset.actionKey,
    };
    syncSelectedRows();
  }

  function handleFieldInput(event) {
    const spawnInput = event.target.closest?.('[data-enemy-actor-spawn-field]');
    if (spawnInput) {
      updateSpawnField(spawnInput, { commit: false });
      return;
    }
    const input = event.target.closest?.('[data-ai-field]');
    if (!input) return;
    updateField(input, { commit: false });
  }

  function handleFieldChange(event) {
    const spawnInput = event.target.closest?.('[data-enemy-actor-spawn-field]');
    if (spawnInput) {
      updateSpawnField(spawnInput, { commit: true });
      return;
    }
    const input = event.target.closest?.('[data-ai-field]');
    if (!input) return;
    updateField(input, { commit: true });
  }

  function updateSpawnField(input, { commit = false } = {}) {
    const field = input.dataset.enemyActorSpawnField;
    const actorId = input.dataset.actorId;
    if (!field || !stageRulesController) return;
    beginChange();
    stageRulesController.setEnemyActorSpawnRule?.(actorId, { [field]: input.value });
    saveState();
    if (commit) commitChange();
  }

  function updateField(input, { commit = false } = {}) {
    const actor = actors.find((item) => item.id === input.dataset.actorId);
    const actionKey = input.dataset.actionKey;
    const field = input.dataset.aiField;
    if (!actor || !actionKey || !field) return;

    beginChange();
    const value = input.type === 'checkbox' ? input.checked : input.value;
    writeEnemyAiSettings(actor.tuning, actionKey, { [field]: value });
    actor.player?.applyTuning?.(actor.tuning);
    activeGuide = { actorId: actor.id, actionKey };
    saveState();
    syncSelectedRows();
    if (commit) commitChange();
  }

  function syncSelectedRows() {
    mount?.querySelectorAll('.stage-ai-action-row').forEach((row) => {
      row.classList.toggle(
        'is-selected',
        row.dataset.actorId === activeGuide?.actorId && row.dataset.actionKey === activeGuide?.actionKey
      );
    });
  }

  return {
    getActiveGuide,
    sync,
  };
}

function isEnemyAiActor(actor) {
  return ENEMY_AI_GROUPS.has(normalizeCharacterGroup(actor?.group, ''));
}

function emptyMessage(text) {
  const message = document.createElement('div');
  message.className = 'part-empty';
  message.textContent = text;
  return message;
}
