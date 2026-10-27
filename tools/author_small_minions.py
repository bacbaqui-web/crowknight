"""Apply approved small knight bodies without overwriting source PSDs or PNGs."""
import copy
import json
from pathlib import Path
from author_powder_chief import part, frames
from release_snapshot import store_image
ROOT = Path(__file__).resolve().parents[1]
BODY_PARTS = ['head','body','upperArmL','lowerArmL','upperArmR','lowerArmR','upperLegL','lowerLegL','upperLegR','lowerLegR']


def redesign(actor, sword, bag, balloon=False):
    a=copy.deepcopy(actor);t=a['tuning'];r=t['rig'];assets=a['assets']
    for key in BODY_PARTS: assets[key]=sword['assets'][key]
    assets['collar' if balloon else 'cape']=sword['assets']['cape']
    if not balloon: assets['backpack']=bag;a['name']='함정요정'
    assets['__snapshot']=True
    t['transform']={'scale':sword['tuning']['transform']['scale']*.7,'anchorX':0,'anchorY':0}
    r.update(body=part(-22,-65,44,40),head=part(-17,-104,34,40),neck={'x':0,'y':0,'rot':0})
    scarf=part(-25,-68,50,18)
    r['collar' if balloon else 'cape']=scarf
    for side,x in [('L',-18),('R',18)]:
        r['shoulder'+side]={'x':x,'y':-58,'ax':0,'ay':0,'w':1,'h':1,'rot':0,'opacity':1}
        r['upperArm'+side]=part(-7,-2,14,20,7,2)
        r['lowerArm'+side]=part(-7,-2,15,19,7,2)
        r['hip'+side]={'x':-10 if side=='L' else 10,'y':-28,'ax':0,'ay':0,'w':1,'h':1,'rot':0,'opacity':1}
        r['upperLeg'+side]=part(-6,-2,13,15,6,2)
        r['lowerLeg'+side]=part(-6,-2,13,17,6,2)
    if balloon:
        r['backpack']['opacity']=0
        r['cape']=part(-65,-230,130,124)
        r['hurtInteractionObject'].update(x=-65,y=-230,w=130,h=124,baseW=130,baseH=124,ax=0,ay=0)
        for offsets in t['actionOffsets'].values():
            offsets.update(shoulderL={'rot':10},shoulderR={'rot':-30},backpack={'opacity':0},collar={'opacity':1})
            offsets['cape']={}
        t['layerOrder']=['cape','balloonRopes','leftLeg','rightLeg','body','head','collar','balloonBelt','leftArm','rightArm','weapon']
    else:
        r['backpack']=part(-47,-80,40,53)
        for key in ['hurtInteractionObject','collisionInteractionObject']:
            r[key].update(x=-22,y=-100,w=44,h=100,baseW=44,baseH=100,ax=0,ay=0)
        for offsets in t['actionOffsets'].values():
            offsets.update(shoulderL={'rot':12},shoulderR={'rot':-12},weapon={'opacity':0})
        walk=t['actionOffsets']['trapWalk']
        for side,sign in [('L',1),('R',-1)]:
            walk['shoulder'+side]=frames([(0,sign*28),(.5,-sign*28),(1,sign*28)])
        walk['backpack']=frames([(0,0),(.25,-4),(.5,0),(.75,-4),(1,0)],'y')
        t['actionSettings']['trapWalk']['duration']=.45
        t['actionSettings']['trapWalk']['formulas'][0].update(x=14,endFrame=5)
        pose=t['actionOffsets']['trapSet']
        pose['shoulderR']=frames([(0,20),(.2,130),(.4,0),(.7,0),(1,0)])
        pose['shoulderL']=frames([(0,0),(.4,-10),(.7,-10),(1,0)])
        pose['weapon']=frames([(0,0),(.25,0),(.3,1),(.54,1),(.55,0),(1,0)],'opacity')
        t['layerOrder']=['backpack','leftLeg','rightLeg','body','head','cape','leftArm','rightArm','weapon']
    return a


def main():
    public=json.loads((ROOT/'data/published.json').read_text())
    bag=store_image(ROOT,(ROOT/'assets/characters/mobs/trapper/redesign-v2/trap-backpack.png').read_bytes(),'.png')
    for filename in ['draft.json','beta.json','published.json']:
        path=ROOT/'data'/filename
        if not path.exists(): continue
        state=json.loads(path.read_text())
        for id in ['trapper','balloon_bomber']:
            base=copy.deepcopy(state['actors'][id])
            # Draft sources may be folder-based; preserve the current published prop snapshots.
            base['assets']=copy.deepcopy(public['actors'][id]['assets'])
            state['actors'][id]=redesign(base,public['actors']['swordman'],bag,id=='balloon_bomber')
        for c in state.get('characters',[]):
            if c['id']=='trapper': c['name']=c['label']='함정요정'
        path.write_text(json.dumps(state,ensure_ascii=False,separators=(',',':'))+'\n')
    print(bag)

if __name__=='__main__': main()
