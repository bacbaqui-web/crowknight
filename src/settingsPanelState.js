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

function isSettingsSectionOpen(section) {
  return document.querySelector(`[data-section="${section}"]`)?.classList.contains('is-open');
}
