"""Author a waist-supported, forward-drooping balloon grunt using a separate rope sprite."""
import json
import math
from pathlib import Path
from author_powder_chief import part
from release_snapshot import store_image
ROOT=Path(__file__).resolve().parents[1]


def apply_suspension(actor, rope):
    actor['assets']['backpack']=rope
    t=actor['tuning'];r=t['rig']
    angle=math.radians(50)
    def lean(x,y):
        return (x*math.cos(angle)-(y+28)*math.sin(angle), -28+x*math.sin(angle)+(y+28)*math.cos(angle))
    r['body']=part(-22,-65,44,40,22,37);r['body']['rot']=50
    nx,ny=lean(0,-65)
    head_angle=math.radians(70)
    hx,hy=nx+20*math.sin(head_angle),ny-20*math.cos(head_angle)
    r['head']=part(hx-17,hy-20,34,40,17,20);r['head']['rot']=70
    cx,cy=lean(0,-59)
    r['collar']=part(cx-25,cy-9,50,18,25,9);r['collar']['rot']=50
    r['neck']={'x':0,'y':0,'rot':0}
    for side,x in [('L',-18),('R',18)]:
        sx,sy=lean(x,-58)
        r['shoulder'+side].update(x=sx,y=sy,rot=0)
        r['hip'+side].update(x=-10 if side=='L' else 10,y=-28,rot=0)
    r['backpack'].update(opacity=0)
    r['hurtInteractionObject'].update(parent='cape',x=0,y=0,w=130,h=124,baseW=130,baseH=124,ax=0,ay=0)
    r['weapon']=part(-7,0,18,25,7,0)
    for offsets in t['actionOffsets'].values():
        for key in ['shoulderL','shoulderR','upperArmL','upperArmR','lowerArmL','lowerArmR','hipL','hipR','lowerLegL','lowerLegR']:
            offsets[key]={'rot':0}
        offsets['weapon']={'rot':0}
    t['layerOrder']=['balloonRopes','cape','leftLeg','rightLeg','leftArm','body','collar','head','balloonBelt','rightArm','weapon']


def main():
    rope=store_image(ROOT,(ROOT/'assets/characters/mobs/balloon_bomber/redesign-v2/suspension-rope.png').read_bytes(),'.png')
    for filename in ['draft.json','beta.json','published.json']:
        p=ROOT/'data'/filename;d=json.loads(p.read_text());apply_suspension(d['actors']['balloon_bomber'],rope)
        p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n')
    print(rope)
if __name__=='__main__':main()
