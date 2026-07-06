export function shouldPreviewAction({ playing, activeKeyframeId, fixedFrame, selectedSlot }) {
  return Boolean(playing || activeKeyframeId || fixedFrame || selectedSlot !== null);
}

export function createActionPreview({
  action,
  fixedFrame = null,
  playing = false,
  playback = null,
  loop = false,
  t = null,
  now,
}) {
  return {
    action,
    frame: fixedFrame,
    playing,
    playback: playback || (loop ? 'pingpong' : 'once'),
    t,
    startedAt: now,
  };
}

export function shouldPreviewEffect({ playing, activeKeyframeId, fixedFrame, selectedSlot }) {
  return Boolean(playing || activeKeyframeId || fixedFrame || selectedSlot !== null);
}

export function createEffectPreview({ key, playing = false, t = null, now }) {
  return {
    key,
    playing,
    t,
    startedAt: now,
  };
}

export function clearActorActionPreviews(actors) {
  actors.forEach((actor) => {
    actor.player.actionPreview = null;
  });
}

export function clearActorEffectPreviews(actors) {
  actors.forEach((actor) => {
    actor.player.effectPreview = null;
  });
}

export function clearActorEditPreviews(actors) {
  actors.forEach((actor) => {
    actor.player.anchorDebugPart = null;
    actor.player.actionPreview = null;
    actor.player.effectPreview = null;
  });
}

export function syncActorAnchorDebugPart(actors, selectedActor, partKey) {
  actors.forEach((actor) => {
    actor.player.anchorDebugPart = null;
  });
  selectedActor.player.anchorDebugPart = partKey;
}
