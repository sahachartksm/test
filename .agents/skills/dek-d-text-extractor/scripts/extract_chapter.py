import argparse
from html.parser import HTMLParser
from pathlib import Path
import shutil
import subprocess
from tempfile import NamedTemporaryFile
import unicodedata
from urllib.parse import parse_qs, urlsplit


# The regular and _content fonts draw the same glyphs at these codepoints.
THAI_TRANSLATION = {code: code - 0x64 for code in range(0x0E65, 0x0E7A)}


class ChapterParagraphs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.story_depth = 0
        self.story_count = 0
        self.paragraph = None
        self.paragraphs = []
        self.ignored_tag = None

    def handle_starttag(self, tag, attrs):
        if tag == "div":
            if self.story_depth:
                self.story_depth += 1
            elif dict(attrs).get("id") == "story-content":
                self.story_count += 1
                self.story_depth = 1
        if not self.story_depth:
            return

        if tag in {"script", "style"}:
            self.ignored_tag = tag
        elif tag == "p":
            if self.paragraph is not None:
                raise ValueError("Found nested or unclosed chapter paragraphs.")
            self.paragraph = []
        elif tag == "br" and self.paragraph is not None:
            self.paragraph.append("\n")

    def handle_endtag(self, tag):
        if not self.story_depth:
            return

        if tag == self.ignored_tag:
            self.ignored_tag = None
        elif tag == "p":
            if self.paragraph is None:
                raise ValueError("Found a paragraph closing tag without an opening tag.")
            self.paragraphs.append("".join(self.paragraph))
            self.paragraph = None
        elif tag == "div":
            self.story_depth -= 1

    def handle_data(self, data):
        if not self.story_depth or self.ignored_tag:
            return
        if self.paragraph is not None:
            self.paragraph.append(data)
        elif data.strip():
            raise ValueError("Found chapter text outside paragraphs. Inspect the page layout.")


def extract_paragraphs(document):
    chapter = ChapterParagraphs()
    chapter.feed(document)
    chapter.close()
    if chapter.story_count != 1 or chapter.story_depth or chapter.paragraph is not None:
        raise ValueError("Expected exactly one complete Dek-D chapter body.")

    paragraphs = [paragraph.translate(THAI_TRANSLATION) for paragraph in chapter.paragraphs]
    if not any(paragraph.strip() for paragraph in paragraphs):
        raise ValueError("The page did not return any chapter text.")

    unexpected = {
        ord(character)
        for paragraph in paragraphs
        for character in paragraph
        if character == "\ufffd" or unicodedata.category(character) in {"Cn", "Co", "Cs"}
    }
    if unexpected:
        codepoints = ", ".join(f"U+{code:04X}" for code in sorted(unexpected))
        raise ValueError(f"Unrecognized characters after decoding: {codepoints}")
    return paragraphs


def fetch_chapter(url):
    parts = urlsplit(url)
    query = parse_qs(parts.query)
    if (
        parts.scheme != "https"
        or parts.netloc.lower() != "writer.dek-d.com"
        or not parts.path.endswith("/writer/viewlongc.php")
        or not all(len(query.get(key, [])) == 1 and query[key][0].isdigit() for key in ("id", "chapter"))
    ):
        raise ValueError("Provide a Dek-D chapter URL with id and chapter parameters.")

    curl = shutil.which("curl.exe") or shutil.which("curl")
    if curl is None:
        raise ValueError("curl is required to fetch the chapter.")
    return subprocess.check_output(
        [curl, "--fail", "--location", "--silent", "--show-error", "--max-time", "30", url]
    ).decode("utf-8")


def write_markdown(path, markdown, overwrite):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(dir=path.parent, delete=False) as output:
            temporary = Path(output.name)
            output.write(markdown)
        if temporary.read_bytes() != markdown:
            raise OSError("Could not verify the staged UTF-8 file.")
        if overwrite:
            temporary.replace(path)
        else:
            path.hardlink_to(temporary)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Save a Dek-D chapter as UTF-8 Markdown.")
    parser.add_argument("url", help="Dek-D chapter URL")
    parser.add_argument("output", type=Path, help="Destination Markdown file")
    parser.add_argument("--overwrite", action="store_true", help="Replace the destination if present")
    args = parser.parse_args()

    try:
        paragraphs = extract_paragraphs(fetch_chapter(args.url))
        markdown = ("\n\n".join(paragraphs) + "\n").encode("utf-8")
        write_markdown(args.output, markdown, args.overwrite)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Could not export chapter: {error}\n")

    count = sum(bool(paragraph.strip()) for paragraph in paragraphs)
    print(f"Saved {count} paragraphs to {args.output}")


if __name__ == "__main__":
    main()
