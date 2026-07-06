export function isCollisionSectionOpen() {
  return isSettingsSectionOpen('collision');
}

export function activeAttackSettingsKey() {
  if (!isSettingsSectionOpen('action')) return null;

  const key = document.querySelector('#actionSelect')?.value || '';
  return /^attack[123]$/.test(key) || key === 'jumpAttack' || key === 'roll' ? key : null;
}

export function activeEffectSettingsKey() {
  if (!isSettingsSectionOpen('effect')) return null;
  return document.querySelector('#effectSelect')?.value || null;
}

export function isSettingsPanelOpen() {
  return document.querySelector('#tuningPanel')?.classList.contains('is-open');
}

export function currentSettingsEditContext({ editFocusContext, activePartKey }) {
  const panel = document.querySelector('#tuningPanel');
  if (!panel?.classList.contains('is-open')) return null;

  if (isPanelSectionOpen(panel, 'effect')) return 'effect';
  if (editFocusContext === 'part' && isPanelSectionOpen(panel, 'part') && activePartKey) return 'part';
  if (editFocusContext === 'action' && isPanelSectionOpen(panel, 'action')) return 'action';
  return null;
}

export function currentCanvasSettingsEditContext({
  partSection,
  actionSection,
  effectSection,
  editFocusContext,
  editContext,
  activePartKey,
}) {
  const partOpen = isOpenVisibleSection(partSection);
  const actionOpen = isOpenVisibleSection(actionSection);
  const effectOpen = isOpenVisibleSection(effectSection);
  if (effectOpen) return 'effect';
  if (editFocusContext === 'action' && actionOpen) return 'action';
  if (editFocusContext === 'part' && partOpen && activePartKey) return 'part';
  if (editContext === 'action' && actionOpen) return 'action';
  if (editContext === 'part' && partOpen && activePartKey) return 'part';
  if (partOpen) return 'part';
  if (actionOpen) return 'action';
  return null;
}

function isSettingsSectionOpen(section) {
  return isOpenVisibleSection(document.querySelector(`[data-section="${section}"]`));
}

function isPanelSectionOpen(panel, section) {
  return isOpenVisibleSection(panel.querySelector(`[data-section="${section}"]`));
}

function isOpenVisibleSection(section) {
  return Boolean(section && !section.hidden && section.classList.contains('is-open'));
}
