(() => {
  const brain = globalThis.LoveBrain;
  const ids = Object.keys(brain.characters);
  const last = brain.house.length - 1;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const sceneArt = (turn, id) => `${String(turn).padStart(2,'0')}-${id}`;

  function create() {
    return {
      version:1, episode:0, phase:'prologue', focus:null, records:[], notes:[], evidence:[], reply:null,
      people:Object.fromEntries(ids.map(id => [id,{love:0, risk:0, mood:0, visits:0, lastSeen:0, kept:0,
        missed:0, away:0, appointment:null, committed:false, other:false, truthShown:false}]))
    };
  }

  function start() {
    const state = create();
    openScene(state);
    return state;
  }

  function updatePerson(p, love, risk, mood) {
    p.love = clamp(p.love + love,0,30);
    p.risk = clamp(p.risk + risk,0,20);
    p.mood = clamp(p.mood + mood,-8,8);
  }

  function advanceLives(state, stamp) {
    for (const id of ids) {
      const character = brain.characters[id];
      const p = state.people[id];
      if (!state.episode || state.phase === 'ending') {
        const message = state.episode ? brain.endings[id].after : brain.endings[id].before;
        state.notes.push({...stamp,id,body:message,seen:false});
        continue;
      }
      const event = brain.routes[id][state.episode - 1];
      if (state.phase === 'house') {
        state.notes.push({...stamp,id,body:event.before,seen:false});
        continue;
      }
      const seen = state.focus === id;
      const log = [seen ? `ได้พบกานต์ในฉาก “${event.title}”` : event.away];
      if (p.appointment === state.episode) {
        if (seen) {
          p.kept++;
          updatePerson(p,2,-2,1);
          log.push('กานต์มาตามนัด');
        } else {
          p.missed++;
          updatePerson(p,-3,4,-2);
          log.push('กานต์ไม่มาตามเวลาที่ตกลงไว้ เธอจัดแผนช่วงที่เหลือใหม่');
        }
        p.appointment = null;
      }
      if (seen) {
        p.visits++;
      } else {
        p.away++;
        if (state.episode >= 2) updatePerson(p,0,p.away > 1 ? 2 : 1,-1);
      }
      if (!seen && !p.other && id !== 'f' && state.episode >= 5 && p.risk >= 8) {
        p.other = true;
        log.push(brain.endings[id].turn);
      }
      state.notes.push({...stamp,id,body:log.join(' '),seen});
    }
  }

  function opening(state) {
    const {episode, phase} = state;
    if (phase === 'prologue') return {...brain.prologue, options:[{id:'begin',label:'อ่านตอนที่ 1'}]};
    const house = brain.house[episode];
    return {
      ...house, art:sceneArt(episode,'house'),
      options:ids.map(id => ({id:`meet-${id}`, who:id, label:`ไปหา${brain.characters[id].name}`}))
    };
  }

  function personal(state) {
    const id = state.focus;
    const p = state.people[id];
    const {episode} = state;
    const event = brain.routes[id][episode - 1];
    const house = brain.house[episode];
    const text = event.text.slice();
    if (p.visits === 0 && episode > 2) {
      text.unshift(`หลายวันแล้วที่ผมเห็น${brain.characters[id].name}จากอีกฟากของบ้าน แต่วันนี้เพิ่งมีเวลาคุยเรื่องของเธอจริง ๆ`);
    } else if (p.lastSeen && episode - p.lastSeen > 1) {
      const previous = brain.house[p.lastSeen].day;
      text.unshift(`ผ่านไป ${house.day - previous} วันตั้งแต่ผมได้คุยกับ${brain.characters[id].name}ตามลำพัง เรื่องที่เธอทำระหว่างนั้นยังคืบหน้าไปแม้ผมไม่ได้อยู่ด้วย`);
    }
    if (event.branch) {
      const mode = p.other ? 'other' : p.missed > 0 && p.mood < 3 ? 'missed' : p.love >= 9 ? 'steady' : 'neutral';
      if (event.branch[mode]) text.push(event.branch[mode]);
    }
    return {
      title:event.title, place:brain.scenePlaces[id][episode - 1], text, art:sceneArt(episode,id),
      day:house.day, time:house.later, options:event.choices.map((choice,index) => ({id:`answer-${index}`,label:choice.label}))
    };
  }

  function epilogue(state) {
    const {focus, outcome} = state;
    const ending = brain.endings[focus][outcome];
    const text = ending.text.slice();
    if (outcome === 'other' && state.people[focus].committed) text.push(brain.endings[focus].committed);
    if (outcome === 'other' && state.people[focus].truthShown) text.push(brain.endings[focus].known);
    if (outcome === 'other' && !state.people[focus].truthShown) text.push(brain.endings[focus].hidden);
    return {title:ending.title, text, art:'epilogue', day:20, time:'17.30', place:'บ้านกระจก · หนึ่งสัปดาห์ต่อมา', options:[]};
  }

  function openScene(state) {
    const scene = state.phase === 'ending' ? epilogue(state) : state.phase === 'personal' ? personal(state) : opening(state);
    const stamp = {step:state.records.length,episode:state.episode,day:scene.day,time:scene.time};
    state.records.push({...scene, ...stamp, phase:state.phase, focus:state.focus, reply:state.reply});
    state.reply = null;
    advanceLives(state,stamp);
    if (state.phase === 'personal') {
      const person = state.people[state.focus];
      person.lastSeen = state.episode;
    }
  }

  function answer(state, index) {
    const id = state.focus;
    const p = state.people[id];
    const event = brain.routes[id][state.episode - 1];
    const choice = event.choices[index];
    const changes = {care:[3,-2,2], ask:[2,-1,1], hold:[0,1,-1], press:[-3,3,-3]};
    updatePerson(p,...changes[choice.kind]);
    let response = choice.reply;
    if (choice.kind === 'ask' && event.clue) {
      const {title,text,minimum=0,truth=false} = event.clue;
      if (p.love >= minimum) {
        const line = truth && p.other ? event.clue.alternate : text;
        const stamp = state.records.at(-1);
        state.evidence.push({id, episode:state.episode, day:stamp.day, title, text:line});
        if (truth && p.other) p.truthShown = true;
        response += ` ${line}`;
      } else {
        response += ' เธอขอเก็บเรื่องนั้นไว้จนกว่าจะรู้สึกว่าคุยกันได้โดยไม่ถูกสรุปแทน';
      }
    }
    if (choice.appoint) p.appointment = state.episode + 1;
    if (choice.commit && id !== 'f' && p.love >= 8 && !p.other) {
      p.committed = true;
      response += ' เราตกลงเริ่มคบกันและบอกกันก่อนหากความรู้สึกเปลี่ยน';
      const next = brain.house[state.episode + 1];
      if (next) {
        p.appointment = state.episode + 1;
        response += ` ผมรับนัดจะมาหาเธอวันที่ ${next.day}`;
      }
    } else if (choice.commit) {
      response += ' เธอบอกว่ายังขอเวลาและอยากให้เราคุยกันอีกก่อนจะเรียกว่าคบกัน';
    }
    const record = state.records.at(-1);
    record.selected = choice.label;
    const lastNote = state.notes.findLast(note => note.id === id && note.step === record.step);
    lastNote.body += ` ผมเลือก${choice.label}`;
    state.reply = {who:brain.characters[id].name, text:response};
    return choice.end;
  }

  function endingFor(state, requested) {
    const id = state.focus;
    const p = state.people[id];
    if (requested) return requested;
    if (p.other) return 'other';
    const asked = state.evidence.filter(clue => clue.id === id).length;
    return p.love >= 15 && p.mood >= 2 && (p.kept > 0 || asked >= 2) ? 'together' : 'apart';
  }

  function step(previous, action) {
    const option = previous.records.at(-1).options.find(option => option.id === action);
    if (!option) throw new Error('ทางเลือกนี้ใช้กับฉากปัจจุบันไม่ได้');
    const state = structuredClone(previous);
    state.records.at(-1).selected = option.label;
    if (state.phase === 'prologue') {
      state.episode = 1;
      state.phase = 'house';
    } else if (state.phase === 'house') {
      state.focus = action.slice(5);
      state.phase = 'personal';
    } else {
      const requested = answer(state,Number(action.slice(7)));
      if (state.episode === last) {
        state.outcome = endingFor(state,requested);
        state.phase = 'ending';
      } else {
        state.episode++;
        state.phase = 'house';
        state.focus = null;
      }
    }
    openScene(state);
    return state;
  }

  globalThis.LoveGame = {start,step,last};
})();
