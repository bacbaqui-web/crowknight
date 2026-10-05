import { SKILL_PATHS } from './skill_progression_data.js';

export function bindSkillMotionEditor({ actionSelect, actionGroupSelect }, callbacks) {
  if (!actionSelect || document.querySelector('#skillMotionEditor')) return;
  const root = document.createElement('section');
  root.id = 'skillMotionEditor';
  root.setAttribute('aria-label', '스킬별 모션 제작');
  root.style.cssText = 'grid-column:1 / -1;width:100%;box-sizing:border-box;padding:10px;margin:8px 0;border:1px solid #ffffff30;border-radius:8px';
  const heading = document.createElement('strong');
  heading.textContent = '스킬 모션';
  const hint = document.createElement('p');
  hint.textContent = '계열과 동작을 고르면 아래 타임라인에서 게임에 쓰이는 모션을 제작할 수 있습니다.';
  hint.style.cssText = 'font-size:11px;line-height:1.5';
  root.append(heading, hint);
  for (const path of SKILL_PATHS) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin:6px 0;align-items:center';
    const label = document.createElement('strong');
    label.textContent = path.name;
    label.style.cssText = `color:${path.color};min-width:36px;font-size:12px`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `${path.name} 스킬 모션`);
    select.style.cssText = 'flex:1;min-width:0';
    for (const [id, name] of path.motions) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = name;
      select.append(option);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '제작';
    button.setAttribute('aria-label', `${path.name} 모션 제작`);
    button.style.cssText = `background:#182331;border:1px solid ${path.color};color:${path.color};padding:5px;border-radius:5px`;
    button.addEventListener('click', () => {
      const tuning = callbacks.getTuning();
      const key = tuning.skillActions?.[select.value];
      if (!key || !tuning.actionSettings?.[key]) {
        hint.textContent = '주인공 캐릭터를 선택한 뒤 모션을 제작해 주세요.';
        return;
      }
      actionGroupSelect.value = tuning.actionSettings[key].group;
      actionGroupSelect.dispatchEvent(new Event('change', { bubbles: true }));
      actionSelect.value = key;
      actionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      hint.textContent = `${path.name} · ${select.selectedOptions[0].textContent} — 아래에서 프레임과 부위를 선택해 제작하세요.`;
    });
    row.append(label, select, button);
    root.append(row);
  }
  const anchor = actionSelect.closest('.selection-row') || actionSelect.parentElement;
  anchor.before(root);
}
