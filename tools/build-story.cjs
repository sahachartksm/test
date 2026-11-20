const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'STORY_BRAIN.md'), 'utf8');
const match = source.match(/^```js\r?\n([\s\S]*?)^```\s*$/m);
if (!match) throw new Error('STORY_BRAIN.md is missing its JavaScript story section');

const code = match[1];
const sandbox = {};
vm.runInNewContext(code, sandbox, {filename:'STORY_BRAIN.md'});
const {opening, house, routes, endings, rivals, scenePlaces, timeline, past, hidden, voice} = sandbox.LoveBrain;
if (!opening.scenes[opening.start]) throw new Error('Missing opening scene');
for (const [id, scene] of Object.entries(opening.scenes)) {
  if (!scene.art || !scene.text.length || (scene.options.length > 0 && !scene.prompt)) throw new Error(`Incomplete opening scene ${id}`);
  const ids = new Set();
  for (const option of scene.options) {
    if (ids.has(option.id) || !option.label || (!option.disabled && !opening.scenes[option.next])) throw new Error(`Invalid choice in opening scene ${id}`);
    ids.add(option.id);
  }
}
if (!Number.isFinite(Date.parse(timeline.start)) || timeline.follow !== timeline.aid + 1 || timeline.pool !== timeline.follow + 1 || !house[timeline.pool]) throw new Error('Invalid festival calendar');
if (!house.slice(1).every((day,index) => day.day > (house[index]?.day ?? 0)) || timeline.epilogue <= house.at(-1).day) throw new Error('Dates must move forward');
for (const id of ['d','b','f']) {
  if (routes[id].length !== house.length - 1 || scenePlaces[id].length !== routes[id].length) throw new Error(`Route ${id} has an incomplete calendar`);
  if (routes[id].some(scene => scene.text.length < 4 || scene.choices.length < 3)) throw new Error(`Route ${id} is missing scene prose or choices`);
  if (!rivals[id] || !endings[id].turn) throw new Error(`Route ${id} is missing the partner or its off-screen development`);
  if (past[id]?.text.length < 3 || hidden[id]?.text.length < 3 || !voice[id]?.partner || !voice[id]?.boundary) throw new Error(`Route ${id} is missing character history or a post-game scene`);
  if (!routes[id][timeline.pool - 1].choices.some(choice => choice.poolTalk)) throw new Error(`Route ${id} is missing its pool choices`);
  if (!routes[id][timeline.aid - 1].choices.some(choice => choice.aidWork) || !routes[id][timeline.follow - 1].choices.some(choice => choice.aidFollow)) throw new Error(`Route ${id} is missing its aid choices`);
  for (const outcome of ['together','apart','other','alone']) {
    if (!endings[id][outcome]) throw new Error(`Route ${id} is missing its ${outcome} ending`);
  }
}

const out = path.join(root, 'story');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'brain.js'), '// Generated from STORY_BRAIN.md by tools/build-story.cjs.\n' + code);
