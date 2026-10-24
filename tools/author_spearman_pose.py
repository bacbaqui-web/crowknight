"""Bake editable spear grips and elbow poses into the existing character timeline."""
import json
import math
from pathlib import Path


ARM_LENGTH = 22
FOREARM_LENGTH = 25
SHOULDERS = {'L': (-15, -64), 'R': (8, -64)}
GRIPS = {'L': (-6, -46), 'R': (24, -46)}


def arm_pose(side, shift_x=0, shift_y=0):
    sx, sy = SHOULDERS[side]
    gx, gy = GRIPS[side]
    dx, dy = gx + shift_x - sx, gy + shift_y - sy
    distance = math.hypot(dx, dy)
    along = (ARM_LENGTH**2 - FOREARM_LENGTH**2 + distance**2) / (2 * distance)
    bend = math.sqrt(max(0, ARM_LENGTH**2 - along**2))
    ex = along * dx / distance - bend * dy / distance
    ey = along * dy / distance + bend * dx / distance
    return {
        f'upperArm{side}': {'rot': math.degrees(math.atan2(-ex, ey))},
        f'lowerArm{side}': {
            'x': ex, 'y': ey - ARM_LENGTH,
            'rot': math.degrees(math.atan2(-(dx - ex), dy - ey)),
        },
    }


def motion(t):
    # Pause on the drawn-back pose, accelerate the thrust, then settle slowly.
    stops = [(0, 0, 0, 0), (.30, -11, 3, -3), (.40, -11, 3, -3),
             (.51, 24, -2, 7), (.58, 24, -2, 7), (.90, 0, 0, 0), (1, 0, 0, 0)]
    for a, b in zip(stops, stops[1:]):
        if a[0] <= t <= b[0]:
            u = (t - a[0]) / (b[0] - a[0])
            u = u * u * (3 - 2 * u)
            return tuple(a[i] + (b[i] - a[i]) * u for i in range(1, 4))
    return (0, 0, 0)


def author(tuning):
    rig = tuning['rig']
    for side, (sx, sy) in SHOULDERS.items():
        rig[f'shoulder{side}'].update(x=sx, y=sy, ax=0, ay=0, w=1, h=1,
                                     rot=0, anchorOffsetX=0, anchorOffsetY=0)
        for prefix, height in [('upperArm', 30), ('lowerArm', 31)]:
            rig[f'{prefix}{side}'].update(x=-8, y=-3, ax=8, ay=3, w=16, h=height,
                                         baseW=16, baseH=height, rot=0,
                                         anchorOffsetX=0, anchorOffsetY=0)
    # Hand centre is 25px below the forearm pivot. The spear's rear grip is 30px
    # behind its front grip; its centre line runs through both mitten centres.
    rig['weapon'].update(x=-39, y=-38, ax=55, ay=7, w=190, h=14,
                         baseW=190, baseH=14, rot=0, anchorOffsetX=0, anchorOffsetY=0)
    rig['attackInteractionObject'].update(x=164, y=7, ax=0, ay=7, w=26, h=14,
                                         baseW=26, baseH=14, rot=0)
    tuning['layerOrder'] = ['rightLeg', 'leftLeg', 'body', 'head', 'cape',
                            'weapon', 'rightArm', 'leftArm']
    rest = {**arm_pose('L'), **arm_pose('R')}
    for offsets in tuning['actionOffsets'].values():
        for key in ['shoulderL', 'shoulderR', 'weapon']:
            offsets.pop(key, None)
        offsets.update(json.loads(json.dumps(rest)))
    attack = tuning['actionOffsets']['customAction2']
    timelines = {key: [] for key in [*rest, 'weapon', 'master', 'hipL', 'hipR']}
    # Dense baked keys keep the hands on a straight shaft even between editor frames.
    times = sorted({i / 120 for i in range(121)} | {.30, .40, .51, .58, .90})
    for i, at in enumerate(times):
        x, y, body = motion(at)
        values = {**arm_pose('L', x, y), **arm_pose('R', x, y),
                  'weapon': {'x': x, 'y': y}, 'master': {'x': body},
                  'hipL': {'x': -body}, 'hipR': {'x': -body}}
        for key, value in values.items():
            timelines[key].append({'id': f'grip_{i}', 't': at,
                                   **{k: round(v, 5) for k, v in value.items()}})
    attack.update({key: {'keyframes': frames} for key, frames in timelines.items()})
    tuning['actionSettings']['customAction2']['blendFrames'] = 0


def main():
    path = Path(__file__).resolve().parents[1] / 'data/draft.json'
    state = json.loads(path.read_text())
    author(state['actors']['spearman']['tuning'])
    path.write_text(json.dumps(state, ensure_ascii=False, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main()
