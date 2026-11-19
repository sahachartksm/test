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
const {house, routes, endings} = sandbox.LoveBrain;
for (const id of ['d','b','f']) {
  if (routes[id].length !== house.length - 1) throw new Error(`Route ${id} has an incomplete calendar`);
  if (routes[id].some(scene => scene.text.length < 4 || scene.choices.length < 3)) throw new Error(`Route ${id} is missing scene prose or choices`);
  for (const outcome of (id === 'f' ? ['together','apart','alone'] : ['together','apart','other','alone'])) {
    if (!endings[id][outcome]) throw new Error(`Route ${id} is missing its ${outcome} ending`);
  }
}

const out = path.join(root, 'story');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'brain.js'), '// Generated from STORY_BRAIN.md by tools/build-story.cjs.\n' + code);
