"""Author a waist-supported, forward-drooping balloon grunt using a separate rope sprite."""
import json
from pathlib import Path
from author_powder_chief import part
from release_snapshot import store_image
ROOT=Path(__file__).resolve().parents[1]


def apply_suspension(actor, rope):
    actor['assets']['backpack']=rope
    t=actor['tuning'];r=t['rig']
    r['body']=part(-22,-65,44,40,22,37);r['body']['rot']=70
    r['head']=part(34,-37,34,40,17,20);r['head']['rot']=65
    r['collar']=part(19,-45,50,18,25,9);r['collar']['rot']=65
    r['neck']={'x':0,'y':0,'rot':0}
    r['shoulderL'].update(x=20,y=-34,rot=0)
    r['shoulderR'].update(x=40,y=-23,rot=0)
    r['hipL'].update(x=-18,y=-27,rot=0)
    r['hipR'].update(x=-6,y=-22,rot=0)
    r['backpack'].update(opacity=0)
    r['hurtInteractionObject'].update(parent='cape',x=0,y=0,w=130,h=124,baseW=130,baseH=124,ax=0,ay=0)
    r['weapon']=part(-7,0,18,25,7,0)
    for offsets in t['actionOffsets'].values():
        for key in ['shoulderL','shoulderR','upperArmL','upperArmR','lowerArmL','lowerArmR','hipL','hipR','lowerLegL','lowerLegR']:
            offsets[key]={'rot':0}
        offsets['weapon']={'rot':0}
    t['layerOrder']=['cape','balloonRopes','leftLeg','rightLeg','leftArm','body','collar','head','balloonBelt','rightArm','weapon']


def main():
    rope=store_image(ROOT,(ROOT/'assets/characters/mobs/balloon_bomber/redesign-v2/suspension-rope.png').read_bytes(),'.png')
    for filename in ['draft.json','beta.json','published.json']:
        p=ROOT/'data'/filename;d=json.loads(p.read_text());apply_suspension(d['actors']['balloon_bomber'],rope)
        p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n')
    print(rope)
if __name__=='__main__':main()
