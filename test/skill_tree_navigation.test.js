import test from 'node:test';
import assert from 'node:assert/strict';
import {skillTreeLayout,adjacentSkillNode} from '../src/skill_tree_choice_view.js';
test('directional inspection reaches locked leaves and returns to prerequisite without choosing',()=>{
 const nodes=skillTreeLayout('attack');
 assert.equal(adjacentSkillNode(nodes,'fifthStrike','ArrowRight').id,'chargeAttack');
 assert.equal(adjacentSkillNode(nodes,'fifthStrike','ArrowUp').depth,2);
 assert.equal(adjacentSkillNode(nodes,'sixthStrike','ArrowDown').id,'fifthStrike');
 assert.equal(adjacentSkillNode(nodes,'attackRoot','ArrowDown'),null);
 assert.equal(adjacentSkillNode(nodes,'sixthStrike','ArrowLeft'),null);
});
