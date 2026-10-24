import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_PATHS, progressionChoices, progressionGraph } from '../src/skill_progression_data.js';

for (const path of SKILL_PATHS) {
  test(`${path.name} 지도 전체 연결이 실제 게임의 좌우 선택과 일치한다`, () => {
    const graph = progressionGraph(path.id);
    const byId = new Map(graph.map(node => [node.id, node]));
    assert.equal(byId.size, graph.length);
    const queue = [{ id: path.root, route: [0] }];
    const visited = new Set();
    for (let index = 0; index < queue.length; index++) {
      const { id, route } = queue[index];
      if (visited.has(id)) continue;
      visited.add(id);
      const node = byId.get(id);
      assert.ok(node.name && node.detail);
      const choices = progressionChoices(path.id, route).filter(choice => !choice.reinforce);
      if (!node.children.length) {
        assert.equal(choices.length, 1);
        assert.equal(choices[0].nodeId, node.id);
        assert.equal(choices[0].mastery, true);
        continue;
      }
      assert.ok(node.children.every(child => byId.get(child).depth > node.depth));
      assert.deepEqual(node.children.map(child => byId.get(child).effectId), choices.map(choice => choice.effectId));
      node.children.forEach((child, direction) => queue.push({ id: child, route: [...route, direction] }));
    }
    assert.equal(visited.size, graph.length);
  });
}
