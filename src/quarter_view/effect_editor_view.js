import { bindEffectHandles } from './effect_editor_handles.js';
import { EFFECT_EDITOR_MARKUP } from './effect_editor_markup.js';
import { createEffectEditorPreview } from './effect_editor_preview.js';
import {
  createEffectProfile,
  updateEffectProfile,
  linkEffectProfile,
  readEffectLayoutState,
  saveEffectLayoutState,
  normalizeEffectLayoutState,
} from './effect_layout.js';

export function createEffectEditorView({ panel, onOpen, onChange, getAssets, storage = localStorage }) {
  panel.innerHTML = EFFECT_EDITOR_MARKUP;
  const actorSelect = panel.querySelector('[data-effect-actor]'),
    actionSelect = panel.querySelector('[data-effect-action]');
  const link = panel.querySelector('[data-effect-linked]'),
    guides = panel.querySelector('[data-effect-guides]');
  const all = panel.querySelector('[data-effect-all]'),
    status = panel.querySelector('[data-effect-status]');
  const fields = [...panel.querySelectorAll('[data-effect-field]')];
  const preview = createEffectEditorPreview(panel.querySelector('canvas'));
  let actors = [],
    choices = [],
    state = readEffectLayoutState(storage),
    direction = 'right',
    scheduled = false;
  const selectedActor = () => choices.find((actor) => actor.id === actorSelect.value);
  const sourceId = (actor) => actor.runtimeSourceActorId || actor.id;
  const selectedProfile = () => {
    const actor = selectedActor();
    if (!actor || !actionSelect.value) return null;
    const id = sourceId(actor);
    state.profiles[id] ||= {};
    return (state.profiles[id][actionSelect.value] ||= createEffectProfile());
  };
  function schedulePreview() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (panel.open) preview.draw(selectedActor(), actionSelect.value, direction, all.checked, getAssets());
    });
  }
  function attachActor(actor) {
    const id = sourceId(actor);
    state.profiles[id] ||= {};
    actor.quarterEffectLayouts = state.profiles[id];
    actor.quarterEffectGuides = state.guides;
  }
  function attach() {
    for (const actor of actors) attachActor(actor);
  }
  function apply() {
    attach();
    const saved = saveEffectLayoutState(storage, state);
    status.textContent = saved
      ? '이 브라우저에 자동 저장됨 · 실제 히트박스도 함께 적용됩니다.'
      : '브라우저 저장 불가 · 내보내기로 설정을 보관하세요.';
    onChange(actors);
    schedulePreview();
  }
  function sync(skipField) {
    const profile = selectedProfile();
    for (const field of fields) {
      field.disabled = !profile;
      const key = field.dataset.effectField;
      const value = profile?.directions[direction]?.[key] ?? (key === 'width' || key === 'height' ? 1 : 0);
      if (field !== skipField)
        field.value = key === 'width' || key === 'height' ? Math.round(value * 100) : Math.round(value * 10) / 10;
    }
    panel.querySelector('[data-effect-reset]').disabled = !profile;
    link.disabled = !profile;
    link.checked = profile?.linked !== false;
    guides.checked = state.guides;
    for (const button of panel.querySelectorAll('[data-effect-direction]')) {
      button.disabled = !profile;
      button.setAttribute('aria-pressed', String(button.dataset.effectDirection === direction));
    }
    schedulePreview();
  }
  bindEffectHandles(panel.querySelector('canvas'), preview, (patch) => {
    const profile = selectedProfile();
    if (!profile) return;
    updateEffectProfile(profile, direction, patch);
    sync();
    apply();
  });
  function option(select, value, text) {
    const item = document.createElement('option');
    item.value = value;
    item.textContent = text;
    select.append(item);
  }
  function syncActions() {
    const actor = selectedActor();
    actionSelect.replaceChildren();
    for (const action of actor?.player.customActions || [])
      if (
        actor.player.actionSettings[action.key]?.group === 'attack' &&
        !actor.player.actionSettings[action.key]?.formulas?.some(
          (formula) => formula.type === 'projectile' && formula.enabled
        )
      )
        option(actionSelect, action.key, action.name);
    actionSelect.disabled = !actionSelect.options.length;
    if (actionSelect.disabled)
      status.textContent = '화살 판정은 투사체를 따릅니다. 조절할 근접 공격이 있는 캐릭터를 선택하세요.';
    else status.textContent = '설정은 이 브라우저에 저장됩니다. 조절 후 패널을 닫고 P로 재개하세요.';
    sync();
  }
  actorSelect.addEventListener('change', syncActions);
  actionSelect.addEventListener('change', sync);
  panel.querySelectorAll('[data-effect-direction]').forEach((button) =>
    button.addEventListener('click', () => {
      direction = button.dataset.effectDirection;
      sync();
    })
  );
  for (const field of fields)
    field.addEventListener('input', () => {
      const profile = selectedProfile();
      if (!profile || field.value === '') return;
      const key = field.dataset.effectField,
        value = Number(field.value);
      if (!Number.isFinite(value)) return;
      updateEffectProfile(profile, direction, { [key]: key === 'width' || key === 'height' ? value / 100 : value });
      sync(field.type === 'number' ? field : null);
      apply();
    });
  for (const field of fields) field.addEventListener('change', () => sync());
  link.addEventListener('change', () => {
    const profile = selectedProfile();
    if (profile) {
      linkEffectProfile(profile, direction, link.checked);
      sync();
      apply();
    }
  });
  guides.addEventListener('change', () => {
    state.guides = guides.checked;
    apply();
  });
  all.addEventListener('change', schedulePreview);
  panel.querySelector('[data-effect-reset]').addEventListener('click', () => {
    const actor = selectedActor();
    if (!actor) return;
    state.profiles[sourceId(actor)][actionSelect.value] = createEffectProfile();
    sync();
    apply();
  });
  panel.querySelector('[data-effect-export]').addEventListener('click', () => {
    const { URL, Blob } = window;
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'crow-knight-effect-layouts.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  const input = panel.querySelector('[data-effect-import]');
  panel.querySelector('[data-effect-load]').addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const value = JSON.parse(await file.text());
      if (value?.version !== 1 || !value.profiles) throw new Error('format');
      state = normalizeEffectLayoutState(value);
      attach();
      sync();
      apply();
    } catch {
      status.textContent = '설정 파일을 읽지 못했습니다. 내보낸 JSON 파일을 선택하세요.';
    } finally {
      input.value = '';
    }
  });
  panel.addEventListener('toggle', () => {
    if (panel.open) {
      onOpen();
      schedulePreview();
    }
  });
  return {
    attachActor,
    reset(nextActors) {
      actors = nextActors;
      choices = [...new Map(actors.map((actor) => [sourceId(actor), actor])).values()];
      attach();
      actorSelect.replaceChildren();
      for (const actor of choices) option(actorSelect, actor.id, actor.name);
      actorSelect.disabled = !choices.length;
      syncActions();
      if (actionSelect.value)
        status.textContent = '설정은 이 브라우저에 저장됩니다. 조절 후 패널을 닫고 P로 재개하세요.';
    },
  };
}
