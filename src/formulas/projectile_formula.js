import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderFormulaInlineStepperFields } from './formula_editor_fields.js';

export const projectileFormula = {
  type: 'projectile',
  label: '투사체',
  defaultValue: () => ({
    type: 'projectile',
    enabled: false,
    startFrame: 1,
    endFrame: 1,
    spawnFrame: 5,
    imageKey: 'effect_arrow',
    offsetX: 30,
    offsetY: -40,
    flightFrames: 45,
    arcHeight: 180,
    hitboxWidth: 30,
    hitboxHeight: 8,
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: normalizeFrame(source.startFrame ?? source.settings?.startFrame, 1),
      endFrame: normalizeFrame(source.endFrame ?? source.settings?.endFrame, 1),
      spawnFrame: normalizeFrame(source.spawnFrame ?? source.settings?.spawnFrame, 5),
      imageKey: normalizeImageKey(source.imageKey ?? source.settings?.imageKey),
      offsetX: Number(source.offsetX ?? source.settings?.offsetX ?? 30),
      offsetY: Number(source.offsetY ?? source.settings?.offsetY ?? -40),
      flightFrames: normalizePositiveNumber(source.flightFrames ?? source.settings?.flightFrames, 45, 1, 600),
      arcHeight: normalizePositiveNumber(source.arcHeight ?? source.settings?.arcHeight, 180, 0, 2000),
      hitboxWidth: normalizePositiveNumber(source.hitboxWidth ?? source.settings?.hitboxWidth, 30, 1, 1000),
      hitboxHeight: normalizePositiveNumber(source.hitboxHeight ?? source.settings?.hitboxHeight, 8, 1, 1000),
    };
  },
  showMiniTimeline() {
    return false;
  },
  frameFields() {
    return [];
  },
  renderOptions(container, formula, context) {
    container.append(renderProjectileImageField(formula.imageKey, (value) => context.onChange('imageKey', value)));
    container.append(
      renderFormulaInlineStepperFields([
        {
          label: '발사 프레임',
          value: formula.spawnFrame,
          step: 1,
          min: 1,
          max: ACTION_MAX_FRAMES,
          onChange: (value) => context.onChange('spawnFrame', value),
        },
        {
          label: '생성 X',
          value: formula.offsetX,
          step: 1,
          onChange: (value) => context.onChange('offsetX', value),
        },
        {
          label: '생성 Y',
          value: formula.offsetY,
          step: 1,
          onChange: (value) => context.onChange('offsetY', value),
        },
      ])
    );
    container.append(
      renderFormulaInlineStepperFields([
        {
          label: '비행시간',
          value: formula.flightFrames,
          step: 1,
          min: 1,
          max: 600,
          onChange: (value) => context.onChange('flightFrames', value),
        },
        {
          label: '곡선 높이',
          value: formula.arcHeight,
          step: 1,
          min: 0,
          max: 2000,
          onChange: (value) => context.onChange('arcHeight', value),
        },
      ])
    );
    container.append(
      renderFormulaInlineStepperFields([
        {
          label: 'Hitbox W',
          value: formula.hitboxWidth,
          step: 1,
          min: 1,
          max: 1000,
          onChange: (value) => context.onChange('hitboxWidth', value),
        },
        {
          label: 'Hitbox H',
          value: formula.hitboxHeight,
          step: 1,
          min: 1,
          max: 1000,
          onChange: (value) => context.onChange('hitboxHeight', value),
        },
      ])
    );
  },
  runtime: {
    appliesTo: 'projectile',
  },
};

function renderProjectileImageField(value, onChange) {
  const label = document.createElement('label');
  label.className = 'modifier-setting-row';
  const text = document.createElement('span');
  text.textContent = 'Effect 이미지';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = String(value || '');
  input.placeholder = 'effect_arrow';
  input.addEventListener('input', () => onChange(input.value));
  input.addEventListener('change', () => onChange(input.value));
  label.append(text, input);
  return label;
}

function normalizeFrame(value, fallback) {
  const number = Math.round(Number(value ?? fallback));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(ACTION_MAX_FRAMES, Math.max(1, number));
}

function normalizeImageKey(value) {
  const text = String(value || '').trim();
  return text || 'effect_arrow';
}

function normalizePositiveNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
