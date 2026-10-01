// Один автономный HTML «Папка проекта»: видео, виды работ с картинками, вопросы, письмо.
// Всё встроено в файл, интернет не нужен — можно носить на флешке.
// Запуск: node sulak/folder.cjs  (после build.mjs и video.cjs)
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const here = __dirname;
const TOUR = require('./src/tour.js');
const viewer = path.join(here, 'dist', 'Сулак_3069-ЭС_3D.html');
const video = path.join(here, 'dist', 'Сулак_3069-ЭС_видео.mp4');
const out = path.join(here, 'dist', 'Сулак_папка_проекта.html');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const QUESTIONS = [
  'Крепёж в проекте не заложен: дюбели для скоб, анкеры для щитов. Ставим наш (*)?',
  'Обогреватели: на плане инфракрасные, в спецификации конвекторы. Какие ставить?',
  'Нет раздела 3069-АС (крепление вентиляторов). Просим выдать.',
  'Труба ПНД Ø50: в одном месте 15 м, в другом 30 м. Сколько?',
  'Гофра Ø25: заложено 150 м, по расчёту нужно около 186 м.',
  'Ошибки в спецификации: масса светильника, мастики, круга.'
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 760 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + viewer);
  await page.addStyleTag({ content: '#side,#hint,#bar,#card,#tip,#cap{display:none!important} #app{grid-template-columns:1fr!important} .lb{font-size:13px!important;padding:2px 8px!important}' });
  await page.evaluate(() => { window.__paused = true; window.__onlySel = true; window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(800);
  const imgs = [];
  for (const s of TOUR) {
    await page.evaluate(([tag, p, c, also]) => { window.__also = also; window.__sulak.hl(tag); window.__sulak.frame(p, c, null); }, [s.tag, s.p, s.c, s.also || []]);
    imgs.push((await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64'));
  }
  await browser.close();
  if (errs.length) throw new Error(errs.join('\n'));

  const works = TOUR.slice(1, -1);
  const cards = works.map((s, i) => `
      <article class="work">
        <img src="data:image/jpeg;base64,${imgs[i + 1]}" alt="${esc(s.t)}">
        <div class="wt"><span class="num">${i + 1}</span><h3>${esc(s.t)}</h3></div>
        <dl>
          <div><dt>Что делаем</dt><dd>${esc(s.a)}</dd></div>
          <div class="fix"><dt>Чем крепим</dt><dd>${esc(s.b)}</dd></div>
          <div class="nrm"><dt>Норма</dt><dd>${esc(s.n)}</dd></div>
        </dl>
      </article>`).join('');
  const vid = fs.readFileSync(video).toString('base64');

  const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сулак — папка проекта</title>
<style>
:root{--bg:#f2f4f3;--paper:#fff;--ink:#18211f;--muted:#5a6561;--line:#dce1de;--blue:#0e5a8a;--amber:#b56d00;--amber-bg:#fdf3e1}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.5 "Segoe UI",Roboto,Arial,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:28px 16px 60px;display:grid;gap:30px}
.eyebrow{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);font-weight:600}
h1{font-size:clamp(28px,4.5vw,40px);line-height:1.12;margin:6px 0 8px}
h2{font-size:24px;margin:0 0 12px}
.lead{color:var(--muted);max-width:60ch;margin:0}
nav{display:flex;flex-wrap:wrap;gap:8px}
nav a{background:var(--paper);border:1px solid var(--line);border-radius:999px;padding:6px 14px;color:var(--ink);text-decoration:none;font-size:15px}
nav a:hover{border-color:var(--blue);color:var(--blue)}
.box{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:20px 22px}
.short{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px 24px;margin:0}
.short dt{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.short dd{margin:2px 0 0;font-weight:600}
video{width:100%;border-radius:12px;background:#0b141c;display:block}
.works{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
.work{background:var(--paper);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.work img{width:100%;aspect-ratio:1400/760;object-fit:cover;display:block;cursor:zoom-in}
.wt{display:flex;gap:10px;align-items:center;padding:14px 16px 4px}
.num{flex:none;width:28px;height:28px;border-radius:7px;background:var(--blue);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px}
.wt h3{margin:0;font-size:19px;line-height:1.2}
.work dl{margin:0;padding:6px 16px 16px;display:grid;gap:8px}
.work dt{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.work dd{margin:0}
.work .fix dd{color:var(--amber);font-weight:600}
.work .nrm dd{color:var(--muted);font-size:15px}
.star{background:var(--amber-bg);border-radius:10px;padding:12px 16px}
ol{margin:0;padding-left:24px;display:grid;gap:8px;font-size:18px}
pre{white-space:pre-wrap;font:16px/1.55 inherit;font-family:inherit;margin:0}
footer{color:var(--muted);font-size:15px}
#zoom{position:fixed;inset:0;background:rgba(5,10,15,.88);display:none;align-items:center;justify-content:center;padding:16px;cursor:zoom-out}
#zoom.on{display:flex}
#zoom img{max-width:100%;max-height:100%;border-radius:8px}
@media print{nav,video,#zoom{display:none!important}.work{break-inside:avoid}}
</style></head>
<body>
<div class="wrap">
  <header>
    <div class="eyebrow">НПС «Сулак» · проект 3069-ЭС</div>
    <h1>Как будем делать электрику</h1>
    <p class="lead">Подземный склад-укрытие. Видео, все работы с картинками, вопросы к заказчику и письмо — в одном файле. Интернет не нужен.</p>
  </header>

  <nav><a href="#video">Видео</a><a href="#works">Работы</a><a href="#questions">Вопросы</a><a href="#letter">Письмо</a></nav>

  <section class="box">
    <h2>Коротко</h2>
    <dl class="short">
      <div><dt>Объект</dt><dd>Подземный склад-укрытие на 50 человек</dd></div>
      <div><dt>Заказчик</dt><dd>АО «Черномортранснефть»</dd></div>
      <div><dt>Генподрядчик</dt><dd>ООО «Инженерная группа специалистов»</dd></div>
      <div><dt>Исполнитель</dt><dd>ИП Ибраков К.М.</dd></div>
      <div><dt>Что делаем</dt><dd>Щиты, свет, розетки, кабели, траншея, заземление</dd></div>
      <div><dt>Граница работ</dt><dd>На территории НПС — заказчик, за её пределами — мы</dd></div>
    </dl>
  </section>

  <section id="video">
    <h2>Видео — 1,5 минуты</h2>
    <video controls preload="metadata" poster="data:image/jpeg;base64,${imgs[0]}" src="data:video/mp4;base64,${vid}"></video>
  </section>

  <section id="works">
    <h2>Работы — ${works.length} видов</h2>
    <p class="star"><b>*</b> — наше предложение. В проекте этого нет, ставим только после согласования с заказчиком. Нажмите на картинку, чтобы увеличить.</p>
    <div class="works" style="margin-top:14px">${cards}</div>
  </section>

  <section class="box" id="questions">
    <h2>Вопросы к заказчику</h2>
    <ol>${QUESTIONS.map(q => '<li>' + esc(q) + '</li>').join('')}</ol>
  </section>

  <section class="box" id="letter">
    <h2>Письмо заказчику</h2>
<pre>Мурад Магомедович, Тушахан Асадович, добрый день.

Высылаю короткий вариант, его удобнее смотреть:

1. Видео (1,5 мин) — облёт объекта, по каждой работе короткие подписи.
2. PDF — 13 видов работ, по одному на странице: что делаем, чем крепим, по какой норме.

Звёздочкой (*) отмечен крепёж, которого нет в проекте. Ставим его только после вашего согласования.
Вопросы к заказчику — на последней странице PDF.

С уважением,
Ибраков Камиль Мурадович
ИП Ибраков К.М.
+7 960 911-19-98</pre>
  </section>

  <footer>ИП Ибраков Камиль Мурадович · +7 960 911-19-98 · kamilibrakov33@gmail.com<br>По рабочей документации 3069-ЭС (ПСБ АО «Черномортранснефть», 2025). Чертежи проекта — коммерческая тайна.</footer>
</div>
<div id="zoom"><img alt=""></div>
<script>
var z = document.getElementById('zoom'), zi = z.querySelector('img');
document.querySelectorAll('.work img').forEach(function (im) { im.onclick = function () { zi.src = im.src; z.classList.add('on'); }; });
z.onclick = function () { z.classList.remove('on'); };
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') z.classList.remove('on'); });
</script>
</body></html>`;
  fs.writeFileSync(out, html);
  console.log(out, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB');
})();
