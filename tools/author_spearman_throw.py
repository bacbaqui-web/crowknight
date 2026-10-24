"""Add the spearman's one-use throw animation without altering existing attacks."""
import copy
import json
from pathlib import Path
from author_spearman_pose import arm_pose


def main():
    path = Path(__file__).resolve().parents[1] / 'data/draft.json'
    state = json.loads(path.read_text())
    tuning = state['actors']['spearman']['tuning']
    key = 'spearmanThrow'
    tuning['customActions'] = [a for a in tuning['customActions'] if a['key'] != key]
    tuning['customActions'].append({'key': key, 'name': '생존 투창',
                                   'trigger': {'type': 'single', 'keys': [], 'triggerMode': 'tap'}})
    settings = copy.deepcopy(tuning['actionSettings']['customAction2'])
    settings.update(duration=1.4, playback='once', playbackRate=1, blendFrames=0, condition='ground')
    settings['ai']['enabled'] = False
    settings['formulas'] = []
    settings['interactions'].pop('attackInteractionObject', None)
    tuning['actionSettings'][key] = settings
    offsets = copy.deepcopy(tuning['actionOffsets']['idle'])
    # Raise the spear, hold it during the warning, then extend and follow through.
    poses = [(0, 0, 0), (.20, -10, -25), (.65, -10, -25),
             (.7142857, 18, -5), (.80, 24, -2), (1, 0, 0)]
    for part in ['upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR', 'weapon']:
        offsets[part] = {'keyframes': []}
    for i in range(85):
        t = i / 84
        for a, b in zip(poses, poses[1:]):
            if a[0] <= t <= b[0]:
                u = (t-a[0])/(b[0]-a[0]); u = u*u*(3-2*u)
                x, y = (a[n]+(b[n]-a[n])*u for n in [1, 2])
                break
        values = {**arm_pose('L', x, y), **arm_pose('R', x, y), 'weapon': {'x': x, 'y': y}}
        for part, value in values.items():
            offsets[part]['keyframes'].append({'id': f'throw_{i}', 't': t, **value})
    tuning['actionOffsets'][key] = offsets
    tuning.setdefault('actionNames', {})[key] = '생존 투창'
    path.write_text(json.dumps(state, ensure_ascii=False, separators=(',', ':'))+'\n')


if __name__ == '__main__':
    main()
