"""Build the dry second-edition combat library from attributed CC0 foley packs."""
import argparse
import array
import hashlib
import json
import math
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKS = {
    'impact': ('Kenney', 'https://kenney.nl/assets/impact-sounds'),
    'kenney-rpg': ('Kenney', 'https://kenney.nl/assets/rpg-audio'),
    'rpg': ('artisticdude', 'https://opengameart.org/content/rpg-sound-pack'),
    'weapons': ('Ben Jaszczak & Brian Nelson', 'https://opengameart.org/content/medieval-sound-effects-weapon-textures'),
    'textures2': ('Ben Jaszczak & Brian Nelson', 'https://opengameart.org/content/medieval-sound-effects-weapon-textures'),
    'weapon-impacts': ('Ben Jaszczak & Brian Nelson', 'https://opengameart.org/content/medieval-sound-effects-weapon-impacts'),
    'fire.wav': ('AntumDeluge', 'https://opengameart.org/content/fire-crackling'),
    'balloon.flac': ('Gniffelbaf / AntumDeluge', 'https://opengameart.org/content/balloon-sounds'),
    'dull.flac': ('qubodup', 'https://opengameart.org/content/dull-explosion'),
}
I, K, R = 'impact/Audio/', 'kenney-rpg/Audio/', 'rpg/RPG Sound Pack/inventory/'
W, T, H = 'weapons/', 'textures2/', 'weapon-impacts/'


def layer(path, gain=1, delay=0):
    return (path, gain, delay)


def recipes():
    soft = I + 'impactSoft_heavy_003.ogg'
    wood = I + 'impactWood_heavy_001.ogg'
    haft = H + 'Mace Spear Haft.wav'
    blade = H + 'Dagger Axe Blade on Blade.wav'
    armor = R + 'chainmail2.wav'
    cloth = K + 'cloth2.ogg'
    # name, duration, low-pass cutoff, exponential tail decay, recorded layers
    rows = [
        ('experiencePickup', .16, 2200, 8, [layer(K+'bookPlace1.ogg')]),
        ('healthPickup', .4, 3500, 3, [layer(K+'handleSmallLeather.ogg'), layer(cloth,.3,.08)]),
        ('clubSwing', .45, 6500, 2, [layer(T+'Axe Swing.wav')]),
        ('swordSwing', .38, 8000, 2, [layer(T+'Sabre Swing.wav')]),
        ('bossSwing', .6, 4200, 2, [layer(T+'Spear Swing.wav'),layer(cloth,.25)]),
        ('clubHit', .3, 4000, 8, [layer(haft),layer(soft,.65)]),
        ('swordHit', .26, 6500, 10, [layer(blade,.55),layer(soft)]),
        ('bossHit', .48, 3200, 6, [layer(haft),layer(wood,.65),layer(soft,.8)]),
        ('guardRaise', .23, 4500, 8, [layer(R+'armor-light.wav'),layer(cloth,.5)]),
        ('block', .28, 5500, 12, [layer(H+'Axe Sabre Haft on Hilt.wav'),layer(wood,.3)]),
        ('parry', .23, 7500, 15, [layer(H+'Axe Katana Blade on Blade.wav'),layer(haft,.35)]),
        ('armorStep', .18, 4200, 10, [layer(R+'chainmail1.wav')]),
        ('jump', .25, 5000, 4, [layer(K+'cloth3.ogg')]),
        ('roll', .55, 4200, 3, [layer(K+'cloth4.ogg'),layer(soft,.35,.15)]),
        ('bowRelease', .45, 7500, 5, [layer(W+'English Longbow Shoot.wav')]),
        ('spearThrow', .48, 6500, 3, [layer(T+'Spear Swing.wav')]),
        ('bombThrow', .3, 4500, 4, [layer(K+'clothBelt.ogg')]),
        ('bombLand', .28, 3200, 10, [layer(haft),layer(soft,.6)]),
        ('explosion-1', 1.1, 5500, 4, [layer('dull.flac'),layer(wood,.7),layer('fire.wav',.4,.04)]),
        ('explosion-2', .9, 4200, 5, [layer('dull.flac'),layer(soft,.9),layer(wood,.4,.03),layer('fire.wav',.3,.08)]),
        ('bigExplosion', 1.6, 3800, 3, [layer('dull.flac'),layer(wood,.9),layer(haft,.55,.05),layer('fire.wav',.6,.08)]),
        ('fuse', .75, 6500, 0, [layer('fire.wav')]),
        ('fireCast', .55, 6000, 2, [layer('fire.wav'),layer(T+'Axe Swing.wav',.6)]),
        ('fireBurn', .95, 4800, 0, [layer('fire.wav')]),
        ('magicCharge', .85, 4200, 0, [layer('fire.wav'),layer(T+'Spear Swing.wav',.35,.18)]),
        ('tankRumble', .65, 2400, 1, [layer(armor,.5),layer(haft,.7),layer(haft,.5,.17),layer(armor,.4,.3),layer(haft,.4,.43)]),
        ('tankCharge', .6, 3200, 1, [layer(haft),layer(armor,.6),layer(haft,.8,.12),layer(wood,.6,.25),layer(haft,.5,.38)]),
        ('tankCrash', .65, 4200, 6, [layer(H+'Mace Axe Blade and Haft.wav'),layer(wood),layer(armor,.3,.06)]),
        ('balloonPop', .22, 8500, 9, [layer('balloon.flac')]),
        ('bodyFall', .45, 3000, 7, [layer(soft),layer(K+'dropLeather.ogg',.6)]),
        ('trapSet', .3, 4000, 7, [layer(W+'Crossbow Place Bolt.wav'),layer(soft,.25)]),
        ('trapArm', .18, 6500, 14, [layer(W+'Crossbow Lever Trigger.wav')]),
        ('trapSnap', .24, 7000, 12, [layer(W+'Crossbow Lever Trigger.wav'),layer(blade,.6,.012)]),
        ('trapBreak', .4, 5500, 9, [layer(H+'Mace Axe Blade and Haft.wav'),layer(armor,.35,.04)]),
        ('enemyDeath', .55, 3200, 5, [layer(soft),layer(R+'armor-light.wav',.4,.03)]),
        ('bossDeath', .85, 3500, 5, [layer(wood),layer(soft),layer(armor,.45,.08)]),
        ('playerDeath', .7, 3000, 4, [layer(K+'dropLeather.ogg'),layer(soft,.8,.04),layer(armor,.25,.08)]),
        ('bossArrival', .55, 2800, 7, [layer(haft),layer(wood,.75),layer(armor,.35,.06)]),
    ]
    for i in range(3):
        rows.append((f'footstep-{i+1}', .26, 4200, 5, [layer(I+f'footstep_grass_00{i+1}.ogg')]))
    for i in range(2):
        rows.append((f'land-{i+1}', .38, 3200, 6, [layer(I+f'impactSoft_heavy_00{i+1}.ogg'),layer(I+f'footstep_grass_00{i+2}.ogg',.4)]))
    return rows


