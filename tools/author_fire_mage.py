"""Bake the fire mage's floating puppet and casting actions into draft data."""
import copy
import json
from pathlib import Path
from author_powder_chief import part, frames

ROOT = Path(__file__).resolve().parents[1]
PARTS = {'body':'body','head':'head','cape':'cape','collar':'collar','flame':'flame',
         'upperArmL':'upper_arm_l','lowerArmL':'lower_arm_l','upperArmR':'upper_arm_r',
         'lowerArmR':'lower_arm_r','upperLegL':'upper_leg_l','upperLegR':'upper_leg_r'}


def author(base):
    t=copy.deepcopy(base)
    t.update(maxHp=300,transform=dict(scale=1.2,anchorX=0,anchorY=0),hud={'offsetY':-45},
             effectOffsets={},effectSettings={},modifiers=[],motion={})
    r=t['rig']
    r.update(body=part(-30,-105,60,68),head=part(-24,-158,49,50),neck=dict(x=0,y=0,rot=0),
             cape=part(-37,-112,74,97),collar=part(-40,-120,80,34),flame=part(-25,-208,50,55))
    r.pop('backpack',None)
    for key in ['shield','weapon','lowerLegL','lowerLegR']:
        r[key]['opacity']=0
    for side,x in [('L',-28),('R',28)]:
        r['shoulder'+side]=dict(x=x,y=-100,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
        r['upperArm'+side]=part(-12,-4,27,28,12,4)
        r['lowerArm'+side]=part(-16,-6,34,35,16,6)
        r['hip'+side]=dict(x=-12 if side=='L' else 12,y=-48,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
        r['upperLeg'+side]=part(-44 if side=='L' else -6,-2,52,52,44 if side=='L' else 6,2)
    for key in ['collisionInteractionObject','hurtInteractionObject']:
        r[key].update(x=2,y=-47,w=56,h=109,baseW=56,baseH=109,ax=0,ay=0,rot=0,followWeapon=0)
    t['layerOrder']=['cape','rightLeg','leftLeg','body','leftArm','rightArm','collar','head','flame']
    t['customActions']=[{'key':key,'name':name,'trigger':{'type':'single','keys':[code],'triggerMode':'tap'}}
                       for key,name,code in [('mageFloat','공중 부유 이동','ArrowRight'),('mageFire','연속 불길 깔기','Q')]]
    t['actionNames']={a['key']:a['name'] for a in t['customActions']}
    t['actionTriggers']={a['key']:a['trigger'] for a in t['customActions']}
    t['deletedActionKeys']=list(set(t.get('deletedActionKeys',[])+['powderWalk','powderThrow']))
    common=copy.deepcopy(t['actionSettings']['idle']['interactions'])
    common['attackInteractionObject'].update(active=0,attack=0,knockback=0)
    t['actionOffsets']={};t['actionSettings']={}
    for key,duration in [('idle',1.6),('fall',1.6),('hurt',.3),('death',1.1),('mageFloat',1.6),('mageFire',3.0)]:
        t['actionSettings'][key]=dict(duration=duration,playback='loop' if key in ['idle','fall'] else 'once',
            playbackRate=1,mirror=True,condition='ground' if key.startswith('mage') else 'any',
            group='movement' if key=='mageFloat' else 'base',blendFrames=2,interruptible=True,
            interactions=copy.deepcopy(common),formulas=[])
        offsets={'master':frames([(0,-25),(.25,-29),(.5,-25),(.75,-21),(1,-25)],'y'),
                 'shoulderL':frames([(0,28),(.5,22),(1,28)]),
                 'shoulderR':frames([(0,-28),(.5,-22),(1,-28)]),
                 'hipL':frames([(0,3),(.5,-4),(1,3)]),'hipR':frames([(0,-3),(.5,4),(1,-3)])}
        t['actionOffsets'][key]=offsets
    walk=t['actionSettings']['mageFloat']
    walk.update(ai=dict(enabled=True,minRange=320,maxRange=99999,cooldown=0,chance=100,priority=0))
    walk['formulas']=[dict(type='ai',enabled=True,startFrame=1,endFrame=16),
        dict(type='velocity',enabled=True,startFrame=1,endFrame=16,x=10,y=0,mode='set',curve='linear')]
    cast=t['actionSettings']['mageFire']
    cast.update(ai=dict(enabled=True,minRange=0,maxRange=620,cooldown=6.8,chance=100,priority=10))
    cast['formulas']=[dict(type='ai',enabled=True,startFrame=1,endFrame=30),
        dict(type='lock',enabled=True,startFrame=1,endFrame=30,direction='right'),
        dict(type='velocity',enabled=True,startFrame=1,endFrame=30,x=0,y=0,mode='set',curve='linear')]
    t['actionOffsets']['mageFire']['master']['keyframes']=[dict(id=f'cast_{i}',t=at,y=y,rot=rot)
        for i,(at,y,rot) in enumerate([(0,-25,0),(.2,-30,-5),(.25,-26,8),(.7,-26,8),(.85,-22,0),(1,-25,0)])]
    # The editor reserves start/end; endpoint keys in the interior list are clamped.
    for offsets in t['actionOffsets'].values():
        for value in offsets.values():
            keys=value.get('keyframes',[])
            if keys:
                value['start']={k:v for k,v in keys[0].items() if k not in ['id','t']}
                value['end']={k:v for k,v in keys[-1].items() if k not in ['id','t']}
                value['keyframes']=keys[1:-1]
    return t


def main():
    p=ROOT/'data/draft.json';s=json.loads(p.read_text())
    definition=dict(id='fire_mage',type='enemy',label='화염 마도사',name='화염 마도사',x=1320,
        folder='bosses/fire_mage',storageFolder='bosses/fire_mage',group='bosses',tint='#e99548',deleted=False,deletable=True,psdFileName='enemy.psd')
    s['characters']=[c for c in s['characters'] if c['id']!='fire_mage']+[definition]
    s['actors']['fire_mage']={'name':'화염 마도사','assets':{'__parts':list(PARTS)},'tuning':author(s['actors']['powder_chief']['tuning'])}
    s.setdefault('effectAssets',{})['fire_mage/effect_ground_fire']='./assets/effects/fire_mage/effect_ground_fire.png'
    for session in s['sessions'].values():
        session['stageRules']['enemy'].setdefault('spawnRulesByActor',{})['fire_mage']={'maxAlive':1,'intervalSec':35}
    p.write_text(json.dumps(s,ensure_ascii=False,separators=(',',':'))+'\n')
    (ROOT/'assets/characters/bosses/fire_mage/character.json').write_text(json.dumps({'version':1,**definition},ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    main()
