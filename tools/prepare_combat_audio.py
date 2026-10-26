"""Prepare short, normalized CC0 recordings; source packs are supplied as a directory."""
import argparse,array,hashlib,json,subprocess,wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PACKS={
 'impact':('Kenney','https://kenney.nl/assets/impact-sounds'),
 'kenney-rpg':('Kenney','https://kenney.nl/assets/rpg-audio'),
 'rpg':('artisticdude','https://opengameart.org/content/rpg-sound-pack'),
 'fire.wav':('AntumDeluge','https://opengameart.org/content/fire-crackling'),
 'balloon.flac':('Gniffelbaf / AntumDeluge','https://opengameart.org/content/balloon-sounds'),
 'explosion.ogg':('EZduzziteh','https://opengameart.org/content/explosions-4'),
 'weapons':('Ben Jaszczak & Brian Nelson','https://opengameart.org/content/medieval-sound-effects-weapon-textures'),
}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('sources',type=Path);args=parser.parse_args()
    output=ROOT/'assets/audio/combat';records=[]
    def prepare(name,sources,duration=1.2,rate=1):
        tracks=[];meta=[]
        for source,gain,delay in sources:
            path=args.sources/source
            raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','44100','-af',f'highpass=f=40,lowpass=f=15000,asetrate={round(44100*rate)},aresample=44100','-f','f32le','-'])
            samples=array.array('f');samples.frombytes(raw);peak=max(map(abs,samples),default=1)
            start=next((i for i,v in enumerate(samples) if abs(v)>peak*.012),0)
            samples=samples[max(0,start-80):max(0,start-80)+int(duration*44100)]
            tracks.append((samples,gain,int(delay*44100)))
            author,url=PACKS[source.split('/')[0]]
            meta.append(dict(original=source,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),author=author,url=url,gain=gain,delay=delay))
        size=min(int(duration*44100),max(len(a)+d for a,g,d in tracks));mixed=[0.0]*size
        for samples,gain,delay in tracks:
            for i,v in enumerate(samples[:max(0,size-delay)]):mixed[i+delay]+=v*gain
        peak=max(map(abs,mixed),default=1) or 1
        pcm=array.array('h',(round(v/peak*.75*32767*min(1,i/90,(size-1-i)/440)) for i,v in enumerate(mixed)))
        with wave.open(str(output/name),'wb') as f:f.setparams((1,2,44100,0,'NONE',''));f.writeframes(pcm.tobytes())
        records.append(dict(file=name,license='CC0-1.0',duration=size/44100,rate=rate,sources=meta,processing='mono 44.1kHz; HP40/LP15000; leading silence trim; layer mix; peak -2.5dBFS; short edge fades'))
    I='impact/Audio/';K='kenney-rpg/Audio/';R='rpg/RPG Sound Pack/'
    for i in range(3):prepare(f'foot-dirt-{i+1}.wav',[(I+f'footstep_grass_00{i}.ogg',1,0)],.35)
    prepare('armor-jingle.wav',[(R+'inventory/chainmail1.wav',1,0)],.5)
    prepare('cloth-move.wav',[(K+'cloth1.ogg',1,0)],.55)
    prepare('cloth-roll.wav',[(K+'cloth4.ogg',1,0),(I+'impactSoft_medium_000.ogg',.45,.12)],.65)
    for i in range(2):prepare(f'land-{i+1}.wav',[(I+f'impactSoft_heavy_00{i}.ogg',1,0),(I+f'footstep_grass_00{i}.ogg',.4,0)],.5)
    prepare('metal-drop.wav',[(K+'metalPot1.ogg',1,0)],.7)
    prepare('metal-set.wav',[(K+'metalLatch.ogg',1,0)],.55)
    prepare('metal-click.wav',[(K+'metalClick.ogg',1,0)],.4)
    prepare('metal-crash.wav',[(I+'impactMetal_heavy_002.ogg',1,0),(R+'inventory/chainmail2.wav',.5,.06)],1)
    prepare('trap-snap.wav',[(K+'metalLatch.ogg',.8,0),(I+'impactMetal_medium_002.ogg',1,.025)],.65)
    prepare('tank-rattle.wav',[(K+'creak2.ogg',.6,0),(R+'inventory/chainmail2.wav',1,0),(K+'metalPot3.ogg',.25,.12)],.8,.8)
    prepare('armor-fall.wav',[(R+'inventory/armor-light.wav',.6,0),(I+'impactSoft_heavy_003.ogg',1,.04)],.9)
    prepare('fire-crackle.wav',[('fire.wav',1,0)],.9)
    prepare('fire-cast.wav',[('fire.wav',.6,0),(R+'battle/swing2.wav',1,0)],.7,.9)
    prepare('magic-charge.wav',[(R+'battle/magic1.wav',1,0)],1.3)
    prepare('balloon-pop.wav',[('balloon.flac',1,0)],.5)
    prepare('explosion-1.wav',[('explosion.ogg',1,0)],2.1)
    prepare('explosion-2.wav',[('explosion.ogg',1,0),(I+'impactWood_heavy_001.ogg',.45,0)],1.4,1.15)
    bow=next(args.sources.glob('weapons/**/*Longbow*Shoot*'),None)
    if bow is None:raise RuntimeError('The recorded longbow release source is required')
    prepare('bow-release.wav',[(str(bow.relative_to(args.sources)),1,0)],.7)
    (output/'expanded-sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    print(f'Prepared {len(records)} recorded effects')
if __name__=='__main__':main()
