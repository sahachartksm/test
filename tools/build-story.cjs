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
    for (const next of [option.next,option.alternate?.next].filter(Boolean)) {
      if (!opening.scenes[next] || opening.scenes[next].day < scene.day) throw new Error(`Invalid scene order ${id} -> ${next}`);
      if (scene.route && opening.scenes[next].route !== scene.route) throw new Error(`Choice leaves its route ${id} -> ${next}`);
    }
    ids.add(option.id);
  }
}
for (const route of Object.keys(opening.routes)) {
  const story = opening.afterStories[route];
  if (!story?.title || !story.entry?.ask || !story.entry?.carry || !story.chapters?.length) {
    throw new Error(`Incomplete after-story for ${route}`);
  }
  let previousDay = Math.max(opening.scenes[route + '-ask'].day,opening.scenes[route + '-carry'].day);
  for (const chapter of story.chapters) {
    if (chapter.day <= previousDay || !chapter.title || !chapter.art || chapter.text?.length < 2) {
      throw new Error(`Incomplete or out-of-order after-story chapter for ${route}`);
    }
    previousDay = chapter.day;
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


const isekaiMarker = '<!-- isekai-chapters -->';
const isekaiStart = source.indexOf(isekaiMarker);
if (isekaiStart < 0) throw new Error('STORY_BRAIN.md is missing the isekai chapters');

const numberedTitle = /^(\d{2}) · (.+)$/;
const formatId = value => String(value).padStart(2,'0');
const sections = source.slice(isekaiStart + isekaiMarker.length).replace(/\r\n/g,'\n');
const chapters = sections.split(/^## ตอนที่ /m).slice(1).map((section,chapterIndex) => {
  const [header,...sceneSections] = section.split(/^### /m);
  const [heading,time,summary] = header.trim().split(/\n\s*\n/);
  const [,id,title] = heading.match(numberedTitle) ?? [];
  if (id !== formatId(chapterIndex + 1) || !time?.startsWith('**เวลา** ') || !summary?.startsWith('**คำโปรย** ')) {
    throw new Error('Invalid isekai chapter: ' + heading);
  }
  if (sceneSections.length !== 5) throw new Error('Expected 5 scenes in isekai chapter ' + id);

  const scenes = sceneSections.map((block,sceneIndex) => {
    const [heading,caption,...paragraphs] = block.trim().split(/\n\s*\n/);
    const [,number,title] = heading.match(numberedTitle) ?? [];
    const labels = caption?.startsWith('> ') ? caption.slice(2).split(' | ') : [];
    if (number !== formatId(sceneIndex + 1) || labels.length !== 4 || labels.some(label => !label.trim()) || paragraphs.length < 3) {
      throw new Error('Invalid isekai scene in chapter ' + id + ': ' + heading);
    }
    const frames = labels.map((label,frameIndex) => ({
      id:[id,number,formatId(frameIndex + 1)].join('-'),
      label
    }));
    return {title,paragraphs,frames};
  });
  return {id,title,time:time.slice('**เวลา** '.length),summary:summary.slice('**คำโปรย** '.length),scenes};
});
if (chapters.length !== 10) throw new Error('Expected all 10 isekai chapters');
fs.writeFileSync(path.join(out,'isekai.js'),
  '// Generated from STORY_BRAIN.md by tools/build-story.cjs.\n' +
  'globalThis.SelvaraNovel = ' + JSON.stringify(chapters,null,2) + ';\n');
