"""Check static paths, bilingual navigation and JavaScript syntax."""

import re
import shutil
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = set()
        self.links = []
        self.language = None
        self.switch = None
        self.icon = None
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "html":
            self.language = attrs.get("lang")
        if "language-switch" in attrs.get("class", "").split():
            self.switch = attrs.get("href")
        if tag == "link" and attrs.get("rel") == "icon":
            self.icon = attrs.get("href")
        for attribute in ("href", "src"):
            if attrs.get(attribute):
                self.links.append(attrs[attribute])


def main():
    errors = []
    pages = {path.resolve(): Page(path) for path in ROOT.rglob("*.html")}
    for path, page in pages.items():
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            if url.path.startswith("/"):
                errors.append(f"{path.relative_to(ROOT)}: root-relative URL {link}")
                continue
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            if not target.exists():
                errors.append(f"{path.relative_to(ROOT)}: missing {link}")
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f"{path.relative_to(ROOT)}: missing anchor {link}")
        if not page.icon:
            errors.append(f"{path.relative_to(ROOT)}: missing favicon")
    for locale, language, other in (("cn", "zh-CN", "en"), ("en", "en", "cn")):
        for path in (ROOT / locale).glob("*.html"):
            page = pages[path.resolve()]
            if page.language != language:
                errors.append(f"{locale}/{path.name}: incorrect document language")
            if page.switch != f"../{other}/{path.name}":
                errors.append(f"{locale}/{path.name}: incorrect language switch")
            peer = ROOT / other / path.name
            if not peer.exists():
                errors.append(f"{locale}/{path.name}: missing translation")
            elif page.ids != pages[peer.resolve()].ids:
                errors.append(f"{locale}/{path.name}: IDs differ across languages")
    for path in (ROOT / "assets/css").glob("*.css"):
        for ref in re.findall(r"url\([\"']?([^\"')]+)", path.read_text()):
            if not urlsplit(ref).scheme and not (path.parent / ref).exists():
                errors.append(f"{path.relative_to(ROOT)}: missing {ref}")
    if not shutil.which("node"):
        errors.append("Node.js is required for JavaScript syntax checks")
    else:
        for path in ROOT.rglob("*.js"):
            check = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
            if check.returncode:
                errors.append(check.stderr.strip())
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"OK: {len(pages)} pages; resources, anchors, language switches and JavaScript syntax.")


if __name__ == "__main__":
    main()
