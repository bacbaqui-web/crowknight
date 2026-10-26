"""Import five free game-SFX families without pitch, EQ, layering or tail shaping."""
import argparse
import array
import hashlib
import json
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOVE = 'https://hoveaudio.itch.io/sword-combat-sound-effects-pack-free-version'
STEPS = 'https://opengameart.org/content/footsteps-on-different-surfaces'
BOOM = 'https://opengameart.org/content/2-high-quality-explosions'


def selections(base):
    hove = base / 'hove/Sword Combat Sound Effects Pack FREE VERSION'
    groups = [
        ('swing', 'WHSH_Whoosh_HoveAud_SwordCombat_', ['07', '26']),
        ('blade-hit', 'WEAPSwrd_SwordStab_HoveAud_SwordCombat_', ['01', '11']),
        ('shield', 'WEAPSwrd_BaseMetal_HoveAud_SwordCombat_', ['03', '06']),
        ('blunt-hit', 'WEAPSwrd_BaseWood_HoveAud_SwordCombat_', ['03', '06']),
    ]
    for family, prefix, variants in groups:
        for i, variant in enumerate(variants, 1):
            path = next(hove.rglob(prefix + variant + '.wav'))
            yield f'{family}-{i}', path, 'Hove Audio', HOVE, 'Hove Audio royalty-free game use'
    for i in range(6):
        yield f'grass-{i+1}', base/f'steps/footsteps/grass/{i}.ogg', 'swuing; mastered by congusbongus', STEPS, 'CC-BY-3.0'
    for name, file in [('explosion-small', 'explodemini.wav'), ('explosion-large', 'explode.wav')]:
        yield name, base/'explosions/explosions'/file, 'Michel Baradari', BOOM, 'CC-BY-3.0'


def build(base):
    output = ROOT/'assets/audio/combat/selected'
    output.mkdir(exist_ok=True)
    manifest = []
    for name, path, author, url, license_name in selections(base):
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'])
        samples = array.array('f')
        samples.frombytes(raw)
        peak = max(map(abs, samples))
        # Remove only near-silence outside the event. Preserve attack and full decay.
        active = [i for i, v in enumerate(samples) if abs(v) > peak * .002]
        start = max(0, active[0] - 220)
        end = min(len(samples), active[-1] + 2205)
        cropped = samples[start:end]
        gain = .78 / peak
        pcm = array.array('h', (round(v * gain * 32767 * min(1, i/22, (len(cropped)-1-i)/220)) for i, v in enumerate(cropped)))
        target = output/(name+'.wav')
        with wave.open(str(target), 'wb') as f:
            f.setparams((1, 2, 44100, 0, 'NONE', ''))
            f.writeframes(pcm.tobytes())
        manifest.append(dict(file='selected/'+target.name, original=str(path.relative_to(base)), author=author,
                             url=url, license=license_name, sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                             sha256=hashlib.sha256(target.read_bytes()).hexdigest(), duration=len(cropped)/44100,
                             trimStart=start/44100, trimEnd=end/44100, originalDuration=len(samples)/44100,
                             gain=gain, processing='mono 44.1kHz; outside near-silence trimmed; linear gain; 0.5ms/5ms edge fades; no pitch/EQ/layers/decay processing'))
    (output/'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print(f'Imported {len(manifest)} variants')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('sources', type=Path)
    build(parser.parse_args().sources)
