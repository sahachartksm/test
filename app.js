(() => {
  const {characters,title} = globalThis.LoveBrain;
  const game = globalThis.LoveGame;
  const keys = Object.keys(characters);
  const app = document.querySelector('#app');
  const panel = document.querySelector('#panel');
  const panelBody = document.querySelector('#panel-body');
  const keyPrefix = 'love-glass-house-v1-';
  const slots = [1,2,3,4];
  const memory = new Map();
  let state = null;
  let slot = null;
  let historyView = null;
  let journalPerson = 'd';
  let toastTimer;

  const escape = value => String(value ?? '').replace(/[&<>"']/g,character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const art = id => `assets/scenes/${id}.webp`;
  const two = value => String(value).padStart(2,'0');
  const paragraphs = items => items.map(item => `<p>${escape(item)}</p>`).join('');

  function readSlot(index) {
    if (memory.has(index)) return memory.get(index);
    try {
      const entry = JSON.parse(localStorage.getItem(keyPrefix + index));
      if (entry?.run?.version === 1 && entry.run.records?.length && entry.run.people && entry.run.notes && entry.run.evidence) return entry;
    } catch {
      return null;
    }
    return null;
  }

  function writeSlot(index,run) {
    const entry = {run:structuredClone(run), savedAt:Date.now()};
    try {
      localStorage.setItem(keyPrefix + index,JSON.stringify(entry));
      memory.delete(index);
      return true;
    } catch {
      memory.set(index,entry);
      toast('เบราว์เซอร์นี้บันทึกลงเครื่องไม่ได้ ความคืบหน้าจะอยู่จนกว่าจะโหลดหน้าใหม่',6000);
      return false;
    }
  }

  function toast(text,duration=2100) {
    const node = document.querySelector('#toast');
    node.textContent = text;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; },duration);
  }

  function dialog(title,body) {
    panel.querySelector('#panel-title').textContent = title;
    panelBody.innerHTML = body;
    if (!panel.open) panel.showModal();
    panel.scrollTop = 0;
  }

  function atTop() {
    window.scrollTo(0,0);
    app.querySelector('h1')?.focus({preventScroll:true});
  }

  function castCard(id, option) {
    const character = characters[id];
    return `<button type="button" class="cast-card" data-action="${option ? 'step' : 'profile'}" data-value="${option ?? id}">
      <img src="${art(character.image)}" alt="" loading="lazy" style="background:${character.color}">
      <span class="card-meta"><strong>${character.name}</strong><small>${option ? character.link : character.job}</small></span></button>`;
  }

  function home() {
    state = null;
    slot = null;
    historyView = null;
    document.querySelector('#journal-nav').hidden = true;
    document.title = `${title} · Love`;
    const exists = slots.some(id => readSlot(id));
    app.innerHTML = `<section class="hero"><img class="hero-img" src="${art('cover')}" alt="" fetchpriority="high">
      <div class="site-width hero-copy"><div><p class="small-label" lang="en">LOVE · THE GLASS HOUSE</p><h1 tabindex="-1">${title}</h1>
      <p class="lead">ผมกลับมาช่วยเปิดบ้านของอา แล้วพบว่าระหว่างที่ผมอยู่กับคนหนึ่ง อีกสองคนก็มีคำตอบของตัวเองรออยู่</p>
      <div class="actions"><button type="button" class="button primary" data-action="new">เริ่มเรื่องใหม่</button><button type="button" class="button ghost" data-action="saves">${exists ? 'เล่นต่อ' : 'ช่องเซฟ'}</button></div>
      <p class="caption">บทนำและ ${game.last} ตอน · ความรักและความลับในบ้านหลังเดียวกัน</p></div></div></section>
      <section class="cast-section site-width"><h2>คนที่กานต์จะได้พบ</h2><div class="cast-grid">${keys.map(id => castCard(id)).join('')}</div></section>`;
  }

  function read() {
    document.querySelector('#journal-nav').hidden = false;
    const latest = state.records.at(-1);
    const record = historyView === null ? latest : state.records[historyView];
    const tag = record.phase === 'prologue' ? 'บทนำ' : record.phase === 'ending' ? 'บทส่งท้าย' : `ตอนที่ ${two(record.episode)} / ${game.last}`;
    const who = characters[record.focus];
    const pct = record.phase === 'ending' ? 100 : Math.min(100, (record.step / (game.last * 2 + 1)) * 100);
    document.title = `${record.title} · ${title}`;
    app.innerHTML = `<section class="reader site-width">
      <div class="reader-meta"><span>${tag} · วันที่ ${record.day} · ${record.time} น.</span><span>${escape(record.place)}</span></div>
      <div class="reader-meter" aria-hidden="true"><span style="width:${pct}%"></span></div>
      <header class="chapter-banner"><img src="${art(record.art)}" alt="ภาพฉาก${escape(record.title)}" fetchpriority="high"><div>
        ${who ? `<p>${who.name}</p>` : ''}<h1 tabindex="-1">${escape(record.title)}</h1></div></header>
      <div class="chapter-text">${record.reply ? `<aside class="reply"><strong>ต่อจากที่คุยกับ${escape(record.reply.who)}</strong><p>${escape(record.reply.text)}</p></aside>` : ''}
        <article class="prose">${paragraphs(record.text)}</article>${controls(record)}</div></section>`;
    atTop();
  }

  function controls(record) {
    if (historyView !== null) {
      return `<section class="next">${record.selected ? `<p class="played-choice">ทางเลือกที่บันทึกไว้ · ${escape(record.selected)}</p>` : ''}
        <div class="actions"><button type="button" class="button primary" data-action="current">กลับไปฉากปัจจุบัน</button><button type="button" class="button" data-action="journal">เปิดบันทึก</button></div></section>`;
    }
    if (record.phase === 'prologue') {
      return `<section class="next"><button type="button" class="button primary" data-action="step" data-value="begin">อ่านตอนที่ 1</button></section>`;
    }
    if (record.phase === 'house') {
      return `<section class="next"><h2>ตอนนี้ผมจะไปหาใคร</h2><div class="cast-grid">${record.options.map(item => castCard(item.who,item.id)).join('')}</div></section>`;
    }
    if (record.phase === 'ending') {
      return `<section class="next"><div class="actions"><button type="button" class="button primary" data-action="new">เริ่มเรื่องใหม่</button>
        <button type="button" class="button" data-action="journal">ย้อนดูบันทึก</button><button type="button" class="button ghost" data-action="home">กลับหน้าหลัก</button></div></section>`;
    }
    return `<section class="next"><h2>ผมจะตอบอย่างไร</h2><div class="response-list">${record.options.map(item => `<button type="button" class="response" data-action="step" data-value="${item.id}">${escape(item.label)}</button>`).join('')}</div></section>`;
  }

  function saves(mode='manage') {
    const body = slots.map(index => {
      const entry = readSlot(index);
      const scene = entry?.run.records.at(-1);
      const status = !scene ? 'ช่องว่าง' : scene.phase === 'ending' ? `จบแล้ว · ${scene.title}` : `${scene.episode ? `ตอนที่ ${scene.episode}` : 'บทนำ'} · ${scene.title}`;
      return `<div class="save-row"><div><strong>ช่อง ${two(index)}${slot === index ? ' · กำลังเล่น' : ''}</strong><small class="caption">${escape(status)}</small></div><div class="actions">
        ${entry && mode === 'manage' ? `<button type="button" class="button primary small" data-action="resume" data-value="${index}">เล่นต่อ</button>` : ''}
        ${state && !entry && mode === 'manage' ? `<button type="button" class="button small" data-action="copy" data-value="${index}">คัดลอกเซฟ</button>` : ''}
        <button type="button" class="button small${mode === 'new' && !entry ? ' primary' : ''}" data-action="start" data-value="${index}">${entry ? 'เริ่มใหม่ในช่องนี้' : 'เริ่มบทนำ'}</button>
      </div></div>`;
    }).join('');
    dialog(mode === 'new' ? 'เลือกช่องสำหรับเรื่องใหม่' : 'เซฟเกม',`<p class="caption">เกมบันทึกอัตโนมัติทุกครั้งที่เปลี่ยนฉาก เซฟอยู่ในเบราว์เซอร์นี้</p>${body}`);
  }

  function start(index) {
    if (!slots.includes(index)) return;
    state = game.start();
    slot = index;
    historyView = null;
    writeSlot(slot,state);
    panel.close();
    read();
  }

  function profile(id) {
    const c = characters[id];
    if (!c) return;
    dialog(c.name,`<div class="profile"><img src="${art(c.image)}" alt="ภาพ${c.name}"><p class="caption">${c.age} ปี · ${c.job} · ${c.link}</p><p>${escape(c.bio)}</p>
      <details><summary>เปิดดูนิสัยที่เธอไม่พูดตรง ๆ</summary><p>${escape(c.secret)}</p></details>
      <div class="actions"><button type="button" class="button small" data-action="cast">ตัวละครทั้งหมด</button><a class="button small ghost" href="${c.ref}" target="_blank" rel="noopener">ดูภาพอ้างอิง</a></div></div>`);
  }

  function journal(mode='known') {
    if (!state) return;
    const views = [ ['known','เบาะแส'], ['history','ฉากที่อ่านแล้ว'], ['offscreen','เปิดเรื่องนอกฉาก'] ];
    const nav = `<div class="actions journal-switch">${views.map(([id,name]) => `<button type="button" class="button small${mode === id ? ' primary' : ''}" aria-pressed="${mode === id}" data-action="journal" data-value="${id}">${name}</button>`).join('')}</div>`;
    let content;
    if (mode === 'history') {
      content = `<ol class="journal-list">${state.records.slice().reverse().map(record => `<li class="note"><strong>${escape(record.title)}</strong><p class="caption">วันที่ ${record.day} · ${record.time} น.${record.selected ? ` · ${escape(record.selected)}` : ''}</p>
        <button type="button" class="button small" data-action="history" data-value="${record.step}">อ่านฉากนี้</button></li>`).join('')}</ol>`;
    } else if (mode === 'offscreen') {
      const notes = state.notes.filter(note => note.id === journalPerson).reverse();
      content = `<p class="caption">บันทึกส่วนนี้เปิดเผยเหตุการณ์ที่กานต์อาจยังไม่รู้</p><label class="journal-select">ตัวละคร <select id="journal-person">${keys.map(id => `<option value="${id}"${journalPerson === id ? ' selected' : ''}>${characters[id].name}</option>`).join('')}</select></label>
        <ol class="journal-list">${notes.map(note => `<li class="note"><strong>วันที่ ${note.day} · ${note.time} น.</strong><p>${escape(note.body)}</p></li>`).join('')}</ol>`;
    } else {
      content = state.evidence.length ? `<ol class="journal-list">${state.evidence.slice().reverse().map(item => `<li class="note"><strong>${escape(item.title)}</strong><span class="caption"> · ${characters[item.id].name} · วันที่ ${item.day}</span><p>${escape(item.text)}</p></li>`).join('')}</ol>` : '<p class="caption">คำตอบที่กานต์ยืนยันกับคนในเหตุการณ์จะถูกบันทึกไว้ที่นี่</p>';
    }
    dialog('บันทึกของกานต์',nav + content);
  }

  document.addEventListener('click',event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const {action,value} = button.dataset;
    const index = Number(value);
    switch (action) {
      case 'home': if (panel.open) panel.close(); home(); atTop(); break;
      case 'new': saves('new'); break;
      case 'saves': saves(); break;
      case 'close': panel.close(); break;
      case 'cast': dialog('ตัวละคร',`<div class="cast-grid">${keys.map(id => castCard(id)).join('')}</div>`); break;
      case 'profile': profile(value); break;
      case 'journal': journal(value); break;
      case 'history':
        if (state?.records[index]) { historyView = index; panel.close(); read(); }
        break;
      case 'current': historyView = null; read(); break;
      case 'start':
        if (readSlot(index)) dialog(`เริ่มใหม่ในช่อง ${two(index)}`,`<p>การยืนยันจะเขียนทับความคืบหน้าเดิมในช่องนี้</p>
          <div class="actions ending-actions"><button type="button" class="button primary" data-action="confirm-start" data-value="${index}">ยืนยันเริ่มบทนำ</button><button type="button" class="button" data-action="new">เลือกช่องอื่น</button></div>`);
        else start(index);
        break;
      case 'confirm-start': start(index); break;
      case 'resume': {
        const entry = readSlot(index);
        if (entry) { state = structuredClone(entry.run); slot = index; historyView = null; panel.close(); read(); }
        break;
      }
      case 'copy':
        if (state && slots.includes(index) && !readSlot(index)) {
          if (writeSlot(index,state)) toast(`คัดลอกไปที่ช่อง ${two(index)} แล้ว`);
          saves();
        }
        break;
      case 'step':
        if (state && historyView === null) {
          state = game.step(state,value);
          writeSlot(slot,state);
          read();
        }
        break;
    }
  });

  document.addEventListener('change',event => {
    if (event.target.id === 'journal-person') { journalPerson = event.target.value; journal('offscreen'); }
  });

  home();
})();
