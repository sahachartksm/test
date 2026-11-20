(() => {
  const {characters,rivals,title,house,timeline,past,opening} = globalThis.LoveBrain;
  const game = globalThis.LoveGame;
  const keys = Object.keys(characters);
  const castStills = {
    d:'cinematic/parcel-a', b:'cinematic/beta-return-a', f:'cinematic/back-home-a'
  };
  const partnerStills = {
    d:'cinematic/alpha-rival-a', b:'cinematic/beta-rival-a', f:'cinematic/gamma-rival-a'
  };
  const app = document.querySelector('#app');
  const panel = document.querySelector('#panel');
  const panelBody = document.querySelector('#panel-body');
  const zoomPanel = document.querySelector('#zoom-panel');
  const keyPrefix = 'love-glass-house-v1-';
  const slots = [1,2,3,4];
  const endingKey = 'love-glass-house-endings';
  const endingScenes = Object.values(opening.scenes).filter(scene => scene.ending);
  const unlockedEndings = new Set();
  const memory = new Map();
  let state = null;
  let slot = null;
  let historyView = null;
  let journalPerson = 'd';
  let toastTimer;

  const escape = value => String(value ?? '').replace(/[&<>"']/g,character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const art = id => {
    const folder = id === 'cafe-arrival' || id.startsWith('alpha-') ? 'alpha/' : '';
    return `assets/scenes/${folder}${id}.webp`;
  };
  const two = value => String(value).padStart(2,'0');
  const paragraphs = items => items.map(item => `<p>${escape(item)}</p>`).join('');
  const isOpening = run => run?.version === game.openingVersion;

  function readSlot(index) {
    if (memory.has(index)) return memory.get(index);
    try {
      const entry = JSON.parse(localStorage.getItem(keyPrefix + index));
      const run = entry?.run;
      if (!run?.records?.length) return null;
      if (isOpening(run) && opening.scenes[run.records.at(-1).sceneId]) return entry;
      if ([1,2].includes(run.version) && run.people && run.notes && run.evidence) return entry;
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

  function endingProgress(newEnding) {
    try {
      const stored = JSON.parse(localStorage.getItem(endingKey));
      if (Array.isArray(stored)) stored.forEach(id => unlockedEndings.add(id));
    } catch {
      // Recover any endings that are still in a readable save slot.
    }
    for (const index of slots) {
      const id = readSlot(index)?.run.records.at(-1).ending;
      if (id) unlockedEndings.add(id);
    }
    if (newEnding) {
      unlockedEndings.add(newEnding);
      try { localStorage.setItem(endingKey,JSON.stringify([...unlockedEndings])); } catch {}
    }
    return unlockedEndings;
  }

  function showEndings() {
    const found = endingProgress();
    const sections = Object.entries(opening.routes).map(([id,route]) => {
      const endings = endingScenes.filter(scene => scene.route === id);
      const count = endings.filter(scene => found.has(scene.ending)).length;
      const cards = endings.map(scene => found.has(scene.ending)
        ? `<figure class="outcome-card">${scenePicture(scene.art,scene.title)}<figcaption><strong>${escape(scene.title)}</strong></figcaption></figure>`
        : '<div class="ending-locked">ยังไม่พบ</div>').join('');
      return `<section class="ending-group"><h3>${route.name} · ${characters[route.person].name} <small>${count} / ${endings.length}</small></h3><div class="ending-grid">${cards}</div></section>`;
    }).join('');
    const foundCount = endingScenes.filter(scene => found.has(scene.ending)).length;
    dialog('ฉากจบ',`<p class="caption">พบแล้ว ${foundCount} จาก ${endingScenes.length} แบบ</p>${sections}`);
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
    return `<button type="button" class="cast-card" data-action="${option ? 'step' : 'profile'}" data-value="${option?.id ?? id}">
      <img src="${art(!state || isOpening(state) ? castStills[id] : character.image)}" alt="" loading="lazy" style="background:${character.color}">
      <span class="card-meta"><strong>${option ? escape(option.label) : character.name}</strong><small>${option ? character.link : character.job}</small></span></button>`;
  }

  function scenePicture(image, label) {
    return `<button type="button" class="scene-picture" data-action="zoom" data-value="${image}" data-title="${escape(label)}" aria-label="ขยายภาพ${escape(label)}">
      <img src="${art(image)}" alt="${escape(label)}" loading="lazy"><span class="zoom-badge" aria-hidden="true">ขยายภาพ</span></button>`;
  }

  function zoom(image, label) {
    if (!/^(?:(?:cinematic|novel)\/)?[a-z0-9-]+$/.test(image)) return;
    const picture = document.querySelector('#zoom-image');
    document.querySelector('#zoom-title').textContent = label;
    picture.src = art(image);
    picture.alt = label;
    if (!zoomPanel.open) zoomPanel.showModal();
    magnify(false);
  }

  function magnify(enabled) {
    const area = zoomPanel.querySelector('.zoom-viewport');
    const toggle = zoomPanel.querySelector('[data-action=toggle-zoom]');
    area.classList.toggle('magnified',enabled);
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent = enabled ? 'ย่อให้พอดี' : 'ขยาย 2 เท่า';
    area.scrollTop = enabled ? (area.scrollHeight - area.clientHeight) / 2 : 0;
    area.scrollLeft = enabled ? (area.scrollWidth - area.clientWidth) / 2 : 0;
  }

  function home() {
    state = null;
    slot = null;
    historyView = null;
    document.body.classList.add('title-page');
    document.querySelector('#journal-nav').hidden = true;
    document.title = `${title} · Love`;
    const exists = slots.some(id => readSlot(id));
    app.innerHTML = `<section class="title-screen" aria-labelledby="game-title">
      <div class="title-panel">
        <p class="title-wordmark" lang="en"><span class="brand-mark" aria-hidden="true"></span>Love</p>
        <h1 id="game-title" tabindex="-1">${title}</h1>
        <p class="title-summary">หลังตกงาน ผมกลับมาขอพักกับญาติ ที่คาเฟ่ของอามีที่ให้ผมนอนหนึ่งคืน และพัสดุหนึ่งซองที่ต้องเอาขึ้นไปส่งชั้นสาม</p>
        <nav class="title-actions" aria-label="เมนูหน้าหลัก">
          <button type="button" class="button primary" data-action="new">เริ่มเรื่องใหม่</button>
          <button type="button" class="button" data-action="saves">${exists ? 'เล่นต่อ' : 'ช่องเซฟ'}</button>
          <button type="button" class="button" data-action="flow">ผังเส้นทาง</button>
          <button type="button" class="button" data-action="cast">ตัวละคร</button>
          <button type="button" class="button" data-action="endings">ฉากจบ</button>
        </nav>
      </div>
      <div class="title-image"><img src="${art('cinematic/back-home-a')}" alt="เฟื่องเปิดประตูคาเฟ่บ้านกระจกหลังฝนตก" fetchpriority="high"></div>
    </section>`;
  }

  function illustratedText(record, inlineArt) {
    if (!inlineArt) return paragraphs(record.text);
    const middle = Math.ceil(record.text.length / 2);
    const label = `อีกจังหวะในฉาก${record.title}`;
    return `${paragraphs(record.text.slice(0,middle))}
      <figure class="inline-still">${scenePicture(inlineArt,label)}</figure>
      ${paragraphs(record.text.slice(middle))}`;
  }

  function read() {
    document.body.classList.remove('title-page');
    document.querySelector('#journal-nav').hidden = false;
    const latest = state.records.at(-1);
    const record = historyView === null ? latest : state.records[historyView];
    const modern = isOpening(state);
    const visuals = modern ? opening.scenes[record.sceneId] : record;
    const tag = opening.routes[record.route]?.name ?? record.occasion ?? (record.phase === 'prologue' ? 'บทนำ' : record.phase === 'ending' ? 'บทส่งท้าย' : '');
    const who = characters[record.focus];
    const festivalPortrait = record.phase === 'personal' && record.occasion;
    const pct = record.phase === 'ending' ? 100 : Math.min(100, (record.step / (game.last * 2 + 1)) * 100);
    document.title = `${record.title} · ${title}`;
    app.innerHTML = `<section class="reader site-width">
      <div class="reader-meta"><span>${game.dateLabel(record.day)} · ${record.time} น.</span><button type="button" class="button small ghost" data-action="flow">ผังเส้นทาง</button></div>
      ${modern ? '' : `<div class="reader-meter" aria-hidden="true"><span style="width:${pct}%"></span></div>`}
      <header class="chapter-banner${festivalPortrait ? ' festival-portrait' : ''}"><img src="${art(visuals.art)}" alt="ภาพฉาก${escape(record.title)}" fetchpriority="high">
        <button type="button" class="banner-zoom" data-action="zoom" data-value="${visuals.art}" data-title="${escape(record.title)}" aria-label="ขยายภาพ${escape(record.title)}"><span class="zoom-badge" aria-hidden="true">ขยายภาพ</span></button><div>
        <p>${escape((modern ? [tag,record.place] : [who?.name,tag || record.place]).filter(Boolean).join(' · '))}</p><h1 tabindex="-1">${escape(record.title)}</h1></div></header>
      <div class="chapter-text">${record.reply ? `<aside class="reply"><strong>ต่อจากที่คุยกับ${escape(record.reply.who)}</strong><p>${escape(record.reply.text)}</p></aside>` : ''}
        <article class="prose">${illustratedText(record,visuals.inlineArt)}</article>${controls(record)}</div></section>`;
    atTop();
  }

  function controls(record) {
    if (historyView !== null) {
      return `<section class="next">${record.selected ? `<p class="played-choice">ทางเลือกที่บันทึกไว้ · ${escape(record.selected)}</p>` : ''}
        <div class="actions"><button type="button" class="button primary" data-action="current">กลับไปฉากปัจจุบัน</button><button type="button" class="button" data-action="journal">เปิดบันทึก</button></div></section>`;
    }
    if (record.phase === 'opening') return openingControls(record);
    if (record.phase === 'prologue') {
      return `<section class="next"><button type="button" class="button primary" data-action="step" data-value="begin">ไปวันที่ ${game.dateLabel(house[1].day)}</button></section>`;
    }
    if (record.phase === 'house') {
      return `<section class="next">${record.aidNight ? '<h2>คืนนี้ผมจะรับปากช่วยใคร</h2><p class="aid-explain">เลือกได้คนเดียวต่อเซฟ ลงมือคืนนี้ กลับมาตามนัดในตลาดปลายปี คุยตรง ๆ ในวันพักริมสระ แล้วกลับมาคุยให้จบในคืนคริสต์มาส</p>' : '<h2>ตอนนี้ผมจะไปหาใคร</h2>'}
        <div class="cast-grid">${record.options.filter(item => item.who).map(item => castCard(item.who,item)).join('')}</div>
        ${record.aidNight ? '<button type="button" class="button ghost ending-actions" data-action="step" data-value="decline-help">ให้ทั้งสามคนจัดการเอง</button>' : ''}</section>`;
    }
    if (record.phase === 'ending') {
      const legacy = !state.resolutions && state.episode < timeline.aid;
      return `<section class="next">${routeOutcomes()}
        <div class="actions"><button type="button" class="button${legacy ? ' primary' : ''}" data-action="${legacy ? 'extend' : 'flow'}">${legacy ? 'เล่นต่อคืนฮาโลวีน' : 'ดูผังเส้นทางที่เล่น'}</button>${behindButton()}
        <button type="button" class="button" data-action="new">เริ่มเรื่องใหม่</button><button type="button" class="button ghost" data-action="home">กลับหน้าหลัก</button></div></section>`;
    }
    return `<section class="next"><h2>ผมจะตอบอย่างไร</h2><div class="response-list">${record.options.map(item => `<button type="button" class="response" data-action="step" data-value="${item.id}">${escape(item.label)}</button>`).join('')}</div></section>`;
  }

  function openingControls(record) {
    if (record.ending) {
      return `<section class="next"><div class="actions">
        <button type="button" class="button primary" data-action="endings">ดูฉากจบที่พบ</button>
        <button type="button" class="button" data-action="journal" data-value="offscreen">อ่านเรื่องที่กานต์ไม่เห็น</button>
        <button type="button" class="button" data-action="new">เริ่มเรื่องใหม่</button>
        <button type="button" class="button ghost" data-action="home">กลับหน้าหลัก</button>
      </div></section>`;
    }
    if (!record.options.length) {
      const heading = record.prompt ?? `จบบทเปิด ${opening.routes[record.route]?.name ?? ''}`;
      return `<section class="next"><h2>${escape(heading)}</h2><div class="actions">
        <button type="button" class="button primary" data-action="flow">ดูผังเส้นทาง</button>
        <button type="button" class="button" data-action="home">กลับหน้าหลัก</button>
      </div></section>`;
    }
    const photos = record.options.some(option => option.image);
    const choices = record.options.map(option => {
      const button = `<button type="button" class="response" data-action="step" data-value="${escape(option.id)}"${option.disabled ? ' disabled' : ''}>${escape(option.label)}</button>`;
      return option.image ? `<figure class="photo-choice${option.disabled ? ' locked' : ''}">${scenePicture(option.image,option.label)}${button}</figure>` : button;
    });
    return `<section class="next"><h2>${escape(record.prompt)}</h2><div class="${photos ? 'photo-choices' : 'response-list'}">${choices.join('')}</div></section>`;
  }

  function routeOutcomes() {
    if (!state.resolutions) return '';
    return `<div class="route-outcomes"><h2>เรื่องของทั้งสามคน</h2><div class="cast-grid">${keys.map(id => {
      const c = characters[id];
      const rival = rivals[id];
      const saved = state.resolutions[id] === 'together';
      const alt = saved ? c.name : `${c.name}กับ${rival.name}`;
      const heading = saved ? `${c.name} · ช่วยสำเร็จ` : `${c.name}กับ${rival.name}`;
      return `<figure class="outcome-card ${saved ? 'saved-route' : ''}" data-route="${id}">${scenePicture(saved ? `11-${id}` : rival.art,alt)}
        <figcaption><strong>${heading}</strong><small>${saved ? id === 'f' ? 'เฟื่องเลือกคุยต่อกับคนในบ้าน' : 'เลือกเดินต่อกับกานต์' : 'คู่ที่เกิดขึ้นเมื่อเส้นนี้พลาด'}</small></figcaption></figure>`;
    }).join('')}</div></div>`;
  }

  function flow() {
    if (!state || isOpening(state)) {
      openingFlow();
      return;
    }
    const activeStep = historyView ?? state.records.at(-1).step;
    const opening = state.records[0];
    const help = state.help;
    const days = house.slice(1).map((date,index) => {
      const episode = index + 1;
      const setup = state.records.find(item => item.episode === episode && item.phase === 'house');
      const taken = state.records.find(item => item.episode === episode && item.phase === 'personal');
      const label = `${game.dateLabel(date.day)}${date.occasion ? ` · ${date.occasion}` : ''}`;
      const parent = setup ? `<button type="button" class="flow-date visited" data-action="history" data-value="${setup.step}"${setup.step === activeStep ? ' aria-current="step"' : ''}>${escape(label)}</button>` : `<div class="flow-date">${escape(label)}</div>`;
      return `<li class="flow-day${setup ? ' started' : ''}">${parent}<div class="flow-branches">${keys.map(id => {
        if (taken?.focus !== id) return `<span class="flow-node">${characters[id].name}</span>`;
        const sub = `${episode === timeline.aid ? 'รับปากช่วย · ' : ''}${taken.selected || 'กำลังอ่าน'}`;
        return `<button type="button" class="flow-node picked" data-action="history" data-value="${taken.step}"${taken.step === activeStep ? ' aria-current="step"' : ''}><strong>${characters[id].name}</strong><small>${escape(sub)}</small></button>`;
      }).join('')}</div>${setup?.selected && !taken ? `<p class="flow-choice">${escape(setup.selected)}</p>` : ''}</li>`;
    });
    const lastRecord = state.records.at(-1);
    const end = lastRecord.phase === 'ending' ? `<li class="flow-day started"><button type="button" class="flow-date visited" data-action="history" data-value="${lastRecord.step}"${lastRecord.step === activeStep ? ' aria-current="step"' : ''}>${game.dateLabel(lastRecord.day)} · ${escape(lastRecord.title)}</button></li>` : '';
    const helpText = !help?.decided ? 'คืนฮาโลวีนจะมีจุดให้เลือกช่วยหนึ่งคน' : help.id ? `คนที่รับปากช่วย · ${characters[help.id].name}` : 'คืนฮาโลวีนกานต์ให้ทั้งสามคนจัดการเอง';
    dialog('ผังเส้นทางของเซฟนี้',`<p class="caption">${helpText} · กดช่องสีทองเพื่อย้อนอ่านฉาก</p><ol class="flow-list">
      <li class="flow-day started"><button type="button" class="flow-date visited" data-action="history" data-value="${opening.step}">${game.dateLabel(opening.day)} · บทนำ</button></li>
      ${days.join('')}${end}</ol>${routeOutcomes()}${behindButton()}`);
    const current = panelBody.querySelector('[aria-current="step"]');
    current?.scrollIntoView({block:'nearest'});
  }

  function openingFlow() {
    const activeStep = historyView ?? state?.records.at(-1).step;
    const found = endingProgress();
    const routes = Object.entries(opening.routes).map(([id,route]) => {
      const endings = endingScenes.filter(scene => scene.route === id);
      const count = endings.filter(scene => found.has(scene.ending)).length;
      return `<li class="available"><strong>${escape(route.name)} · ${escape(characters[route.person].name)}</strong>
        <small>${escape(route.entry)}</small><small>${count} / ${endings.length} ฉากจบ</small></li>`;
    }).join('');
    const visits = state?.records.map(record => `<li class="flow-day started">
      <button type="button" class="flow-date visited" data-action="history" data-value="${record.step}"${record.step === activeStep ? ' aria-current="step"' : ''}>
        ${game.dateLabel(record.day)} · ${escape(record.title)}</button>
      ${record.selected ? `<p class="flow-choice">${escape(record.selected)}</p>` : ''}</li>`).join('');
    const history = visits ? `<p class="caption">กดวันที่เพื่อย้อนอ่านฉากที่ผ่านแล้ว</p><ol class="flow-list opening-flow">${visits}</ol>` : '';
    dialog('ผังเส้นทาง',`<ul class="route-key">${routes}</ul>${history}`);
    panelBody.querySelector('[aria-current="step"]')?.scrollIntoView({block:'nearest'});
  }

  function saves(mode='manage') {
    const body = slots.map(index => {
      const entry = readSlot(index);
      const scene = entry?.run.records.at(-1);
      const edition = isOpening(entry?.run) ? opening.routes[scene.route]?.name ?? 'บทเปิด' : 'บทเดิม';
      const status = !scene ? 'ช่องว่าง' : `${edition} · ${game.dateLabel(scene.day)} · ${scene.title}`;
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
    if (!state || isOpening(state)) {
      dialog(c.name,`<div class="profile">${scenePicture(castStills[id],c.name)}<p class="caption">${c.age} ปี · ${c.job} · ${c.link}</p><p>${escape(opening.profiles[id])}</p>
        <div class="actions"><button type="button" class="button small" data-action="cast">ตัวละครทั้งหมด</button><a class="button small ghost" href="${c.ref}" target="_blank" rel="noopener">ดูภาพอ้างอิง</a></div></div>`);
      return;
    }
    dialog(c.name,`<div class="profile">${scenePicture(c.image,c.name)}<p class="caption">${c.age} ปี · ${c.job} · ${c.link}</p><p>${escape(c.bio)}</p>
      <details><summary>เปิดดูนิสัยที่เธอไม่พูดตรง ๆ</summary><p>${escape(c.secret)}</p></details>
      <div class="actions"><button type="button" class="button primary small" data-action="past" data-value="${id}">อ่านเรื่องก่อนมาบ้านกระจก</button><button type="button" class="button small" data-action="cast">ตัวละครทั้งหมด</button><a class="button small ghost" href="${c.ref}" target="_blank" rel="noopener">ดูภาพอ้างอิง</a></div></div>`);
  }

  function showPast(id) {
    const scene = past[id];
    if (!scene) return;
    dialog(scene.title,`${scenePicture(scene.art,scene.title)}<article class="prose bonus-text">${paragraphs(scene.text)}</article>
      <button type="button" class="button small ending-actions" data-action="profile" data-value="${id}">กลับไปที่ประวัติ${characters[id].name}</button>`);
  }

  function behindButton() {
    return keys.some(id => game.behind(state,id)) ? '<button type="button" class="button primary" data-action="behind-list">อ่านเรื่องหลังจบ</button>' : '';
  }

  function behindList() {
    const entries = keys.flatMap(id => {
      const scene = game.behind(state,id);
      if (!scene) return [];
      return [`<li class="note"><strong>${characters[id].name}กับ${rivals[id].name}</strong><p class="caption">${game.dateLabel(scene.day)} · ${escape(scene.title)}</p><button type="button" class="button small" data-action="behind" data-value="${id}">อ่านฉากลับ</button></li>`];
    });
    if (entries.length) dialog('เรื่องหลังจบ',`<p class="caption">เหตุการณ์ที่เกิดขึ้นในเซฟนี้ ขณะที่กานต์ไม่ได้อยู่ด้วย</p><ol class="journal-list">${entries.join('')}</ol>`);
  }

  function behind(id) {
    const scene = game.behind(state,id);
    if (!scene) return;
    dialog(scene.title,`${scenePicture(scene.art,scene.title)}<p class="caption bonus-date">${game.dateLabel(scene.day)} · ${characters[id].name}กับ${rivals[id].name}</p>
      <article class="prose bonus-text">${paragraphs(scene.text)}</article><button type="button" class="button small ending-actions" data-action="behind-list">กลับไปเรื่องหลังจบ</button>`);
  }

  function showCast() {
    const cast = `<div class="cast-grid">${keys.map(id => castCard(id)).join('')}</div>`;
    const modern = !state || isOpening(state);
    const partners = keys.map(id => {
      const person = rivals[id];
      const picture = modern ? scenePicture(partnerStills[id],person.name) : `<img src="${person.ref}" alt="ภาพ${person.name}" loading="lazy">`;
      return `<figure class="outcome-card">${picture}<figcaption><strong>${person.name}</strong><small>${person.age} ปี · ${person.job}</small><p>${escape(person.bio)}</p></figcaption></figure>`;
    });
    const roster = `<div class="cast-grid partner-cast">${partners.join('')}</div>`;
    dialog('ตัวละคร',cast + (modern ? roster : `<details class="partner-details"><summary>ตัวละคร 4–6</summary>${roster}</details>`));
  }

  function modernOffstage() {
    const logs = state.offstage.filter(note => note.person === journalPerson).slice().reverse();
    dialog('เรื่องที่กานต์ไม่เห็น',`<div class="actions journal-switch"><button type="button" class="button small" data-action="journal" data-value="history">ฉากที่อ่านแล้ว</button></div>
      <label class="journal-select">ตัวละคร <select id="journal-person">${keys.map(id => `<option value="${id}"${journalPerson === id ? ' selected' : ''}>${characters[id].name}</option>`).join('')}</select></label>
      <ol class="journal-list">${logs.map(note => `<li class="note"><strong>${game.dateLabel(note.day)} · ${note.time} น.</strong><p>${escape(note.text)}</p></li>`).join('')}</ol>`);
  }

  function journal(mode='known') {
    if (!state) return;
    const modern = isOpening(state);
    const modernEnding = modern && state.records.at(-1).ending;
    if (modernEnding && mode === 'offscreen') return modernOffstage();
    if (modern) mode = 'history';
    const views = [ ['known','เบาะแส'], ['history','ฉากที่อ่านแล้ว'], ['offscreen','เปิดเรื่องนอกฉาก'] ];
    const nav = modern ? (modernEnding ? '<div class="actions journal-switch"><button type="button" class="button small" data-action="journal" data-value="offscreen">เรื่องที่กานต์ไม่เห็น</button></div>' : '') : `<div class="actions journal-switch">${views.map(([id,name]) => `<button type="button" class="button small${mode === id ? ' primary' : ''}" aria-pressed="${mode === id}" data-action="journal" data-value="${id}">${name}</button>`).join('')}</div>`;
    let content;
    if (mode === 'history') {
      content = `<ol class="journal-list">${state.records.slice().reverse().map(record => `<li class="note"><strong>${escape(record.title)}</strong><p class="caption">${game.dateLabel(record.day)} · ${record.time} น.${record.selected ? ` · ${escape(record.selected)}` : ''}</p>
        <button type="button" class="button small" data-action="history" data-value="${record.step}">อ่านฉากนี้</button></li>`).join('')}</ol>`;
    } else if (mode === 'offscreen') {
      const notes = state.notes.filter(note => note.id === journalPerson).reverse();
      content = `<p class="caption">บันทึกส่วนนี้เปิดเผยเหตุการณ์ที่กานต์อาจยังไม่รู้</p><label class="journal-select">ตัวละคร <select id="journal-person">${keys.map(id => `<option value="${id}"${journalPerson === id ? ' selected' : ''}>${characters[id].name}</option>`).join('')}</select></label>
        <ol class="journal-list">${notes.map(note => `<li class="note"><strong>${game.dateLabel(note.day)} · ${note.time} น.</strong><p>${escape(note.body)}</p></li>`).join('')}</ol>`;
    } else {
      content = state.evidence.length ? `<ol class="journal-list">${state.evidence.slice().reverse().map(item => `<li class="note"><strong>${escape(item.title)}</strong><span class="caption"> · ${characters[item.id].name} · ${game.dateLabel(item.day)}</span><p>${escape(item.text)}</p></li>`).join('')}</ol>` : '<p class="caption">คำตอบที่กานต์ยืนยันกับคนในเหตุการณ์จะถูกบันทึกไว้ที่นี่</p>';
    }
    dialog('บันทึกของกานต์',nav + content);
  }

  document.addEventListener('click',event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const {action,value} = button.dataset;
    const index = Number(value);
    switch (action) {
      case 'home': if (panel.open) panel.close(); home(); atTop(); break;
      case 'new': saves('new'); break;
      case 'saves': saves(); break;
      case 'close': panel.close(); break;
      case 'close-zoom': zoomPanel.close(); break;
      case 'zoom': zoom(value,button.dataset.title); break;
      case 'toggle-zoom': magnify(button.getAttribute('aria-pressed') === 'false'); break;
      case 'cast': showCast(); break;
      case 'flow': flow(); break;
      case 'endings': showEndings(); break;
      case 'profile': profile(value); break;
      case 'past': showPast(value); break;
      case 'behind-list': behindList(); break;
      case 'behind': behind(value); break;
      case 'journal': journal(value); break;
      case 'history':
        if (state?.records[index]) { historyView = index; panel.close(); read(); }
        break;
      case 'current': historyView = null; read(); break;
      case 'extend':
        if (state && historyView === null) { state = game.extend(state); writeSlot(slot,state); read(); }
        break;
      case 'start':
        if (readSlot(index)) dialog(`เริ่มใหม่ในช่อง ${two(index)}`,`<p>การยืนยันจะเขียนทับความคืบหน้าเดิมในช่องนี้</p>
          <div class="actions ending-actions"><button type="button" class="button primary" data-action="confirm-start" data-value="${index}">ยืนยันเริ่มบทนำ</button><button type="button" class="button" data-action="new">เลือกช่องอื่น</button></div>`);
        else start(index);
        break;
      case 'confirm-start': start(index); break;
      case 'resume': {
        const entry = readSlot(index);
        if (entry) {
          state = game.restore(entry.run);
          slot = index;
          historyView = null;
          if (entry.run.version !== state.version) writeSlot(slot,state);
          panel.close(); read();
        }
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
          const ending = state.records.at(-1).ending;
          if (ending) endingProgress(ending);
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
