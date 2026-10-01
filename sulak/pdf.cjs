// Короткий PDF «по видам работ»: одна работа — одна страница, крупная картинка и 3 строки.
// Запуск: node sulak/pdf.cjs  (после build.mjs)
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const here = __dirname;
const TOUR = require('./src/tour.js');
const viewer = path.join(here, 'dist', 'Сулак_3069-ЭС_3D.html');
const out = path.join(here, 'dist', 'Сулак_3069-ЭС_виды_работ.pdf');
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

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
  const page = await browser.newPage({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1.25 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + viewer);
  await page.addStyleTag({ content: '#side,#hint,#bar,#card,#tip,#cap{display:none!important} #app{grid-template-columns:1fr!important} .lb{font-size:13px!important;padding:2px 8px!important}' });
  await page.evaluate(() => { window.__paused = true; window.__onlySel = true; window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(800);
  const imgs = [];
  for (const s of TOUR) {
    await page.evaluate(([tag, p, c, also]) => { window.__also = also; window.__sulak.hl(tag); window.__sulak.frame(p, c, null); }, [s.tag, s.p, s.c, s.also || []]);
    imgs.push((await page.screenshot({ type: 'jpeg', quality: 88 })).toString('base64'));
  }
  if (errs.length) throw new Error(errs.join('\n'));

  const works = TOUR.slice(1, -1);
  const pages = works.map((s, i) => `
    <section class="pg">
      <div class="top"><span>НПС «Сулак» · проект 3069-ЭС</span><span>${i + 1} / ${works.length}</span></div>
      <img src="data:image/jpeg;base64,${imgs[i + 1]}">
      <h2>${esc(s.t)}</h2>
      <div class="rows">
        <div><b>Что делаем</b><span>${esc(s.a)}</span></div>
        <div><b>Чем крепим</b><span>${esc(s.b)}</span></div>
        <div><b>Норма</b><span>${esc(s.n)}</span></div>
      </div>
    </section>`).join('');

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
  @page{size:A4 landscape;margin:10mm 12mm}
  *{box-sizing:border-box}
  body{margin:0;font:13pt/1.35 "Segoe UI",Roboto,Arial,sans-serif;color:#17202a}
  .pg{height:189mm;page-break-after:always;display:flex;flex-direction:column;gap:3mm;overflow:hidden}
  .pg:last-child{page-break-after:auto}
  .top{display:flex;justify-content:space-between;font-size:9pt;color:#6a7680}
  img{width:100%;height:131mm;object-fit:cover;border-radius:3mm;border:1px solid #d9dee3}
  h2{margin:1mm 0 0;font-size:21pt;line-height:1.1}
  .rows{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm}
  .rows div{border-top:1.2mm solid #0b5cad;padding-top:2mm}
  .rows div:nth-child(2){border-top-color:#d98a00}
  .rows div:nth-child(3){border-top-color:#9aa5ae}
  .rows b{display:block;font-size:9pt;text-transform:uppercase;letter-spacing:.06em;color:#5b6670;margin-bottom:1mm}
  .cover h1{font-size:30pt;margin:0;line-height:1.1}
  .cover .sub{font-size:14pt;color:#3c4752}
  .cover img{height:118mm}
  .note{font-size:11pt;color:#5b6670}
  ol{margin:0;padding-left:8mm;font-size:15pt;line-height:1.5}
  .q h1{font-size:26pt;margin:0 0 4mm}
  .contact{margin-top:auto;font-size:12pt;border-top:1px solid #d9dee3;padding-top:3mm}
  </style></head><body>
  <section class="pg cover">
    <div class="top"><span>Проект 3069-ЭС · электроснабжение</span><span>${new Date().toLocaleDateString('ru-RU')}</span></div>
    <h1>НПС «Сулак»: как будем делать электрику</h1>
    <div class="sub">Подземный склад-укрытие. ${works.length} видов работ — по одному на странице: что делаем, чем крепим, по какой норме.</div>
    <img src="data:image/jpeg;base64,${imgs[0]}">
    <div class="note">Заказчик: АО «Черномортранснефть» · Генподрядчик: ООО «Инженерная группа специалистов» · Исполнитель: ИП Ибраков К.М.<br>
    * — наше предложение: в проекте этого нет, ставим только после согласования.</div>
  </section>
  ${pages}
  <section class="pg q">
    <div class="top"><span>НПС «Сулак» · проект 3069-ЭС</span><span></span></div>
    <h1>Вопросы к заказчику</h1>
    <ol>${QUESTIONS.map(q => '<li>' + esc(q) + '</li>').join('')}</ol>
    <div class="contact">ИП Ибраков Камиль Мурадович · +7 960 911-19-98 · kamilibrakov33@gmail.com</div>
  </section>
  </body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: out, format: 'A4', landscape: true, printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' } });
  await browser.close();
  console.log(out, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB');
})();
