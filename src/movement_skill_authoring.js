import { clone } from './common_helper.js';
export function prepareMovementActions(tuning) {
  const actions=tuning.customActions, bindings=tuning.skillActions;
  const find=name=>actions.find(action=>action.name===name)?.key;
  bindings.sprint ||= find('질주');bindings.roll ||= find('구르기');
  function add(id,name,source,trigger,condition) {
    if(bindings[id] && actions.some(action=>action.key===bindings[id])) return;
    const key=`skill_${id}`;
    actions.push({key,name,trigger});bindings[id]=key;tuning.actionTriggers[key]=clone(trigger);
    tuning.actionSettings[key]={...clone(tuning.actionSettings[source]||tuning.actionSettings.idle), duration:.4,playback:'once',condition,group:'movement',formulas:[{type:'cancel',enabled:true,startFrame:1,endFrame:50,priority:0}]};
    if(tuning.actionSettings[key].runtimeRules?.link) tuning.actionSettings[key].runtimeRules.link.enabled=false;
    tuning.actionOffsets[key]=clone(tuning.actionOffsets[source]||tuning.actionOffsets.idle);
    // Movement skills apply their damage through the movement combat controller, not copied attack boxes.
    for(const [part,value] of Object.entries(tuning.actionOffsets[key])) {
      if(!part.toLowerCase().includes('attackinteraction')) continue;
      for(const frame of [value.start,value.end,...(value.keyframes||[])].filter(Boolean)) {frame.attack=0;frame.active=0;}
    }
    tuning.effectOffsets[key]=clone(tuning.effectOffsets[source]||{});
    tuning.effectSettings[key]=clone(tuning.effectSettings[source]||{});
  }
  if(!bindings.sprint) {
    add('sprint','달리기',find('걷기')||'idle',{type:'single',keys:['Shift'],triggerMode:'pressLoop'},'ground');
    tuning.actionSettings[bindings.sprint].formulas.push({type:'velocity',enabled:true,startFrame:1,endFrame:50,x:90,y:0,mode:'set'});
  }
  if(!bindings.roll) {
    add('roll','구르기','idle',{type:'single',keys:['W'],triggerMode:'tap'},'ground');
    tuning.actionSettings[bindings.roll].formulas.push({type:'velocity',enabled:true,startFrame:1,endFrame:2,x:80,y:0,mode:'set'});
  }
  add('plunge','까마귀 강하',bindings.fourthStrike,{type:'single',keys:['F'],triggerMode:'tap'},'air');
  add('glide','활강',bindings.doubleJump,{type:'sequence',keys:['F','F','F','F'],maxGapMs:1,triggerMode:'tap'},'air');
  add('blink','순보',bindings.roll,{type:'single',keys:['W'],triggerMode:'tap'},'ground');
}
