import { clamp } from './common_helper.js';
import { interpolateEffectFrameValues } from './animation_frame_data.js';
import { normalizeEffectOffsetForKey } from './project_effect_normalizer_helper.js';

// Gameplay timelines are authored data. Compile them once per source; the editor
// keeps using its live normalizer, and a new run explicitly clears this cache.
export function createRuntimeEffectReader() {
  let timelines = new WeakMap();
  const read = (tuning, key, progress = 0) => {
    let entries = timelines.get(tuning);
    if (!entries) {
      entries = new Map();
      timelines.set(tuning, entries);
    }
    const source = tuning.effectOffsets?.[key];
    let entry = entries.get(key);
    if (
      !entry ||
      entry.source !== source ||
      entry.keys !== source?.keyframes ||
      entry.start !== source?.start ||
      entry.end !== source?.end ||
      entry.image !== source?.image
    ) {
      entry = {
        source,
        keys: source?.keyframes,
        start: source?.start,
        end: source?.end,
        image: source?.image,
        compiled: normalizeEffectOffsetForKey(key, source),
      };
      entries.set(key, entry);
    }
    const frames = entry.compiled.keyframes,
      t = clamp(Number(progress), 0, 1);
    let selected = Number.isFinite(t) ? [frames[0]] : frames;
    if (t >= frames.at(-1).t) selected = [frames.at(-1)];
    else if (t > frames[0].t) {
      for (let i = 0; i < frames.length - 1; i++)
        if (t >= frames[i].t && t <= frames[i + 1].t) {
          selected = [frames[i], frames[i + 1]];
          break;
        }
    }
    return { ...interpolateEffectFrameValues(selected, t, key), image: entry.compiled.image };
  };
  read.reset = () => {
    timelines = new WeakMap();
  };
  return read;
}
