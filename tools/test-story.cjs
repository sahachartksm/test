const assert = require('node:assert/strict');
const fs = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');

require('../story/brain.js');
require('../story/engine.js');
const {opening} = globalThis.LoveBrain;
const game = globalThis.LoveGame;
const root = join(__dirname,'..');
const current = state => state.records.at(-1);
const replay = actions => actions.reduce((state,action) => game.step(state,action),game.start());

test('all twelve endings are reachable and every playable scene has a still', () => {
  const reached = new Set();
  const endings = new Set();

  function visit(state) {
    const scene = current(state);
    reached.add(scene.sceneId);
    if (scene.ending) {
      endings.add(scene.ending);
      assert(scene.text.length >= 3,scene.ending);
      return;
    }
    assert(scene.options.some(option => !option.disabled),scene.sceneId);
    for (const option of scene.options.filter(choice => !choice.disabled)) {
      const next = game.step(state,option.id);
      assert(current(next).day >= scene.day,option.id);
      assert(next.records.length <= Object.keys(opening.scenes).length,'route cycle');
      visit(next);
    }
  }

  visit(game.start());
  assert.equal(reached.size,Object.keys(opening.scenes).length);
  assert.equal(endings.size,12);
  const endingArt = new Set();
  for (const [id,scene] of Object.entries(opening.scenes)) {
    const folder = scene.art.startsWith('novel/') ? '' : 'alpha/';
    assert(fs.existsSync(join(root,'assets','scenes',folder,scene.art + '.webp')),id);
    if (scene.ending) endingArt.add(scene.art);
  }
  assert.equal(endingArt.size,endings.size);
  for (const route of Object.keys(opening.routes)) {
    assert.equal([...endings].filter(id => id.startsWith(route + '-')).length,4);
  }
});

test('a promise changes what the confession means and the route to reconciliation', () => {
  const entry = ['sleep-cafe','pick-street','show'];
  const promised = replay([...entry,'commit','press']);
  const waiting = replay([...entry,'open','press']);
  assert.match(current(promised).text.at(-1),/ยังเป็นแฟน/);
  assert.match(current(waiting).text.at(-1),/ยังไม่ได้ตกลงคบ/);
  const good = game.step(game.step(promised,'read'),'stay');
  assert.equal(current(good).ending,'beta-rebuild');
  const concealed = game.step(game.step(replay([...entry,'commit','smooth']),'read'),'stay');
  assert.equal(current(concealed).ending,'beta-carry');
  assert.match(current(concealed).text[0],/แต่งงาน/);
  assert.equal(good.offstage.filter(note => note.day === 16).length,3);
  assert.equal(new Set(good.offstage.map(note => note.person + note.day)).size,good.offstage.length);
});

test('an existing Alpha save can continue without rewriting earlier scenes', () => {
  const legacy = replay(['sleep-cafe','pick-ferry','keep-appointment']);
  delete legacy.flags;
  delete legacy.offstage;
  current(legacy).options = [];
  current(legacy).prompt = 'รอคำตอบของกานต์';
  const restored = game.restore(JSON.parse(JSON.stringify(legacy)));
  assert.equal(current(restored).options.length,3);
  const next = game.step(restored,'meet-darin');
  assert.equal(current(next).sceneId,'alpha-return');
  assert.deepEqual(next.records.slice(0,3),legacy.records.slice(0,3));
  assert.deepEqual(current(game.restore(next)).text,current(next).text);
});
