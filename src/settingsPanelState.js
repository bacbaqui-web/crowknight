export function isCollisionSectionOpen() {
  return isSettingsSectionOpen('collision');
}

export function activeAttackSettingsKey() {
  if (!isSettingsSectionOpen('pose')) return null;

  const key = document.querySelector('#poseSelect')?.value || '';
  return /^attack[123]$/.test(key) || key === 'jumpAttack' ? key : null;
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
  if (editFocusContext === 'pose' && isPanelSectionOpen(panel, 'pose')) return 'pose';
  return null;
}

function isSettingsSectionOpen(section) {
  return document.querySelector(`[data-section="${section}"]`)?.classList.contains('is-open');
}

function isPanelSectionOpen(panel, section) {
  return panel.querySelector(`[data-section="${section}"]`)?.classList.contains('is-open');
}
