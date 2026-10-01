// Собирает автономный HTML (работает без интернета): three.js + OrbitControls + данные встраиваются в файл.
// Запуск: node sulak/build.mjs <путь к пакету three@0.147.0>
import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const three = process.argv[2];
if (!three) { console.error('usage: node build.mjs <three-package-dir>'); process.exit(1); }

const read = p => fs.readFileSync(p, 'utf8');
const lib = read(path.join(three, 'build/three.min.js')) + '\n' + read(path.join(three, 'examples/js/controls/OrbitControls.js'));
const data = read(path.join(here, 'src/data.js'));
const safe = s => s.replace(/<\/script/gi, '<\\/script');

const html = read(path.join(here, 'src/viewer.html'))
  .replace('<!--DATA-->', () => '<script>' + safe(data) + '</script>')
  .replace('<!--THREE-->', () => '<script>' + safe(lib) + '</script>');

fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
const out = path.join(here, 'dist/Сулак_3069-ЭС_3D.html');
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + ' KB');
