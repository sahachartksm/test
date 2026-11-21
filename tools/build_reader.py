import argparse
from html import escape
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
PRODUCTION = ROOT / "production"
CHAPTER_COUNT = 30
BOOK = "คุณหนูใหญ่ซ่งอวิ๋น"
AUTHOR_URL = "https://novel.dek-d.com/SaiphanParichat/profile/writer/"
SOURCE_URL = "https://writer.dek-d.com/SaiphanParichat/writer/view.php?id=2689961"


def chapter_name(number, titles):
    title = titles.get(str(number))
    return f"ตอนที่ {number:02d} · {title}" if title else f"ตอนที่ {number:02d}"


def html_page(title, main, prefix="", theme_class="library"):
    return f"""<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#182e29">
  <title>{escape(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="{prefix}reader.css">
  <script src="{prefix}reader.js" defer></script>
</head>
<body class="{theme_class}">
  <a class="skip-link" href="#main">ข้ามไปยังเนื้อหา</a>
{main}
</body>
</html>"""


def book_brand(href):
    return f'<a class="brand" href="{href}"><span aria-hidden="true">ซ</span>{BOOK}</a>'


def cover_intro():
    cover = (CONTENT / "cover.md").read_bytes().decode("utf-8")
    blurb, intro = cover.split("## คำโปรย\n\n", 1)[1].split("\n\n## ข้อมูลเบื้องต้น\n\n", 1)
    paragraphs = intro.split("\n\n[", 1)[0].split("\n\n")
    return blurb, paragraphs


def library_page(titles):
    blurb, paragraphs = cover_intro()
    intro = "".join(f"<p>{escape(block)}</p>" for block in paragraphs if block.strip())
    chapters = "\n".join(
        f'<li><a href="read/{number:02d}.html"><span class="chapter-number">{number:02d}</span>'
        f'<span>{escape(titles.get(str(number), f"ตอนที่ {number:02d}"))}</span></a></li>'
        for number in range(1, CHAPTER_COUNT + 1)
    )
    return html_page(BOOK, f"""<header class="site-header">
    <div class="header-inner">{book_brand('index.html')}<a href="#chapters">สารบัญ</a></div>
  </header>
  <main id="main">
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="byline">นิยายโดย <a href="{AUTHOR_URL}">ซีอิ๋ง</a></p>
          <h1>{BOOK}</h1>
          <p class="blurb">{escape(blurb)}</p>
          <div class="hero-actions"><a class="button primary" href="read/01.html" id="start-reading">เริ่มอ่านตอนที่ 1</a><a class="button secondary" href="#chapters">ดูทุกตอน</a></div>
        </div>
        <figure class="book-cover"><img src="content/cover.webp" alt="ปก{BOOK}" width="704" height="1000"></figure>
      </div>
    </section>
    <div class="library-content">
      <section id="chapters" aria-labelledby="chapters-title">
        <div class="section-heading"><h2 id="chapters-title">สารบัญ</h2><p>{CHAPTER_COUNT} ตอน</p></div>
        <ol class="chapters" role="list">{chapters}</ol>
      </section>
      <details class="book-intro"><summary>ข้อมูลเบื้องต้น</summary><div class="intro-prose">{intro}</div></details>
    </div>
  </main>
  <footer class="site-footer"><a href="{SOURCE_URL}">ต้นฉบับบน Dek-D</a></footer>""")


def chapter_navigation(number):
    previous = f'<a class="button secondary" rel="prev" href="{number - 1:02d}.html">ตอนก่อนหน้า</a>' if number > 1 else "<span></span>"
    following = f'<a class="button primary" rel="next" href="{number + 1:02d}.html">ตอนถัดไป</a>' if number < CHAPTER_COUNT else '<a class="button primary" href="../index.html#chapters">กลับสารบัญ</a>'
    return f'<nav class="reader-pagination" aria-label="เปลี่ยนตอน">{previous}{following}</nav>'


