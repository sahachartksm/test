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
const {house, routes, endings, rivals, scenePlaces, timeline} = sandbox.LoveBrain;
if (!Number.isFinite(Date.parse(timeline.start)) || timeline.follow !== timeline.aid + 1 || !house[timeline.follow]) throw new Error('Invalid festival calendar');
if (!house.slice(1).every((day,index) => day.day > (house[index]?.day ?? 0)) || timeline.epilogue <= house.at(-1).day) throw new Error('Dates must move forward');
for (const id of ['d','b','f']) {
  if (routes[id].length !== house.length - 1 || scenePlaces[id].length !== routes[id].length) throw new Error(`Route ${id} has an incomplete calendar`);
  if (routes[id].some(scene => scene.text.length < 4 || scene.choices.length < 3)) throw new Error(`Route ${id} is missing scene prose or choices`);
  if (!rivals[id] || !endings[id].turn) throw new Error(`Route ${id} is missing the partner or its off-screen development`);
  if (!routes[id][timeline.aid - 1].choices.some(choice => choice.aidWork) || !routes[id][timeline.follow - 1].choices.some(choice => choice.aidFollow)) throw new Error(`Route ${id} is missing its aid choices`);
  for (const outcome of ['together','apart','other','alone']) {
    if (!endings[id][outcome]) throw new Error(`Route ${id} is missing its ${outcome} ending`);
  }
}

const out = path.join(root, 'story');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'brain.js'), '// Generated from STORY_BRAIN.md by tools/build-story.cjs.\n' + code);
