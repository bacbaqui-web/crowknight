"""Author the approved powder chief as independent editable puppet parts/actions."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = 'bosses/powder_chief'
PARTS = {'body':'body', 'head':'head', 'cape':'cape', 'backpack':'backpack', 'collar':'collar',
         'upperArmL':'upper_arm_l', 'lowerArmL':'lower_arm_l', 'upperArmR':'upper_arm_r',
         'lowerArmR':'lower_arm_r', 'upperLegL':'upper_leg_l', 'lowerLegL':'lower_leg_l',
         'upperLegR':'upper_leg_r', 'lowerLegR':'lower_leg_r', 'weapon':'weapon'}


def part(x, y, w, h, ax=None, ay=0):
    return dict(x=x, y=y, w=w, h=h, baseW=w, baseH=h, ax=w/2 if ax is None else ax,
                ay=ay, rot=0, opacity=1, anchorOffsetX=0, anchorOffsetY=0, anchorMode='local')


def frames(values, prop='rot'):
    return {'keyframes':[dict(id=f'powder_{i}', t=t, **{prop:v}) for i,(t,v) in enumerate(values)]}


def author(base):
    t = copy.deepcopy(base)
    t.update(maxHp=360, transform=dict(scale=1.4, anchorX=0, anchorY=0), hud={'offsetY':-15},
             modifiers=[], motion={}, effectOffsets={}, effectSettings={}, actionTriggers={})
    rig = t['rig']
    rig.update(body=part(-33,-85,66,56), head=part(-28,-145,57,62), neck={'x':0,'y':0,'rot':0},
               cape=part(-54,-106,87,102), backpack=part(-79,-139,92,97),
               collar=part(-33,-94,67,39), weapon=part(-12,-22,24,32,12,24))
    for side,x in [('L',-29),('R',28)]:
        rig['shoulder'+side]=dict(x=x,y=-82,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
        rig['upperArm'+side]=part(-12,-4,26,29,12,4)
        rig['lowerArm'+side]=part(-11,-4,24,31,11,4)
        rig['hip'+side]=dict(x=-15 if side=='L' else 16,y=-38,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
        rig['upperLeg'+side]=part(-13,-3,27,23,13,3)
        rig['lowerLeg'+side]=part(-13,-2,32,25,13,2)
    for key in ['collisionInteractionObject','hurtInteractionObject']:
        rig[key].update(x=33,y=2,ax=0,ay=0,w=66,h=140,baseW=66,baseH=140,rot=0,followWeapon=0)
        # Interaction object is in the body's image-local coordinates.
        rig[key].update(x=0,y=-55)
    rig['shield']['opacity']=0
    rig['guardInteractionObject'].update(active=0,guard=0)
    rig['attackInteractionObject'].update(active=0,attack=0)
    t['layerOrder']=['cape','backpack','rightLeg','leftLeg','body','collar','head','leftArm','rightArm','weapon']
    t['customActions']=[{'key':key,'name':name,'trigger':{'type':'single','keys':[code],'triggerMode':'tap'}}
                       for key,name,code in [('powderWalk','무거운 걸음','ArrowRight'),('powderThrow','화약 폭탄 투척','Q')]]
    t['actionNames']={a['key']:a['name'] for a in t['customActions']}
    t['actionTriggers']={a['key']:a['trigger'] for a in t['customActions']}
    t['deletedActionKeys']=[k for k in t['actionSettings'] if k.startswith('custom')]
    common={'collisionInteractionObject':{'active':1,'collision':1,'noOverlap':1},
            'hurtInteractionObject':{'active':1,'hurt':1,'hurtByAttack':1,'invincibleTime':0.15},
            'attackInteractionObject':{'active':0,'attack':0,'knockback':28},
            'guardInteractionObject':{'active':0,'guard':0}}
    t['actionSettings']={key:dict(duration=duration,playback='once' if key in ['hurt','death'] else 'loop',
                         playbackRate=1,mirror=True,condition='any',blendFrames=2,interactions=copy.deepcopy(common),formulas=[])
                         for key,duration in [('idle',1.2),('fall',.6),('hurt',.3),('death',1.1)]}
    rest={'shoulderL':{'rot':12},'shoulderR':{'rot':-30}}
    t['actionOffsets']={key:copy.deepcopy(rest) for key in t['actionSettings']}
    t['actionOffsets']['idle']['master']=frames([(0,0),(.5,-1.2),(1,0)],'y')
    for key,duration,ranges,cooldown in [('powderWalk',1.0,(380,99999),0),('powderThrow',2.4,(0,620),4.8)]:
        count=round(duration*10)
        settings=dict(duration=duration,playback='once',playbackRate=1,mirror=True,condition='ground',
                      blendFrames=2,interruptible=True,interactions=copy.deepcopy(common),
                      ai=dict(enabled=True,minRange=ranges[0],maxRange=ranges[1],cooldown=cooldown,chance=100,priority=10 if key=='powderThrow' else 0),
                      formulas=[dict(type='ai',enabled=True,startFrame=1,endFrame=count)])
        t['actionSettings'][key]=settings
        t['actionOffsets'][key]=copy.deepcopy(rest)
    walk=t['actionOffsets']['powderWalk']
    for side,sign in [('L',1),('R',-1)]:
        walk['hip'+side]=frames([(0,sign*16),(.5,-sign*16),(1,sign*16)])
    walk['master']=frames([(0,0),(.25,-2),(.5,0),(.75,-2),(1,0)],'y')
    t['actionSettings']['powderWalk']['formulas'].append(dict(type='velocity',enabled=True,startFrame=1,endFrame=10,x=12,y=0,mode='set',curve='linear'))
    throw=t['actionOffsets']['powderThrow']
    throw['shoulderR']=frames([(0,-30),(.25,-145),(.32,-145),(.42,-75),(.65,-25),(1,-30)])
    throw['master']=frames([(0,0),(.3,-3),(.42,3),(.7,0),(1,0)],'x')
    throw['weapon']=frames([(0,1),(.32,1),(.333,0),(.85,0),(.92,1),(1,1)],'opacity')
    t['actionSettings']['powderThrow']['formulas'] += [
        dict(type='velocity',enabled=True,startFrame=1,endFrame=24,x=0,y=0,mode='set',curve='linear'),
        dict(type='projectile',enabled=True,startFrame=1,endFrame=24,spawnFrame=9,imageKey='none',offsetX=74,offsetY=-114,flightFrames=10,arcHeight=100,hitboxWidth=28,hitboxHeight=34)]
    return t


def main():
    draft_path=ROOT/'data/draft.json'
    state=json.loads(draft_path.read_text())
    definition=dict(id='powder_chief',type='enemy',label='화약 공병장',name='화약 공병장',x=1100,
                    folder=FOLDER,storageFolder=FOLDER,group='bosses',tint='#b19a56',deleted=False,deletable=True,psdFileName='enemy.psd')
    state['characters']=[c for c in state['characters'] if c['id']!='powder_chief']+[definition]
    state['actors']['powder_chief']={'name':'화약 공병장','assets':{'__parts':list(PARTS)},'tuning':author(state['actors']['swordman']['tuning'])}
    for session in state['sessions'].values():
        enemy=session['stageRules']['enemy']
        enemy.setdefault('spawnRulesByActor',{})['powder_chief']={'maxAlive':1,'intervalSec':30}
    draft_path.write_text(json.dumps(state,ensure_ascii=False,separators=(',',':'))+'\n')
    (ROOT/'assets/characters'/FOLDER/'character.json').write_text(json.dumps({'version':1,**definition},ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    main()
