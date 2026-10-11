#!/bin/bash
# Собирает папку dist/ — ровно то, что нужно залить на хостинг.
# Служебные файлы (README, сборщик превью, сам preview.html) остаются здесь.
set -e
cd "$(dirname "$0")"

rm -rf dist && mkdir -p dist
cp index.html privacy.html 404.html robots.txt sitemap.xml styles.css script.js .htaccess dist/
# оригиналы без водяного знака на сервер не выкладываем
rsync -a --exclude '_original' assets dist/
find dist -name '.DS_Store' -delete

echo "Готово: $(pwd)/dist"
echo "Файлов: $(find dist -type f | wc -l | tr -d ' ')   Размер: $(du -sh dist | cut -f1)"
echo
echo "Содержимое:"
find dist -type f | sed 's|^dist/|  |' | sort
