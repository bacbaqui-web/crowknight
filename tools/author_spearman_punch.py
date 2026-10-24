"""Author a short unarmed jab using the existing spearman rig and timeline."""
import copy
import json
from pathlib import Path
from author_spearman_pose import arm_pose


def main():
    path = Path(__file__).resolve().parents[1] / 'data/draft.json'
    state = json.loads(path.read_text())
    tuning = state['actors']['spearman']['tuning']
    key = 'spearmanPunch'
    tuning['customActions'] = [a for a in tuning['customActions'] if a['key'] != key]
    tuning['customActions'].append({'key': key, 'name': '맨손 주먹',
                                   'trigger': {'type': 'single', 'keys': [], 'triggerMode': 'tap'}})
    settings = copy.deepcopy(tuning['actionSettings']['customAction2'])
    settings.update(duration=.9, playback='once', playbackRate=1, blendFrames=0, condition='ground')
    settings['ai'] = {'enabled': False, 'minRange': 0, 'maxRange': 65,
                      'cooldown': 1.2, 'chance': 100, 'priority': 20}
    settings['formulas'] = [
        {'type': 'ai', 'enabled': True, 'startFrame': 1, 'endFrame': 9},
        {'type': 'velocity', 'enabled': True, 'startFrame': 1, 'endFrame': 9,
         'x': 0, 'y': 0, 'mode': 'set', 'curve': 'linear'},
        {'type': 'lock', 'enabled': True, 'startFrame': 4, 'endFrame': 6, 'direction': 'right'},
    ]
    settings['interactions']['attackInteractionObject'].update(
        active=1, attack=1, followWeapon=0, startFrame=5, endFrame=6,
        hitMode='box', knockback=12, knockbackExtraVx=0, knockbackExtraVy=0)
    tuning['actionSettings'][key] = settings
    offsets = copy.deepcopy(tuning['actionOffsets']['idle'])
    offsets['weapon'] = {'opacity': 0}
    parts = ['upperArmL', 'lowerArmL', 'upperArmR', 'lowerArmR', 'master',
             'hipL', 'hipR', 'attackInteractionObject']
    offsets.update({part: {'keyframes': []} for part in parts})
    stops = [(0, -16, 29, 0), (.20, -10, -5, -2), (.32, -12, -5, -2),
             (.46, 28, -5, 4), (.56, 28, -5, 4), (.78, 0, -1, 0), (1, -16, 29, 0)]
    for i in range(109):
        t = i / 108
        for a, b in zip(stops, stops[1:]):
            if a[0] <= t <= b[0]:
                u = (t - a[0]) / (b[0] - a[0]); u = u*u*(3-2*u)
                x, y, body = (a[n] + (b[n]-a[n])*u for n in [1, 2, 3])
                break
        guard = min(1, t/.2, (1-t)/.22)
        values = {**arm_pose('R', x, y), **arm_pose('L', -9+3*guard, 29-33*guard),
                  'master': {'x': body}, 'hipL': {'x': -body}, 'hipR': {'x': -body},
                  'attackInteractionObject': {'x': 24+x-164, 'y': -46+y-7,
                                             'w': -2, 'h': 8, 'ax': 13,
                                             'followWeapon': 0}}
        for part, value in values.items():
            offsets[part]['keyframes'].append({'id': f'punch_{i}', 't': t,
                                              **{k: round(v, 5) for k, v in value.items()}})
    tuning['actionOffsets'][key] = offsets
    tuning.setdefault('actionNames', {})[key] = '맨손 주먹'
    path.write_text(json.dumps(state, ensure_ascii=False, separators=(',', ':'))+'\n')


if __name__ == '__main__':
    main()
