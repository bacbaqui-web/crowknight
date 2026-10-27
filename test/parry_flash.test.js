import test from 'node:test';
import assert from 'node:assert/strict';
import {updateFormulaColorChanges} from '../src/color_change_formula_runtime_helper.js';
import {COMBAT_SOUNDS} from '../src/combat_sound_catalog.js';
test('parry uses the boss white silhouette tint and releases it after the flash',()=>{
 const actor={player:{actionKey:'guard',actionSettings:{},runParryFlash:.25}};
 updateFormulaColorChanges([actor]);
 assert.equal(actor.player.formulaTintColor,'#ffffff');assert.equal(actor.player.formulaTintOpacity,1);
 actor.player.runParryFlash=0;updateFormulaColorChanges([actor]);
 assert.equal(actor.player.formulaTintColor,null);assert.equal(actor.player.formulaTintOpacity,0);
 assert.equal(COMBAT_SOUNDS.parry.rate,.85);
});
