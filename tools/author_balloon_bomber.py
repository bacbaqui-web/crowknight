"""Bake the approved plain balloon grunt and independent animation parts."""
import copy
import json
from pathlib import Path
from author_powder_chief import part
from author_ram_tank import timeline
ROOT=Path(__file__).resolve().parents[1]
PARTS={'body':'body','head':'head','cape':'cape','backpack':'backpack','collar':'collar','shield':'shield','weapon':'weapon',
       'upperArmL':'upper_arm_l','lowerArmL':'lower_arm_l','upperArmR':'upper_arm_r','lowerArmR':'lower_arm_r',
       'upperLegL':'upper_leg_l','lowerLegL':'lower_leg_l','upperLegR':'upper_leg_r','lowerLegR':'lower_leg_r'}

def author(base):
 t=copy.deepcopy(base)
 t.update(maxHp=20,transform=dict(scale=.8,anchorX=0,anchorY=0),hud={'offsetY':-130},motion={},modifiers=[],effectOffsets={},effectSettings={})
 r=t['rig'];r.pop('flame',None)
 r.update(body=part(-22,-86,44,51),head=part(-25,-130,50,48),neck=dict(x=0,y=0,rot=0),
          cape=part(-65,-267,130,124),backpack=part(-29,-147,58,94),collar=part(-35,-59,22,25),
          weapon=part(-7,0,18,25,7,1),shield=part(-62,-265,120,100))
 for side,x in [('L',-20),('R',20)]:
  r['shoulder'+side]=dict(x=x,y=-80,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
  r['upperArm'+side]=part(-9,-3,18,28,9,3);r['lowerArm'+side]=part(-9,-3,21,28,9,3)
  r['hip'+side]=dict(x=-11 if side=='L' else 11,y=-39,ax=0,ay=0,w=1,h=1,rot=0,opacity=1)
  r['upperLeg'+side]=part(-8,-2,17,23,8,2);r['lowerLeg'+side]=part(-8,-2,22,25,8,2)
 # Only the balloon is a hurt target; grounded attacks are separately rejected.
 r['hurtInteractionObject'].update(x=-43,y=-181,w=130,h=124,baseW=130,baseH=124,ax=0,ay=0,rot=0)
 common=copy.deepcopy(base['actionSettings']['idle']['interactions'])
 common['collisionInteractionObject'].update(active=0,collision=0,noOverlap=0)
 common['attackInteractionObject'].update(active=0,attack=0)
 common['guardInteractionObject'].update(active=0,guard=0)
 common['hurtInteractionObject'].update(active=1,hurt=1,hurtByAttack=1)
 t['customActions']=[{'key':'balloonHover','name':'풍선 부유','trigger':{'type':'single','keys':[],'triggerMode':'tap'}}]
 t['actionNames']={'balloonHover':'풍선 부유'};t['actionTriggers']={'balloonHover':t['customActions'][0]['trigger']}
 t['deletedActionKeys']=sorted(set(t.get('deletedActionKeys',[])+['powderWalk','powderThrow']))
 t['actionSettings']={};t['actionOffsets']={}
 for key,duration in [('idle',2),('fall',2),('hurt',.2),('death',1.2),('balloonHover',2)]:
  t['actionSettings'][key]=dict(duration=duration,playback='loop',playbackRate=1,mirror=True,condition='any',blendFrames=0,
      group='base',interactions=copy.deepcopy(common),formulas=[])
  t['actionOffsets'][key]={'shoulderL':{'rot':175},'shoulderR':{'rot':-50},'hipL':{'rot':12},'hipR':{'rot':-10},
      'lowerLegL':{'rot':-16},'lowerLegR':{'rot':14},'shield':{'opacity':0},
      'cape':timeline([(0,-2),(.5,2),(1,-2)]),'upperArmR':timeline([(0,0),(.5,-12),(1,0)])}
 t['layerOrder']=['cape','backpack','leftLeg','rightLeg','body','head','leftArm','rightArm','weapon','collar']
 return t

def main():
 p=ROOT/'data/draft.json';s=json.loads(p.read_text())
 d=dict(id='balloon_bomber',type='enemy',label='풍선 폭격병',name='풍선 폭격병',x=1700,folder='mobs/balloon_bomber',storageFolder='mobs/balloon_bomber',group='mobs',tint='#a29264',deleted=False,deletable=True,psdFileName='enemy.psd')
 s['characters']=[c for c in s['characters'] if c['id']!='balloon_bomber']+[d]
 s['actors']['balloon_bomber']={'name':'풍선 폭격병','assets':{'__parts':list(PARTS)},'tuning':author(s['actors']['powder_chief']['tuning'])}
 for session in s['sessions'].values():session['stageRules']['enemy'].setdefault('spawnRulesByActor',{})['balloon_bomber']={'maxAlive':2,'intervalSec':12}
 p.write_text(json.dumps(s,ensure_ascii=False,separators=(',',':'))+'\n')
 (ROOT/'assets/characters/mobs/balloon_bomber/character.json').write_text(json.dumps({'version':1,**d},ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
