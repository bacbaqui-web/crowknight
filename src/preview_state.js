export function shouldPreviewPose({ playing, activeKeyframeId, fixedFrame, selectedSlot }) {
  return Boolean(playing || activeKeyframeId || fixedFrame || selectedSlot !== null);
}

export function createPosePreview({ pose, fixedFrame = null, playing = false, loop = false, t = null, now }) {
  return {
    pose,
    frame: fixedFrame,
    playing,
    loop,
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

export function clearActorPosePreviews(actors) {
  actors.forEach((actor) => {
    actor.player.posePreview = null;
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
    actor.player.posePreview = null;
    actor.player.effectPreview = null;
  });
}

export function syncActorAnchorDebugPart(actors, selectedActor, partKey) {
  actors.forEach((actor) => {
    actor.player.anchorDebugPart = null;
  });
  selectedActor.player.anchorDebugPart = partKey;
}