def reader_page(number, titles, blocks, scenes):
    title = chapter_name(number, titles)
    chapter_title = titles.get(str(number))
    heading = f'<p class="reader-kicker">ตอนที่ {number:02d}</p><h1>{escape(chapter_title)}</h1>' if chapter_title else f'<h1>ตอนที่ {number:02d}</h1>'
    images_at = {}
    for scene in scenes:
        images_at.setdefault(scene["after"], []).append(scene)

    prose = []
    paragraph_number = 0
    for block in blocks:
        if not block.strip():
            continue
        paragraph_number += 1
        prose.append(f'<p data-source="{paragraph_number}">{escape(block)}</p>')
        for scene in images_at.get(paragraph_number, []):
            prose.append(f'<figure class="scene"><img src="../{scene["image"]}" alt="{escape(scene["alt"], quote=True)}" loading="lazy" decoding="async"></figure>')

    source = f"https://writer.dek-d.com/SaiphanParichat/writer/viewlongc.php?id=2689961&amp;chapter={number}"
    return html_page(f"{title} | {BOOK}", f"""<header class="site-header reader-header">
    <div class="reading-progress" aria-hidden="true"></div>
    <div class="header-inner">{book_brand('../index.html')}
      <div class="reader-actions"><a href="../index.html#chapters">สารบัญ</a><button type="button" id="font-smaller" aria-label="ลดขนาดตัวอักษร">ก−</button><button type="button" id="font-larger" aria-label="เพิ่มขนาดตัวอักษร">ก+</button><button type="button" id="theme-switch" aria-label="สลับโหมดอ่านกลางคืน" aria-pressed="false">โหมดมืด</button></div>
    </div>
  </header>
  <main id="main" data-chapter="{number}">
    <article>
      <header class="chapter-heading">{heading}<p class="reader-byline"><a href="{AUTHOR_URL}">ซีอิ๋ง</a></p></header>
      <div class="prose">{"".join(prose)}</div>
    </article>
    {chapter_navigation(number)}
  </main>
  <footer class="site-footer"><a href="{source}">ต้นฉบับบน Dek-D</a></footer>""", prefix="../", theme_class="reader")


def load_plan():
    plan = {}
    for path in sorted(PRODUCTION.glob("chapters-*.json")):
        batch = json.loads(path.read_text(encoding="utf-8"))
        for chapter in batch["chapters"]:
            number = chapter["number"]
            if number in plan:
                raise ValueError(f"Duplicate chapter plan: {number}")
            plan[number] = chapter["scenes"]
    return plan


def build(require_art):
    plan = load_plan()
    title_path = PRODUCTION / "titles.json"
    titles = json.loads(title_path.read_text(encoding="utf-8")) if title_path.exists() else {}
    files = {ROOT / "index.html": library_page(titles)}
    missing = []
    total_images = 0
    for number in range(1, CHAPTER_COUNT + 1):
        chapter = CONTENT / f"chapter-{number:02d}.md"
        blocks = chapter.read_bytes().decode("utf-8").removesuffix("\n").split("\n\n")
        paragraph_count = sum(bool(block.strip()) for block in blocks)
        scenes = plan.get(number, [])
        if require_art and len(scenes) < 5:
            raise ValueError(f"Chapter {number} has fewer than five planned illustrations")
        arranged = []
        for index, scene in enumerate(scenes, 1):
            if not 1 <= scene["after"] <= paragraph_count:
                raise ValueError(f"Invalid image position in chapter {number}, scene {index}")
            filename = f"assets/illustrations/{number:02d}/{index:02d}.webp"
            image = ROOT / filename
            if not image.is_file() or not image.stat().st_size:
                missing.append(filename)
                continue
            arranged.append({**scene, "image": filename})
        total_images += len(arranged)
        files[ROOT / "read" / f"{number:02d}.html"] = reader_page(number, titles, blocks, arranged)
    if missing and require_art:
        raise ValueError(f"{len(missing)} scene images are missing. First missing image: {missing[0]}")
    for path, document in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes((document + "\n").encode("utf-8"))
    print(f"Built {CHAPTER_COUNT} chapters with {total_images} inline illustrations.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build Songyun's static reader from the original files.")
    parser.add_argument("--require-art", action="store_true")
    build(parser.parse_args().require_art)
