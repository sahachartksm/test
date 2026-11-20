(() => {
  const title = 'จอกเหนือทะเลเมฆ';
  const sequel = globalThis.SelvaraSequel;
  const originalBook = {id:'part-1', label:'ภาคแรก', title, prefix:'chapter-', chapters:globalThis.SelvaraNovel};
  const sequelBook = {id:'part-2', label:'ภาค 2', title:sequel.title, prefix:'part-2-chapter-', chapters:sequel.chapters};
  const key = 'love-selvara-last-chapter-v1';
  const app = document.querySelector('#novel');
  const lightbox = document.querySelector('#isekai-image');
  const image = lightbox.querySelector('img');
  const caption = document.querySelector('#isekai-image-title');
  const escape = value => String(value).replace(/[&<>"']/g, mark => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[mark]);
  const chapterUrl = (book, chapter) => '#' + book.prefix + chapter.id;
  const routes = new Map([originalBook,sequelBook].flatMap(book => book.chapters.map((chapter,index) => [
    chapterUrl(book,chapter), {book,chapter,index}
  ])));
  const photoUrl = id => 'assets/scenes/isekai/' + id + '.webp';
  let lastRead;

  try {
    const saved = localStorage.getItem(key);
    if (saved) lastRead = routes.get(saved.startsWith('#') ? saved : '#chapter-' + saved);
  } catch {
    // Reading and navigation still work when storage is unavailable.
  }

  function remember(entry) {
    lastRead = entry;
    const {book,chapter} = entry;
    try {
      localStorage.setItem(key, book === originalBook ? chapter.id : chapterUrl(book,chapter));
    } catch {
      // Keep the current session's place in memory.
    }
  }

  function chapterList(book) {
    return `<section class="isekai-book" aria-labelledby="${book.id}">
      <h3 id="${book.id}" tabindex="-1">${book.label} · ${escape(book.title)}</h3>
      <ol class="isekai-chapters">${book.chapters.map(chapter => `<li>
        <a class="isekai-card" href="${chapterUrl(book,chapter)}">
          <img src="${photoUrl(chapter.scenes[0].frames[0].id)}" alt="" loading="lazy" width="3" height="2">
          <span class="isekai-card-copy"><small>ตอนที่ ${Number(chapter.id)}</small>
            <strong>${escape(chapter.title)}</strong>
            <span>${escape(chapter.summary)}</span>
          </span>
        </a>
      </li>`).join('')}</ol>
    </section>`;
  }

  function cover() {
    const sequelStart = chapterUrl(sequelBook,sequelBook.chapters[0]);
    const resume = lastRead && chapterUrl(lastRead.book,lastRead.chapter) !== sequelStart
      ? `<a class="button" href="${chapterUrl(lastRead.book,lastRead.chapter)}">อ่านต่อ ${lastRead.book.label} ตอนที่ ${Number(lastRead.chapter.id)}</a>`
      : '';
    app.innerHTML = `<section class="isekai-cover" aria-labelledby="novel-title">
      <img src="${photoUrl('cover')}" alt="จอกทองแดงบนผาเหนือเมืองเซลวารา ขณะเกิดคราส" fetchpriority="high">
      <div class="isekai-cover-copy">
        <p class="isekai-label">โลกอิเซไก</p>
        <h1 id="novel-title" tabindex="-1">จอกเหนือ<wbr><span>ทะเลเมฆ</span></h1>
        <p class="isekai-subtitle">ภาค 2 · ${escape(sequel.title)}</p>
        <p class="isekai-blurb">สามสัปดาห์หลังคืนคราส ท่าล่างกำลังจะจมน้ำ เรย์มีโอกาสย้อนกลับไปถึงวันแรกในเซลวาราเพียงครั้งเดียว</p>
        <div class="actions">
          <a class="button primary" href="${sequelStart}">เริ่มภาค 2</a>
          <a class="button" href="#recap">สรุปภาคแรก</a>
          ${resume}
        </div>
        <p class="isekai-content-note">เนื้อหาสำหรับผู้ใหญ่ · ความสัมพันธ์และการนอกใจ</p>
      </div>
    </section>
    <section class="isekai-recap" aria-labelledby="recap">
      <h2 id="recap" tabindex="-1">สรุปภาคแรก</h2>
      <p class="isekai-content-note">เปิดเผยเหตุการณ์ถึงตอนจบภาคแรก</p>
      <div class="prose">${sequel.recap.map(line => `<p>${escape(line)}</p>`).join('')}</div>
      <a href="${chapterUrl(originalBook,originalBook.chapters[0])}">อ่านภาคแรกตั้งแต่ต้น</a>
    </section>
    <section class="isekai-contents" id="contents" aria-labelledby="contents-title">
      <h2 id="contents-title" tabindex="-1">สารบัญ</h2>
      ${chapterList(sequelBook)}
      ${chapterList(originalBook)}
    </section>`;
  }

  function photo(frame, main, eager) {
    const label = escape(frame.label);
    return `<button class="isekai-photo ${main ? 'isekai-main-photo' : ''}" type="button"
      data-photo="${frame.id}" data-caption="${label}" aria-label="ขยายภาพ ${label}">
      <img src="${photoUrl(frame.id)}" alt="${label}" width="3" height="2"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}></button>`;
  }

  function read(entry) {
    const {book,chapter,index:chapterIndex} = entry;
    const previous = book.chapters[chapterIndex - 1];
    const next = book.chapters[chapterIndex + 1];
    const endingLink = book === originalBook
      ? `<a class="button primary" href="${chapterUrl(sequelBook,sequelBook.chapters[0])}">อ่านภาค 2 ›</a>`
      : '<p>จบภาค 2</p>';
    app.innerHTML = `<article class="isekai-reader">
      <header class="isekai-reader-head">
        <p class="isekai-label">${book.label} · ${escape(book.title)} · ตอนที่ ${chapterIndex + 1} / ${book.chapters.length}</p>
        <h1 tabindex="-1">${escape(chapter.title)}</h1>
        <p class="isekai-time">${escape(chapter.time)}</p>
      </header>
      ${chapter.scenes.map((scene, index) => `<section class="isekai-scene" aria-labelledby="scene-${index}">
        <h2 id="scene-${index}">${escape(scene.title)}</h2>
        ${photo(scene.frames[0], true, index === 0)}
        <div class="prose isekai-prose">${scene.paragraphs.map(line => `<p>${escape(line)}</p>`).join('')}</div>
        <div class="isekai-details${scene.frames.length === 5 ? ' isekai-details-four' : ''}" aria-label="ภาพประกอบเพิ่มเติม">${scene.frames.slice(1).map(frame => photo(frame, false, false)).join('')}</div>
      </section>`).join('')}
      <nav class="isekai-steps actions" aria-label="เปลี่ยนตอน">
        ${previous ? `<a class="button" href="${chapterUrl(book,previous)}">‹ ตอนก่อนหน้า</a>` : ''}
        <a class="button" href="#${book.id}">เลือกตอน</a>
        ${next ? `<a class="button primary" href="${chapterUrl(book,next)}">ตอนถัดไป ›</a>` : endingLink}
      </nav>
    </article>`;
    remember(entry);
  }

  function render(moveFocus) {
    const entry = routes.get(location.hash);
    if (lightbox.open) lightbox.close();
    if (entry) read(entry);
    else cover();
    document.title = entry ? `${entry.chapter.title} · ${entry.book.title}` : `${title} · Love`;
    const anchor = location.hash === '#contents' ? 'contents-title' : location.hash.slice(1);
    const heading = entry ? null : document.getElementById(anchor);
    if (heading) {
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
