#!/usr/bin/env python3
"""Наносит логотип ОКАЛЕС на все фотографии сайта.

Оригиналы один раз копируются в assets/_original/ и дальше не трогаются —
скрипт всегда работает с ними, поэтому его можно запускать сколько угодно раз,
знак не наложится дважды. Хотите поменять размер или прозрачность —
поправьте константы ниже и запустите снова.

    .venv/bin/python watermark.py
"""
import pathlib, shutil, subprocess, sys

# ---------- настройки ----------
WIDTH_RATIO = 1/3      # ширина логотипа от ширины фотографии
MARGIN_RATIO = 0.035   # отступ от верхнего левого угла, доля ширины
OPACITY = 0.35         # непрозрачность знака: 1.0 — плотный, 0.25 — еле заметный
LOGO_FILE = 'logo-white'   # 'logo-white' — сплошной белый; 'logo' — с оранжевой точкой
HALO = False           # ореол/тень под знаком. Выключено: чистый водяной знак
AUTO_COLOR = False     # True — тёмный знак на светлых фото, светлый на тёмных
LIGHT_THRESHOLD = 145  # порог яркости для AUTO_COLOR
JPEG_QUALITY = 84
THUMB_WIDTH = 800      # превью для сеток, знак масштабируется вместе с фото
# --------------------------------

try:
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit('Нужен Pillow:  python3 -m venv .venv && .venv/bin/pip install Pillow')

ROOT = pathlib.Path(__file__).parent
ASSETS = ROOT / 'assets'
ORIG = ASSETS / '_original'
def rasterize(name: str) -> Image.Image:
    """SVG -> PNG с прозрачностью средствами macOS (sips)."""
    png = ORIG / f'{name}-2400.png'
    if not png.exists():
        png.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['sips', '-s', 'format', 'png', '-Z', '2400',
                        str(ASSETS / f'{name}.svg'), '--out', str(png)],
                       check=True, capture_output=True)
    return Image.open(png).convert('RGBA')


def targets():
    """Все фотографии сайта: интерьеры, производство и картинка для соцсетей."""
    for sub in ('interior', 'production'):
        for f in sorted((ASSETS / sub).glob('*.jpg')):
            if f.stem.endswith('-sm'):
                continue                     # превьюпересобираются из полного размера
            yield f
    yield ASSETS / 'og.jpg'


def original_of(path: pathlib.Path) -> pathlib.Path:
    """Первый запуск откладывает чистый оригинал, дальше читаем только его."""
    dest = ORIG / path.relative_to(ASSETS)
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return dest


def stamp(photo: Image.Image, light: Image.Image, dark: Image.Image) -> Image.Image:
    W, H = photo.size
    lw = max(1, round(W * WIDTH_RATIO))
    lh = max(1, round(lw * light.height / light.width))
    x = y = round(W * MARGIN_RATIO)

    # Смотрим, насколько светлый фон под знаком, и выбираем читаемый вариант
    patch = photo.convert('L').crop((x, y, min(W, x + lw), min(H, y + lh)))
    hist = patch.histogram()
    bright = sum(i * n for i, n in enumerate(hist)) / max(1, sum(hist))
    on_light = AUTO_COLOR and bright > LIGHT_THRESHOLD
    mark = (dark if on_light else light).resize((lw, lh), Image.LANCZOS)

    if OPACITY < 1:
        alpha = mark.getchannel('A').point(lambda v: round(v * OPACITY))
        mark.putalpha(alpha)

    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    if HALO:
        halo_rgb = (255, 255, 255) if on_light else (0, 0, 0)
        blur = max(2, round(lw * 0.02))
        halo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        solid = Image.new('RGBA', mark.size, halo_rgb + (0,))
        solid.putalpha(mark.getchannel('A').point(lambda v: round(v * 0.75)))
        halo.paste(solid, (x, y), solid)
        layer = Image.alpha_composite(layer, halo.filter(ImageFilter.GaussianBlur(blur)))

    layer.paste(mark, (x, y), mark)
    out = Image.alpha_composite(photo.convert('RGBA'), layer).convert('RGB')
    out.info['on_light'] = on_light
    return out


def main():
    light, dark = rasterize(LOGO_FILE), rasterize('logo-dark')
    done = 0
    for target in targets():
        src = original_of(target)
        with Image.open(src) as im:
            marked = stamp(im.convert('RGB'), light, dark)
        marked.save(target, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)

        thumb = target.with_name(target.stem + '-sm' + target.suffix)
        if thumb.exists() or target.parent.name in ('interior', 'production'):
            w = THUMB_WIDTH
            h = round(marked.height * w / marked.width)
            marked.resize((w, h), Image.LANCZOS).save(
                thumb, 'JPEG', quality=78, optimize=True, progressive=True)
        done += 1
        tone = 'тёмный знак' if marked.info.get('on_light') else 'белый знак'
        print(f'  {str(target.relative_to(ROOT)):38} {marked.width}×{marked.height}  '
              f'логотип {round(marked.width * WIDTH_RATIO)} px  {tone}')

    print(f'\nГотово: {done} фотографий. Оригиналы лежат в {ORIG.relative_to(ROOT)}/')


if __name__ == '__main__':
    main()
