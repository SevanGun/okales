#!/usr/bin/env python3
"""Собирает весь сайт в один HTML-файл: стили, скрипты и картинки внутри.
Удобно отправить клиенту одним файлом или открыть без веб-сервера.

    python3 build-preview.py            -> preview.html (полноразмерные фото)
    python3 build-preview.py --light    -> preview.html (превью 800px, файл легче)
"""
import base64, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
LIGHT = '--light' in sys.argv

def data_uri(rel: str) -> str:
    p = ROOT / rel
    if LIGHT:
        sm = p.with_name(p.stem + '-sm' + p.suffix)
        if sm.exists():
            p = sm
    if not p.exists():
        return rel
    mime = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.svg': 'image/svg+xml', '.webp': 'image/webp'}.get(p.suffix.lower(), 'image/jpeg')
    b64 = base64.b64encode(p.read_bytes()).decode()
    return f'data:{mime};base64,{b64}'

html = (ROOT / 'index.html').read_text(encoding='utf-8')
css  = (ROOT / 'styles.css').read_text(encoding='utf-8')
js   = (ROOT / 'script.js').read_text(encoding='utf-8')

body = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
title = re.search(r'<title>(.*?)</title>', html, re.S).group(1)
title = re.split(r'\s+[—|]\s+', title)[0]        # короткое имя вкладки
fonts = re.search(r'<link href="https://fonts\.googleapis[^>]+>', html).group(0)

if LIGHT:                       # лайтбокс возьмёт то же изображение из карточки
    body = re.sub(r'\s*data-full="assets/[^"]+"', '', body)
body = re.sub(r'(src|data-full)="(assets/[^"]+)"',
              lambda m: f'{m.group(1)}="{data_uri(m.group(2))}"', body)
body = body.replace('<script src="script.js"></script>', '')
body = body.replace('href="privacy.html"', 'href="#" data-privacy')

out = (f'<title>{title}</title>\n'
       '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
       '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
       f'{fonts}\n'
       f'<style>\n{css}\n</style>\n'
       f'{body}\n'
       f'<script>\n{js}\n</script>\n')

dest = ROOT / 'preview.html'
dest.write_text(out, encoding='utf-8')
print(f'{dest}  —  {dest.stat().st_size/1024/1024:.2f} МБ'
      f'{"  (лёгкая версия)" if LIGHT else ""}')
