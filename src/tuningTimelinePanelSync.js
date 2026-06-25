import { syncEffectToolbarButtonStates, syncPoseToolbarButtonStates } from './tuningPanelDom.js';
import { syncTimelinePlaybackControls } from './tuningTimelineDom.js';

export function syncPoseTimelinePlaybackSettings(elements, { frameCount, settings, playing }) {
  const isLoop = settings.playback !== 'once';
  syncTimelinePlaybackControls(elements, { frameCount, settings, playing, isLoop });
  elements.playback.title = settings.playback === 'loop' ? '반복 재생' : '한 번 재생';
}

export function syncPoseTimelineToolbar(elements, state) {
  syncPoseToolbarButtonStates(elements, state);
  return state.hasSelection;
}

export function syncEffectTimelinePlaybackSettings(elements, { frameCount, settings, playing }) {
  const isLoop = settings.playback === 'loop';
  syncTimelinePlaybackControls(elements, { frameCount, settings, playing, isLoop });
}

export function syncEffectTimelineToolbar(elements, state) {
  syncEffectToolbarButtonStates(elements, state);
}
