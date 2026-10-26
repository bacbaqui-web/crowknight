"""Author the cannon-free ramming tank with independently editable cutout parts."""
import copy
import json
from pathlib import Path
from author_powder_chief import part

ROOT = Path(__file__).resolve().parents[1]
PARTS = {'body':'body','backpack':'backpack','head':'head','collar':'collar','cape':'cape',
         'weapon':'weapon','shield':'shield','upperArmL':'upper_arm_l','upperArmR':'upper_arm_r',
         'lowerArmL':'lower_arm_l','upperLegL':'upper_leg_l','upperLegR':'upper_leg_r',
         'lowerLegL':'lower_leg_l','lowerLegR':'lower_leg_r'}


def timeline(stops, prop='rot'):
    return {'start':{prop:stops[0][1]},'end':{prop:stops[-1][1]},
            'keyframes':[{'id':f'tank_{i}','t':t,prop:v} for i,(t,v) in enumerate(stops[1:-1])]}


def author(base):
    t=copy.deepcopy(base)
    t.update(maxHp=480,transform=dict(scale=1,anchorX=0,anchorY=0),hud={'offsetY':-30},
             effectOffsets={},effectSettings={},modifiers=[],motion={})
    r=t['rig'];r.pop('flame',None)
    r.update(body=part(-128,-112,248,96),backpack=part(-135,-66,245,65),
             weapon=part(80,-78,100,78),head=part(-27,-227,65,75),
             collar=part(-33,-165,78,61),cape=part(-110,-181,105,94),
             shield=part(-145,-213,65,122),lowerLegR=part(-140,-147,39,91),
             upperArmL=part(-46,-158,67,48),upperArmR=part(18,-158,67,48),
             lowerArmL=part(-39,-122,92,19),neck=dict(x=0,y=0,rot=0))
    for key,x in [('upperLegL',-119),('upperLegR',-44),('lowerLegL',31)]:
        r[key]=part(x,-61,56,56,28,28)
    r['lowerArmR']['opacity']=0
    for key in ['hipL','hipR','shoulderL','shoulderR']:
        r[key]=dict(x=0,y=0,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
    # Collision/hurt rectangles are local to the hull image.
    r['collisionInteractionObject'].update(x=0,y=10,w=248,h=100,baseW=248,baseH=100,ax=0,ay=0,rot=0)
    r['hurtInteractionObject'].update(x=-5,y=-104,w=285,h=216,baseW=285,baseH=216,ax=0,ay=0,rot=0)
    r['attackInteractionObject'].update(x=-105,y=-95,w=285,h=95,baseW=285,baseH=95,ax=0,ay=0,rot=0,followWeapon=0)
    common=copy.deepcopy(base['actionSettings']['idle']['interactions'])
    common['attackInteractionObject'].update(active=0,attack=0,followWeapon=0)
    common['guardInteractionObject'].update(active=0,guard=0)
    common['collisionInteractionObject'].update(active=1,collision=1,noOverlap=1,pushPower=8)
    common['hurtInteractionObject'].update(active=1,hurt=1,hurtByAttack=1)
    t['customActions']=[{'key':key,'name':name,'trigger':{'type':'single','keys':[code],'triggerMode':'tap'}}
        for key,name,code in [('tankDrive','전차 접근','ArrowRight'),('tankCharge','예고 후 충각 돌진','Q')]]
    t['actionNames']={a['key']:a['name'] for a in t['customActions']}
    t['actionTriggers']={a['key']:a['trigger'] for a in t['customActions']}
    t['deletedActionKeys']=sorted(set(t.get('deletedActionKeys',[])+['powderWalk','powderThrow','mageFloat','mageFire']))
    t['actionSettings']={};t['actionOffsets']={}
    for key,duration in [('idle',1.4),('fall',1.4),('hurt',.3),('death',1.1),('tankDrive',1),('tankCharge',3.4)]:
        count=round(duration*10)
        t['actionSettings'][key]=dict(duration=duration,playback='loop' if key in ['idle','fall'] else 'once',
            playbackRate=1,mirror=True,condition='ground' if key.startswith('tank') else 'any',
            group='movement' if key=='tankDrive' else 'base',blendFrames=0,interruptible=True,
            quarterAttackPlane='height',interactions=copy.deepcopy(common),formulas=[])
        t['actionOffsets'][key]={'master':timeline([(0,0),(.5,-1),(1,0)],'y'),
            'cape':timeline([(0,0),(.5,-3),(1,0)]),'shield':timeline([(0,0),(.5,2),(1,0)])}
        if key.startswith('tank'):
            t['actionSettings'][key]['formulas']=[dict(type='ai',enabled=True,startFrame=1,endFrame=count),
                dict(type='velocity',enabled=True,startFrame=1,endFrame=count,x=7 if key=='tankDrive' else 0,y=0,mode='set',curve='linear')]
    t['actionSettings']['tankDrive']['ai']=dict(enabled=True,minRange=400,maxRange=99999,cooldown=0,chance=100,priority=0)
    charge=t['actionSettings']['tankCharge']
    charge['ai']=dict(enabled=True,minRange=0,maxRange=680,cooldown=6,chance=100,priority=10)
    charge['formulas'].append(dict(type='lock',enabled=True,startFrame=1,endFrame=34,direction='right'))
    charge['interactions']['attackInteractionObject'].update(active=1,attack=1,followWeapon=0,startFrame=11,endFrame=22,
        hitMode='trace',knockback=28,knockbackExtraVx=0,knockbackExtraVy=0)
    # Allow the hull to pass during the strike; damage/knockback handles the impact.
    charge['interactions']['collisionInteractionObject']['noOverlap']=0
    t['actionOffsets']['tankCharge']['master']=timeline([(0,0),(.22,-2),(.29,-2),(.32,1),(.55,1),(.65,-3),(.8,0),(1,0)])
    for offsets in t['actionOffsets'].values():
        offsets['attackInteractionObject']={'followWeapon':0,'start':{'followWeapon':0},'end':{'followWeapon':0}}
    t['actionOffsets']['tankCharge']['collisionInteractionObject']={'start':{'noOverlap':0},'end':{'noOverlap':0}}
    t['layerOrder']=['cape','shield','backpack','leftLeg','rightLeg','collar','head','leftArm','rightArm','body','weapon']
    return t


def main():
    path=ROOT/'data/draft.json';s=json.loads(path.read_text())
    definition=dict(id='ram_tank',type='enemy',label='충각 전차장',name='충각 전차장',x=1500,
        folder='bosses/ram_tank',storageFolder='bosses/ram_tank',group='bosses',tint='#c4a35b',deleted=False,deletable=True,psdFileName='enemy.psd')
    s['characters']=[c for c in s['characters'] if c['id']!='ram_tank']+[definition]
    s['actors']['ram_tank']={'name':'충각 전차장','assets':{'__parts':list(PARTS)},'tuning':author(s['actors']['powder_chief']['tuning'])}
    for session in s['sessions'].values():
        session['stageRules']['enemy'].setdefault('spawnRulesByActor',{})['ram_tank']={'maxAlive':1,'intervalSec':40}
    path.write_text(json.dumps(s,ensure_ascii=False,separators=(',',':'))+'\n')
    (ROOT/'assets/characters/bosses/ram_tank/character.json').write_text(json.dumps({'version':1,**definition},ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    main()
