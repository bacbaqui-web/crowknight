import { attackPlane, normalizeAttackPlane } from '../attack_plane_helper.js';

const STORAGE_KEY = 'crowKnight.quarterAttackPlanes.v1';
export function readAttackPlaneOverrides(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    const result = {};
    for (const [id, entries] of Object.entries(saved)) {
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
      result[id] = Object.fromEntries(
        Object.entries(entries).map(([key, value]) => [key, normalizeAttackPlane(value)])
      );
    }
    return result;
  } catch {
    return {};
  }
}
export function createAttackSettingsView({ panel, onOpen, onChange, storage = localStorage }) {
  const actorSelect = panel.querySelector('[data-attack-actor]');
  const actionSelect = panel.querySelector('[data-attack-action]');
  const planeSelect = panel.querySelector('[data-attack-plane]');
  const status = panel.querySelector('[data-attack-status]');
  let actors = [],
    choices = [],
    overrides = readAttackPlaneOverrides(storage),
    persisted = true;
  const selectedActor = () => choices.find((actor) => actor.id === actorSelect.value);
  function option(select, value, label) {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = label;
    select.append(element);
  }
  function syncMode() {
    const actor = selectedActor(),
      key = actionSelect.value;
    planeSelect.disabled = !actor || !key;
    if (!actor || !key) {
      status.textContent = 'PLAY 후 공격을 선택하세요.';
      return;
    }
    planeSelect.value = normalizeAttackPlane(
      overrides[actor.id]?.[key] ?? actor.player.actionSettings?.[key]?.quarterAttackPlane
    );
    const mode = attackPlane(actor, key);
    status.textContent = `${mode === 'height' ? '높이 공격: 공격과 상대의 높이가 겹칠 때 적중합니다.' : '지면 공격: 공격 궤적을 바닥에 눕히고 높이를 무시합니다.'} ${persisted ? '선택은 이 브라우저의 시험장에 저장됩니다.' : '브라우저 저장을 사용할 수 없어 이번 실행에만 적용됩니다.'}`;
  }
  function syncActions() {
    const actor = selectedActor();
    actionSelect.replaceChildren();
    for (const action of actor?.player.customActions || []) {
      const settings = actor.player.actionSettings?.[action.key];
      if (settings?.group === 'attack' || settings?.formulas?.some((f) => f.type === 'projectile' && f.enabled))
        option(actionSelect, action.key, action.name);
    }
    actionSelect.disabled = !actionSelect.options.length;
    syncMode();
  }
  function apply() {
    for (const actor of actors) {
      actor.quarterAttackPlanes = overrides[actor.id] || {};
      actor.previousAttackRegions = [];
      actor.quarterAttackSerial = null;
      actor.quarterAttackRegions = [];
      actor.quarterAttackRawRegions = null;
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      persisted = true;
    } catch {
      persisted = false;
    }
    onChange();
  }
  actorSelect.addEventListener('change', syncActions);
  actionSelect.addEventListener('change', syncMode);
  planeSelect.addEventListener('change', () => {
    const actor = selectedActor();
    if (!actor) return;
    overrides[actor.id] ||= {};
    overrides[actor.id][actionSelect.value] = normalizeAttackPlane(planeSelect.value);
    apply();
    syncMode();
    planeSelect.blur();
  });
  panel.querySelector('[data-attack-reset]').addEventListener('click', () => {
    overrides = {};
    apply();
    syncMode();
  });
  panel.addEventListener('toggle', () => {
    if (panel.open) onOpen();
  });
  return {
    reset(nextActors) {
      actors = nextActors;
      choices = [...new Map(actors.map((actor) => [actor.id, actor])).values()];
      actorSelect.replaceChildren();
      actorSelect.disabled = !choices.length;
      for (const actor of actors) actor.quarterAttackPlanes = overrides[actor.id] || {};
      for (const actor of choices) option(actorSelect, actor.id, actor.name);
      syncActions();
    },
  };
}
