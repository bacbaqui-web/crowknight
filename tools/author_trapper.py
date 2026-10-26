"""Author the approved trap-setter grunt with independently editable parts."""
import copy
import json
from pathlib import Path
from author_balloon_bomber import PARTS
from author_powder_chief import part, frames
ROOT = Path(__file__).resolve().parents[1]


def author(base):
    t=copy.deepcopy(base)
    t.update(maxHp=40,transform=dict(scale=.85,anchorX=0,anchorY=0),hud={'offsetY':-15},motion={},modifiers=[],effectOffsets={},effectSettings={})
    r=t['rig'];r.pop('flame',None)
    r.update(body=part(-25,-85,50,55),head=part(-27,-137,54,55),neck=dict(x=0,y=0,rot=0),
             cape=part(-37,-99,70,55),backpack=part(-37,-62,28,34),weapon=part(-6,-8,42,27,6,8))
    r['collar']['opacity']=0;r['shield']['opacity']=0
    for side,x in [('L',-23),('R',23)]:
        r['shoulder'+side]=dict(x=x,y=-79,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
        r['upperArm'+side]=part(-10,-3,21,28,10,3);r['lowerArm'+side]=part(-10,-3,23,29,10,3)
        r['hip'+side]=dict(x=-12 if side=='L' else 12,y=-36,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
        r['upperLeg'+side]=part(-9,-2,20,23,9,2);r['lowerLeg'+side]=part(-9,-2,25,25,9,2)
    for key in ['hurtInteractionObject','collisionInteractionObject']:
        r[key].update(x=0,y=-50,w=50,h=132,baseW=50,baseH=132,ax=0,ay=0,rot=0)
    common=copy.deepcopy(base['actionSettings']['idle']['interactions'])
    common['collisionInteractionObject'].update(active=1,collision=1,noOverlap=1)
    common['attackInteractionObject'].update(active=0,attack=0)
    common['guardInteractionObject'].update(active=0,guard=0)
    common['hurtInteractionObject'].update(active=1,hurt=1,hurtByAttack=1)
    t['customActions']=[{'key':k,'name':n,'trigger':{'type':'single','keys':[],'triggerMode':'tap'}} for k,n in [('trapWalk','덫 사냥꾼 이동'),('trapSet','쥐덫 설치')]]
    t['actionNames']={a['key']:a['name'] for a in t['customActions']};t['actionTriggers']={a['key']:a['trigger'] for a in t['customActions']}
    t['deletedActionKeys']=sorted(set(t.get('deletedActionKeys',[])+['powderWalk','powderThrow']))
    t['actionSettings']={};t['actionOffsets']={}
    rest={'shoulderL':{'rot':8},'shoulderR':{'rot':-65},'lowerArmR':{'rot':-15},'collar':{'opacity':0},'shield':{'opacity':0}}
    for key,duration in [('idle',1.2),('fall',.6),('hurt',.25),('death',1.1),('trapWalk',.7),('trapSet',1.0)]:
        t['actionSettings'][key]=dict(duration=duration,playback='once',playbackRate=1,mirror=True,condition='ground' if key in ['trapWalk','trapSet'] else 'any',blendFrames=1,interruptible=True,
           group='movement' if key=='trapWalk' else 'base',interactions=copy.deepcopy(common),formulas=[])
        t['actionOffsets'][key]=copy.deepcopy(rest)
    walk=t['actionOffsets']['trapWalk']
    for side,sign in [('L',1),('R',-1)]:walk['hip'+side]=frames([(0,sign*23),(.5,-sign*23),(1,sign*23)])
    walk['master']=frames([(0,0),(.25,-3),(.5,0),(.75,-3),(1,0)],'y')
    t['actionSettings']['trapWalk']['formulas']=[dict(type='velocity',enabled=True,startFrame=1,endFrame=7,x=10,y=0,mode='set',curve='linear')]
    pose=t['actionOffsets']['trapSet']
    pose['master']=frames([(0,0),(.3,24),(.7,24),(1,0)],'y')
    for side in ['L','R']:
        pose['hip'+side]=frames([(0,0),(.3,-45),(.7,-45),(1,0)])
        pose['lowerLeg'+side]=frames([(0,0),(.3,65),(.7,65),(1,0)])
        pose['shoulder'+side]=frames([(0,-30),(.4,-45),(.65,-45),(1,-30)])
    pose['weapon']=frames([(0,1),(.54,1),(.55,0),(.9,0),(1,1)],'opacity')
    t['actionSettings']['trapSet']['formulas']=[dict(type='velocity',enabled=True,startFrame=1,endFrame=10,x=0,y=0,mode='set',curve='linear')]
    t['layerOrder']=['cape','leftLeg','rightLeg','body','head','leftArm','backpack','rightArm','weapon']
    return t


def main():
    p=ROOT/'data/draft.json';s=json.loads(p.read_text())
    d=dict(id='trapper',type='enemy',label='덫 사냥꾼',name='덫 사냥꾼',x=1850,folder='mobs/trapper',storageFolder='mobs/trapper',group='mobs',tint='#b49a5b',deleted=False,deletable=True,psdFileName='enemy.psd')
    s['characters']=[c for c in s['characters'] if c['id']!='trapper']+[d]
    s['actors']['trapper']={'name':'덫 사냥꾼','assets':{'__parts':list(PARTS)},'tuning':author(s['actors']['powder_chief']['tuning'])}
    for session in s['sessions'].values():session['stageRules']['enemy'].setdefault('spawnRulesByActor',{})['trapper']={'maxAlive':2,'intervalSec':14}
    p.write_text(json.dumps(s,ensure_ascii=False,separators=(',',':'))+'\n')
    (ROOT/'assets/characters/mobs/trapper/character.json').write_text(json.dumps({'version':1,**d},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
