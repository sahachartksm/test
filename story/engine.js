(() => {
  const brain = globalThis.LoveBrain;
  const openingVersion = 3;
  const ids = Object.keys(brain.characters);
  const last = brain.house.length - 1;
  const {aid,follow,pool,epilogue:endDay,start:firstDate} = brain.timeline;
  const baseDate = Date.parse(firstDate + 'T00:00:00Z');
  const dateFormat = new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const dateLabel = day => dateFormat.format(baseDate + day * 86400000);
  const newHelp = () => ({id:null,decided:false,acted:false,followed:false,poolTalk:false});
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const sceneArt = (turn, id) => `${brain.house[turn].artGroup ?? String(turn).padStart(2,'0')}-${id}`;

  function start() {
    const state = {version:openingVersion, route:null, flags:{}, offstage:[], records:[]};
    openNewScene(state,brain.opening.start);
    return state;
  }

  function modernScene(state, id) {
    const {variant,after,...scene} = brain.opening.scenes[id];
    const line = item => item?.[state.flags?.[item.flag] ? 'on' : 'off'];
    return {...scene,text:[line(variant),...scene.text,line(after)].filter(Boolean)};
  }

  function openNewScene(state, id) {
    const scene = modernScene(state,id);
    const previousDay = state.records.at(-1)?.day ?? -1;
    for (const [person, schedule] of Object.entries(brain.opening.lives)) {
      for (const [day,time,text] of schedule) {
        if (day > previousDay && day <= scene.day && (person !== scene.focus || day < scene.day)) {
          state.offstage.push({person,day,time,text});
        }
      }
    }
    state.records.push({...scene, sceneId:id, phase:'opening', step:state.records.length, route:state.route});
  }

  function updatePerson(p, love, risk, mood) {
    p.love = clamp(p.love + love,0,30);
    p.risk = clamp(p.risk + risk,0,20);
    p.mood = clamp(p.mood + mood,-8,8);
  }

  function markIntimacy(person, day) {
    person.intimacy ??= {day,affair:person.committed};
    person.other = true;
  }

  function stillHasTime(state, id, requiresPoolTalk) {
    const {id:chosen,acted,followed,poolTalk} = state.help;
    return chosen === id && acted && followed && !state.people[id].other && (!requiresPoolTalk || poolTalk);
  }

  function relationshipsDuringGap(state) {
    if (state.phase !== 'house' || ![pool,last].includes(state.episode)) return;
    const day = brain.house[state.episode].day - 1;
    for (const id of ids) {
      if (!stillHasTime(state,id,state.episode === last)) markIntimacy(state.people[id],day);
    }
  }

  function restore(saved) {
    const state = structuredClone(saved);
    if (state.version === openingVersion) {
      const current = state.records.at(-1);
      state.flags ??= {};
      state.offstage ??= [];
      Object.assign(current,modernScene(state,current.sceneId));
      return state;
    }
    if (state.version === 2) return state;
    state.version = 2;
    state.help = {...newHelp(), ...state.help};
    for (const p of Object.values(state.people)) p.intimacy ??= null;
    const christmas = brain.house[last];
    if (state.episode === pool && state.records.some(r => r.day === christmas.day)) {
      state.episode = last;
      for (const record of [...state.records,...state.notes,...state.evidence]) {
        if (record.episode === pool) record.episode = last;
      }
      for (const p of Object.values(state.people)) {
        if (p.lastSeen === pool) p.lastSeen = last;
        if (p.appointment === pool) p.appointment = last;
      }
      state.help.poolTalk = state.help.acted && state.help.followed;
      for (const id of ids) {
        if (state.resolutions ? state.resolutions[id] === 'other' : !stillHasTime(state,id,true)) {
          markIntimacy(state.people[id],christmas.day - 1);
        }
      }
    }
    return state;
  }

  function advanceLives(state, stamp) {
    for (const id of ids) {
      const p = state.people[id];
      if (!state.episode || state.phase === 'ending') {
        const outcome = state.resolutions?.[id];
        let message = state.episode ? brain.endings[id].after : brain.endings[id].before;
        if (outcome === 'other') message += ` ${brain.endings[id].turn}`;
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
      if (!seen && !p.other && (id !== 'f' || state.episode >= aid) && state.episode >= 5 && p.risk >= 8) {
        p.other = true;
        log.push(brain.endings[id].turn);
      }
      state.notes.push({...stamp,id,body:log.join(' '),seen});
    }
  }

  function opening(state) {
    const {episode, phase} = state;
    if (phase === 'prologue') return {...brain.prologue, options:[{id:'begin',label:`ไปวันที่ ${dateLabel(brain.house[1].day)}`}]};
    const house = brain.house[episode];
    const aidNight = episode === aid && !state.help?.decided;
    const options = ids.map(id => ({id:`meet-${id}`, who:id, label:`${aidNight ? 'รับปากช่วย' : 'ไปหา'}${brain.characters[id].name}`}));
    if (aidNight) options.push({id:'decline-help',label:'ให้ทั้งสามคนจัดการเอง'});
    return {
      ...house, art:sceneArt(episode,'house'), options, aidNight
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
      text.unshift(`ผมแวะมาที่บ้านหลายครั้งแล้ว วันนี้เพิ่งได้คุยกับ${brain.characters[id].name}ตามลำพัง`);
    } else if (p.lastSeen && episode - p.lastSeen > 1) {
      const previous = brain.house[p.lastSeen].day;
      text.unshift(`ผมไม่ได้คุยกับ${brain.characters[id].name}ตามลำพังมา ${house.day - previous} วันแล้ว`);
    }
    if (event.branch) {
      const mode = p.other ? 'other' : p.missed > 0 && p.mood < 3 ? 'missed' : p.love >= 9 ? 'steady' : 'neutral';
      if (event.branch[mode]) text.push(event.branch[mode]);
    }
    if (episode >= follow && event.festival && !p.intimacy) {
      const helped = state.help?.id === id && state.help.acted;
      const line = helped ? event.festival.helped : event.festival.away;
      if (line) text.push(line);
    }
    if (p.intimacy) {
      const speech = brain.voice[id];
      text.push(p.intimacy.affair ? episode === last ? speech.hesitation : speech.affair : episode === last ? speech.boundary : speech.partner);
    }
    return {
      title:event.title, place:brain.scenePlaces[id][episode - 1], text, art:sceneArt(episode,id),
      day:house.day, time:house.later, occasion:house.occasion,
      options:event.choices.map((choice,index) => ({id:`answer-${index}`,label:choice.label}))
    };
  }

  function epilogue(state) {
    const {focus, outcome} = state;
    const ending = brain.endings[focus][outcome];
    const text = ending.text.slice();
    const p = state.people[focus];
    if (outcome === 'other' && p.intimacy?.affair && brain.endings[focus].committed) text.push(brain.endings[focus].committed);
    if (outcome === 'other') {
      if (p.intimacy?.day > brain.house[last].day) text.push(p.intimacy.affair ? brain.voice[focus].hesitation : brain.voice[focus].boundary);
      const reflection = p.truthShown ? brain.endings[focus].known : brain.endings[focus].hidden;
      if (reflection) text.push(reflection);
    }
    const art = outcome === 'other' ? brain.rivals[focus].art : 'newyear-house';
    return {title:ending.title, text, art, day:endDay, time:'08.30', place:'บ้านกระจก · ปีใหม่', occasion:'ปีใหม่', options:[]};
  }

  function openScene(state) {
    relationshipsDuringGap(state);
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
        response += ' เธอบอกว่ายังไม่พร้อมเล่า เอาไว้คุยกันตอนที่ผมพร้อมฟังเธอจนจบดีกว่า';
      }
    }
    if (choice.appoint) p.appointment = state.episode + 1;
    if (choice.commit && id !== 'f' && p.love >= 8 && !p.other) {
      p.committed = true;
      response += ' เราตกลงคบกัน ถ้าวันไหนใครเปลี่ยนใจ จะบอกอีกคนตรง ๆ';
      const next = brain.house[state.episode + 1];
      if (next) {
        p.appointment = state.episode + 1;
        response += ` ผมตกลงว่าจะมาหาเธอวันที่ ${dateLabel(next.day)}`;
      }
    } else if (choice.commit) {
      response += ' เธอขอเวลาอีกหน่อย อยากคุยกันให้มากกว่านี้ก่อนจะตกลงคบกัน';
    }
    if (state.help.id === id) {
      if (state.episode === aid && choice.aidWork) {
        state.help.acted = true;
        p.appointment = follow;
        response += ` เรานัดคุยกันอีกทีวันที่ ${dateLabel(brain.house[follow].day)}`;
      }
      if (state.episode === follow && state.help.acted && choice.aidFollow) state.help.followed = true;
      if (state.episode === pool && choice.poolTalk && stillHasTime(state,id,false)) state.help.poolTalk = true;
    }
    if (p.intimacy) {
      const speech = brain.voice[id];
      response = state.episode === pool
        ? p.intimacy.affair ? speech.hesitation : speech.boundary
        : p.intimacy.affair ? 'เธอพูดขอโทษเบา ๆ แล้วเงียบไป สายตายังอยู่ที่ของในมือ ไม่ยอมสบตาผม' : 'เธอบอกว่ามีคนนัดไว้แล้ว คุยได้แค่นี้ จากนั้นก็ลุกไป';
    }
    if (choice.end && p.committed && !p.intimacy) {
      p.committed = false;
      response += ' ผมบอกเธอว่าเราคงต้องเลิกกันตรงนี้';
    }
    const record = state.records.at(-1);
    record.selected = choice.label;
    const lastNote = state.notes.findLast(note => note.id === id && note.step === record.step);
    lastNote.body += ` ผมเลือก${choice.label}`;
    state.reply = {who:brain.characters[id].name, text:response};
    return choice.end;
  }

  function resolveRoutes(state, requested) {
    const {id} = state.help;
    const p = state.people[id];
    const saved = id && state.focus === id && stillHasTime(state,id,true) && !requested && p.love >= 14 && p.mood >= 2;
    state.resolutions = Object.fromEntries(ids.map(person => {
      const outcome = saved && person === id ? 'together' : 'other';
      if (outcome === 'other') markIntimacy(state.people[person],brain.house[last].day + 1);
      return [person,outcome];
    }));
    state.outcome = state.resolutions[state.focus];
  }

  function step(previous, action) {
    const state = restore(previous);
    const current = state.records.at(-1);
    const option = current.options.find(option => option.id === action);
    if (!option || option.disabled) throw new Error('ทางเลือกนี้ใช้กับฉากปัจจุบันไม่ได้');
    current.selected = option.label;
    if (state.version === openingVersion) {
      state.route = option.route ?? state.route;
      if (option.flag) state.flags[option.flag] = true;
      const alternate = option.alternate;
      const next = alternate?.requires.every(flag => state.flags[flag]) ? alternate.next : option.next;
      openNewScene(state,next);
      return state;
    }
    if (state.phase === 'prologue') {
      state.episode = 1;
      state.phase = 'house';
    } else if (state.phase === 'house') {
      const aidNight = state.episode === aid && !state.help.decided;
      if (aidNight) {
        state.help.id = option.who ?? null;
        state.help.decided = true;
      }
      if (action === 'decline-help') {
        state.episode++;
      } else {
        state.focus = option.who;
        state.phase = 'personal';
      }
    } else {
      const requested = answer(state,Number(action.slice(7)));
      if (state.episode === last) {
        resolveRoutes(state,requested);
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

  function extend(previous) {
    if (previous.phase !== 'ending' || previous.resolutions || previous.episode >= aid) throw new Error('เซฟนี้อยู่ในฉบับเทศกาลแล้ว');
    const state = restore(previous);
    const oldEnding = state.records.pop();
    state.notes = state.notes.filter(note => note.step !== oldEnding.step);
    state.reply = oldEnding.reply;
    state.outcome = null;
    state.help = newHelp();
    state.episode = aid;
    state.phase = 'house';
    state.focus = null;
    openScene(state);
    return state;
  }

  function afterStory(state) {
    if (state?.version !== openingVersion) return null;
    const story = brain.opening.afterStories[state.route];
    const ending = state.records.at(-1)?.ending;
    if (!story || !ending) return null;

    if (ending === state.route + '-ask') return {...story,introduction:story.entry.ask};
    if (ending === state.route + '-carry' && !state.flags?.bond) {
      return {...story,introduction:story.entry.carry};
    }
    return null;
  }

  function behind(state,id) {
    if (state?.phase !== 'ending' || state.resolutions?.[id] !== 'other') return null;
    const event = state.people[id]?.intimacy;
    if (!event) return null;
    const story = brain.hidden[id];
    const text = event.affair && story.affair ? [...story.text,story.affair] : story.text;
    return {...story,text,day:event.day};
  }

  globalThis.LoveGame = {start,step,extend,restore,afterStory,behind,last,dateLabel,openingVersion};
})();
