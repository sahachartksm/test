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
const replay = choices => choices.reduce((state,action) => game.step(state,action),game.start());
const entries = {
  alpha:['sleep-cafe','pick-ferry','keep-appointment','meet-darin'],
  beta:['sleep-cafe','pick-street'],
  gamma:['sleep-with-fueang']
};

function advance(state, overrides, until = () => false) {
  while (current(state).options.length && !until(current(state))) {
    const scene = current(state);
    const choice = overrides[scene.sceneId] ?? scene.options.find(option => !option.disabled).id;
    const next = game.step(state,choice);
    assert(current(next).day >= scene.day,choice);
    assert(next.records.length <= Object.keys(opening.scenes).length,'route cycle');
    state = next;
  }
  return state;
}

test('all scenes are reachable and use at least 100 distinct stills', () => {
  const reached = new Set();
  const pictures = new Set();
  function visit(id) {
    if (reached.has(id)) return;
    reached.add(id);
    const scene = opening.scenes[id];
    assert(scene.text.length >= 3,id);
    for (const art of [scene.art,scene.inlineArt].filter(Boolean)) {
      assert(art.startsWith('cinematic/'),art);
      assert(!pictures.has(art),art);
      pictures.add(art);
      assert(fs.existsSync(join(root,'assets','scenes',art + '.webp')),art);
    }
    for (const option of scene.options.filter(choice => !choice.disabled)) {
      visit(option.next);
      if (option.alternate) visit(option.alternate.next);
    }
  }
  visit(opening.start);
  assert.equal(reached.size,Object.keys(opening.scenes).length);
  assert(pictures.size >= 100);
});

test('all twelve endings play normally and each route is at least twice its previous length', () => {
  const previousLengths = {alpha:10,beta:8,gamma:7};
  for (const [route,entry] of Object.entries(entries)) {
    for (const [ending,lastChoice] of Object.entries({ask:'say',rebuild:'stay',carry:'stay',leave:'leave'})) {
      const state = advance(replay(entry),{
        [route + '-clue']:ending === 'carry' ? 'smooth' : 'press',
        [route + '-decision']:lastChoice
      });
      assert.equal(current(state).ending,route + '-' + ending);
      assert(current(state).inlineArt,'second epilogue still');
      assert(state.records.length >= previousLengths[route] * 2);
      assert.equal(state.offstage.filter(note => note.day === 16).length,3);
      assert.equal(new Set(state.offstage.map(note => note.person + note.day)).size,state.offstage.length);
    }
  }
});

test('choices lead to distinct chapters as well as different ending dialogue', () => {
  const extras = {
    alpha:{from:'alpha-stakes',choices:['finish','money'],then:['alpha-distance','alpha-contract']},
    beta:{from:'beta-test',choices:['watch-stall','sell'],then:['beta-register','beta-first-mistake']},
    gamma:{from:'gamma-distance',choices:['answer-home','save-place'],then:['gamma-call','gamma-visit']}
  };
  for (const [route,{from,choices,then}] of Object.entries(extras)) {
    const base = advance(replay(entries[route]),{},scene => scene.sceneId === from);
    assert.deepEqual(choices.map(choice => current(game.step(base,choice)).sceneId),then);
  }
  const beta = replay(entries.beta);
  const promised = advance(beta,{},scene => scene.sceneId === 'beta-truth');
  const waiting = advance(beta,{'beta-promise':'open'},scene => scene.sceneId === 'beta-truth');
  assert.match(current(promised).text.at(-1),/ยังเป็นแฟน/);
  assert.match(current(waiting).text.at(-1),/ยังไม่ได้ตกลงคบ/);
  const concealed = advance(beta,{'beta-clue':'smooth','beta-decision':'stay'});
  assert.equal(current(concealed).ending,'beta-carry');
  assert.match(current(concealed).text[0],/แต่งงาน/);
});

test('older Alpha saves load with new choices, and earlier reading remains recorded', () => {
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

test('after-stories unlock for the featured pair only when she ends up with her rival', () => {
  assert.equal(game.afterStory(game.start()),null);
  for (const [route,entry] of Object.entries(entries)) {
    const at = choices => advance(replay(entry),Object.fromEntries(
      Object.entries(choices).map(([scene,choice]) => [route + '-' + scene,choice])
    ));
    const ask = at({decision:'say'});
    const noPromise = at({promise:'open',decision:'stay'});
    const implicit = at({clue:'smooth',decision:'stay'});
    const together = at({decision:'stay'});
    const leave = at({decision:'leave'});
    const expected = opening.afterStories[route];
    assert.equal(current(noPromise).ending,route + '-carry');
    assert.equal(game.afterStory(ask).title,expected.title);
    assert.equal(game.afterStory(noPromise).introduction,expected.entry.carry);
    assert.equal(game.afterStory(ask).introduction,expected.entry.ask);
    assert.deepEqual(game.afterStory(game.restore(JSON.parse(JSON.stringify(ask)))),game.afterStory(ask));
    assert.equal(game.afterStory(implicit),null);
    assert.equal(game.afterStory(together),null);
    assert.equal(game.afterStory(leave),null);

    assert.equal(expected.chapters.length,5);
    assert(expected.chapters[0].day > current(noPromise).day);
    for (const chapter of expected.chapters) {
      for (const art of [chapter.art,chapter.inlineArt].filter(Boolean)) {
        assert(art.startsWith('afterstory/' + route + '-'),art);
        assert(fs.existsSync(join(root,'assets','scenes',art + '.webp')),art);
      }
    }
  }
});

test('Gamma rereads use the choices saved before each scene and preserve the original run', () => {
  const porch = replay(entries.gamma);
  const firstVisit = advance(porch,{},scene => scene.sceneId === 'gamma-morning');
  const morningIndex = firstVisit.records.length - 1;
  for (const [answer, expected] of [
    ['let-her',/พยักหน้าให้ผมนั่งอยู่ด้วย/],
    ['offer-call',/เสนอจะโทรให้/]
  ]) {
    const next = game.step(firstVisit,answer);
    const saved = JSON.parse(JSON.stringify(next));
    const morning = saved.records[morningIndex];
    const option = morning.options.find(item => item.id === answer);
    option.label = morning.selected = 'คำตอบจากเซฟฉบับก่อน';
    morning.text = ['ข้อความฉบับก่อน'];
    saved.records[morningIndex + 1].text = ['ข้อความฉบับก่อน'];

    const reread = game.historyScene(saved,morningIndex);
    assert.match(reread.text.join(' '),/เก้าโมง.*นัดดูห้องเช่า/);
    assert.notEqual(reread.selected,'คำตอบจากเซฟฉบับก่อน');
    assert.match(game.historyScene(saved,morningIndex + 1).text[0],expected);
    assert.equal(morning.selected,'คำตอบจากเซฟฉบับก่อน');
    assert.deepEqual(morning.text,['ข้อความฉบับก่อน']);
  }
});