def build(sources):
    output = ROOT / 'assets/audio/combat/v2'
    output.mkdir(exist_ok=True)
    records = []
    for name, duration, cutoff, decay, layers in recipes():
        size = round(duration * 44100)
        mixed = [0.0] * size
        metadata = []
        for source, gain, delay in layers:
            path = sources / source
            raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','44100','-af',f'highpass=f=55,lowpass=f={cutoff}','-f','f32le','-'])
            samples = array.array('f')
            samples.frombytes(raw)
            peak = max(map(abs, samples)) or 1
            start = next((i for i,v in enumerate(samples) if abs(v) > peak*.04), 0)
            start = max(0, start-90)
            offset = round(delay*44100)
            for i,v in enumerate(samples[start:start+size-offset]):
                mixed[i+offset] += v/peak*gain
            author, url = PACKS[source.split('/')[0]]
            metadata.append(dict(original=source,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),author=author,url=url,gain=gain,delay=delay))
        for i in range(size):
            mixed[i] *= math.exp(-decay*i/44100) * min(1,i/44,(size-1-i)/1100)
        peak = max(map(abs,mixed)) or 1
        pcm = array.array('h',(round(v/peak*.7*32767) for v in mixed))
        file = name+'.wav'
        with wave.open(str(output/file),'wb') as f:
            f.setparams((1,2,44100,0,'NONE',''))
            f.writeframes(pcm.tobytes())
        records.append(dict(file='v2/'+file,license='CC0-1.0',duration=duration,lowpass=cutoff,decay=decay,rate=1,sources=metadata,sha256=hashlib.sha256((output/file).read_bytes()).hexdigest()))
    (output/'sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    print(f'Built {len(records)} dry effects')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('sources',type=Path)
    build(parser.parse_args().sources)
