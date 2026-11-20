(() => {
  const chapters = globalThis.SelvaraNovel;
  const title = 'จอกเหนือทะเลเมฆ';
  const key = 'love-selvara-last-chapter-v1';
  const app = document.querySelector('#novel');
  const lightbox = document.querySelector('#isekai-image');
  const image = lightbox.querySelector('img');
  const caption = document.querySelector('#isekai-image-title');
  const escape = value => String(value).replace(/[&<>"']/g, mark => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[mark]);
  const chapterUrl = chapter => '#chapter-' + chapter.id;
  const photoUrl = id => 'assets/scenes/isekai/' + id + '.webp';
  let lastChapter;

  try {
    const saved = localStorage.getItem(key);
    lastChapter = chapters.find(chapter => chapter.id === saved);
  } catch {
    // Reading and navigation still work when storage is unavailable.
  }

  function remember(chapter) {
    lastChapter = chapter;
    try {
      localStorage.setItem(key, chapter.id);
    } catch {
      // Keep the current session's place in memory.
    }
  }

  function cover() {
    const resume = lastChapter ? `<a class="button" href="${chapterUrl(lastChapter)}">อ่านต่อ ตอนที่ ${Number(lastChapter.id)}</a>` : '';
    app.innerHTML = `<section class="isekai-cover" aria-labelledby="novel-title">
      <img src="${photoUrl('cover')}" alt="จอกทองแดงบนผาเหนือเมืองเซลวารา ขณะเกิดคราส" fetchpriority="high">
      <div class="isekai-cover-copy">
        <p class="isekai-label">โลกอิเซไก</p>
        <h1 id="novel-title" tabindex="-1">จอกเหนือ<wbr><span>ทะเลเมฆ</span></h1>
        <p class="isekai-blurb">ตั๋วรถไฟเที่ยวสุดท้ายพาเรย์ไปถึงเมืองเหนือเมฆ ที่นั่นมีสถานีหนึ่งที่ทุกคนพยายามลืม และมีจอกหนึ่งใบที่ยอมให้เขาขอพรได้ครั้งเดียว</p>
        <div class="actions"><a class="button primary" href="${chapterUrl(chapters[0])}">เริ่มอ่าน</a>${resume}</div>
        <p class="isekai-content-note">เนื้อหาสำหรับผู้ใหญ่ · ความสัมพันธ์และการนอกใจ</p>
      </div>
    </section>
    <section class="isekai-contents" id="contents" aria-labelledby="contents-title">
      <h2 id="contents-title" tabindex="-1">เลือกตอน</h2>
      <ol class="isekai-chapters">${chapters.map(chapter => `<li>
        <a class="isekai-card" href="${chapterUrl(chapter)}">
          <img src="${photoUrl(chapter.scenes[0].frames[0].id)}" alt="" loading="lazy" width="3" height="2">
          <span class="isekai-card-copy"><small>ตอนที่ ${Number(chapter.id)}</small>
            <strong>${escape(chapter.title)}</strong>
            <span>${escape(chapter.summary)}</span>
          </span>
        </a>
      </li>`).join('')}</ol>
    </section>`;
  }

  function photo(frame, main, eager) {
    const label = escape(frame.label);
    return `<button class="isekai-photo ${main ? 'isekai-main-photo' : ''}" type="button"
      data-photo="${frame.id}" data-caption="${label}" aria-label="ขยายภาพ ${label}">
      <img src="${photoUrl(frame.id)}" alt="${label}" width="3" height="2"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}></button>`;
  }

  function read(chapter) {
    const number = Number(chapter.id);
    const previous = chapters[number - 2];
    const next = chapters[number];
    app.innerHTML = `<article class="isekai-reader">
      <header class="isekai-reader-head">
        <p class="isekai-label">${title} · ตอนที่ ${number} / ${chapters.length}</p>
        <h1 tabindex="-1">${escape(chapter.title)}</h1>
        <p class="isekai-time">${escape(chapter.time)}</p>
      </header>
      ${chapter.scenes.map((scene, index) => `<section class="isekai-scene" aria-labelledby="scene-${index}">
        <h2 id="scene-${index}">${escape(scene.title)}</h2>
        ${photo(scene.frames[0], true, index === 0)}
        <div class="prose isekai-prose">${scene.paragraphs.map(line => `<p>${escape(line)}</p>`).join('')}</div>
        <div class="isekai-details" aria-label="ภาพประกอบเพิ่มเติม">${scene.frames.slice(1).map(frame => photo(frame, false, false)).join('')}</div>
      </section>`).join('')}
      <nav class="isekai-steps actions" aria-label="เปลี่ยนตอน">
        ${previous ? `<a class="button" href="${chapterUrl(previous)}">‹ ตอนก่อนหน้า</a>` : ''}
        <a class="button" href="#contents">เลือกตอน</a>
        ${next ? `<a class="button primary" href="${chapterUrl(next)}">ตอนถัดไป ›</a>` : '<p>จบเรื่อง</p>'}
      </nav>
    </article>`;
    remember(chapter);
  }

  function render(moveFocus) {
    const chapter = chapters.find(entry => chapterUrl(entry) === location.hash);
    if (lightbox.open) lightbox.close();
    if (chapter) read(chapter);
    else cover();
    document.title = chapter ? `${chapter.title} · ${title}` : `${title} · Love`;
    if (location.hash === '#contents') {
      const heading = document.querySelector('#contents-title');
      if (moveFocus) heading.focus({preventScroll:true});
      heading.scrollIntoView();
    } else if (moveFocus) {
      app.querySelector('h1').focus({preventScroll:true});
      window.scrollTo(0, 0);
    }
  }

  app.addEventListener('click', event => {
    const button = event.target.closest('button[data-photo]');
    if (!button) return;
    const {photo, caption:label} = button.dataset;
    caption.textContent = label;
    image.alt = label;
    image.src = photoUrl(photo);
    lightbox.showModal();
  });

  lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) lightbox.close();
  });
  window.addEventListener('hashchange', () => render(true));
  render(false);
})();
