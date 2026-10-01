// Делает кадры из 3D-модели и собирает PDF-пояснение к 3D-схеме.
// Запуск: node sulak/report.cjs   (после node sulak/build.mjs ...)
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const here = __dirname;
const viewer = path.join(here, 'dist', 'Сулак_3069-ЭС_3D.html');
const outPdf = path.join(here, 'dist', 'Сулак_3069-ЭС_пояснение_к_3D.pdf');
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(here, 'src/data.js'), 'utf8'), ctx);
const D = ctx.window.SULAK;

const SHOTS = [
  ['all', null, 'Общий вид. Заглублённый склад, кабельная трасса к КТП (215 м, показана сокращённо), переход под автодорогой, спуск с эстакады.'],
  ['in', null, 'Внутри склада. Щиты у северной стены помещения 2, гофра ПВХ по перекрытию к светильникам, спуски к выключателям и розеткам.'],
  ['vru', 'vru', 'Щитовая стена. ВРУ с АВР, ШР, ШО, ЩУВ; ввод 2×ВБШв 5×35 через гильзы, кабель-канал 100×50, ГЗШ и магистраль заземления.'],
  ['gofra', 'gofra', 'Гофротруба ПВХ Ø25 с двухлапковыми скобами через 0,5 м: подъём от щитов, трасса по перекрытию, распаячные коробки.'],
  ['trench', 'trench', 'Траншея Т-6 0,7×0,9 м: постель 0,2 м, кабели, засыпка 0,2 м, обратная засыпка 0,5 м, сигнальная лента, полоса заземления на ребро.'],
  ['road', 'road', 'Переход под автодорогой: две трубы ПНД Ø50 на глубине 1,0 м, концы уплотняются (эскиз 1, лист 7).'],
  ['drop', 'drop', 'Спуск с эстакады: Z-профиль 97×40×2000 на стойке, лоток 100×100 с крышкой, крепление через 0,8 м, ПНД под крышкой на высоте 0,8 м.'],
  ['ground', 'gout', 'Заземляющее устройство: полоса 3×40 на глубине 0,7 м, электроды Ø16 L=5 м, связь с существующим КЗУ по траншее.'],
  ['vent', 'vent', 'Кровля сооружения: вентиляторы VC-315 с шумоглушителем, отводом и клапаном; питание от ЩУВ кабелем в ПНД Ø25.'],
  ['des', 'des', 'Входная группа: шкаф 400×600×200 со стационарной вилкой 63 А для подключения резервной ДЭС.']
];

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const ul = a => '<ul>' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1500, height: 820 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + viewer);
  await page.addStyleTag({ content: '#side,#hint,#bar,#card{display:none!important} #app{grid-template-columns:1fr!important}' });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(1200);
  const imgs = [];
  for (const [v, tag] of SHOTS) {
    await page.evaluate(([v, t]) => window.__sulak.shot(v, t), [v, tag]);
    await page.waitForTimeout(600);
    imgs.push((await page.screenshot({ type: 'jpeg', quality: 86 })).toString('base64'));
  }
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

  const M = D.meta;
  const today = new Date().toLocaleDateString('ru-RU');
  let n = 0;
  const rows = D.stages.map(s =>
    `<tr class="st"><td colspan="5">Этап ${s.n}. ${esc(s.name)}</td></tr>` +
    D.items.filter(i => i.stage === s.n).map(i => `<tr>
      <td class="c">${++n}</td>
      <td><b>${esc(i.name)}</b><div class="mut">${esc(i.qty)}<br>СО: ${esc(i.so)} · ВР: ${esc(i.vr)}</div></td>
      <td>${ul(i.mount)}</td>
      <td>${i.add ? '<div class="add">' + ul(i.add) + '</div>' : '<span class="mut">по проекту</span>'}${i.warn ? '<div class="warn">⚠ ' + esc(i.warn) + '</div>' : ''}</td>
      <td class="docs">${ul(i.docs)}</td></tr>`).join('')).join('');

  const shotPages = [];
  for (let i = 0; i < SHOTS.length; i += 2) {
    shotPages.push('<section class="pg shots">' + [i, i + 1].filter(k => k < SHOTS.length).map(k =>
      `<figure><img src="data:image/jpeg;base64,${imgs[k]}"><figcaption><b>Рис. ${k + 1}.</b> ${esc(SHOTS[k][2])}</figcaption></figure>`).join('') + '</section>');
  }

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
  @page{size:A4 landscape;margin:12mm 12mm 14mm}
  body{font:10pt/1.4 "Segoe UI",Roboto,Arial,sans-serif;color:#1b1f24;margin:0}
  .pg{page-break-after:always}
  .cover h1{font-size:22pt;margin:0 0 4pt;line-height:1.2}
  .cover .code{color:#0b5cad;font-weight:700;letter-spacing:.05em}
  .cover .grid{display:grid;grid-template-columns:1fr 1.55fr;gap:14pt;margin-top:10pt}
  .cover dl{margin:0} .cover dt{font-size:8pt;text-transform:uppercase;color:#5d6672;letter-spacing:.05em;margin-top:7pt} .cover dd{margin:1pt 0 0}
  .cover img{width:100%;border:1px solid #dfe3e8;border-radius:6pt}
  .legend{margin-top:10pt;font-size:9pt}
  .legend span{display:inline-block;padding:1pt 6pt;border-radius:4pt;margin-right:6pt}
  .shots{display:flex;flex-direction:column;gap:5pt}
  figure{margin:0} figure img{width:100%;height:76mm;object-fit:cover;border:1px solid #dfe3e8;border-radius:5pt}
  figcaption{font-size:9pt;margin-top:3pt}
  h2{font-size:14pt;margin:0 0 6pt}
  table{width:100%;border-collapse:collapse;font-size:8.3pt}
  th{background:#0b5cad;color:#fff;text-align:left;padding:4pt 5pt;font-weight:600}
  td{border-bottom:1px solid #dfe3e8;padding:4pt 5pt;vertical-align:top}
  tr{page-break-inside:avoid}
  tr.st td{background:#eef3f9;font-weight:700;color:#0b5cad;padding-top:6pt}
  td ul{margin:0;padding-left:12pt} td li{margin:0 0 1pt}
  .c{text-align:center;color:#5d6672}
  .mut{color:#5d6672;font-size:8pt}
  .add{background:#fff3e0;border-radius:4pt;padding:2pt 4pt}
  .warn{background:#fdecea;border-radius:4pt;padding:2pt 4pt;margin-top:3pt;color:#8c1d18}
  .docs{color:#38414b;width:17%}
  .q{border:1px solid #dfe3e8;border-radius:5pt;padding:5pt 8pt;margin:0 0 5pt}
  .two{display:grid;grid-template-columns:1.25fr 1fr;gap:14pt}
  .sign td{border:0;padding:12pt 4pt 2pt}
  .line{border-bottom:1px solid #1b1f24;display:inline-block;width:150pt}
  </style></head><body>
  <section class="pg cover">
    <div class="code">${esc(M.code)} · ЭЛЕКТРОСНАБЖЕНИЕ · ПОЯСНЕНИЕ К 3D-СХЕМЕ</div>
    <h1>Как будут выполнены электромонтажные работы</h1>
    <div>${esc(M.object)}</div>
    <div class="grid">
      <div><dl>
        <dt>Заказчик</dt><dd>${esc(M.customer)}</dd>
        <dt>Генеральный подрядчик</dt><dd>${esc(M.general)}</dd>
        <dt>Исполнитель электромонтажных работ</dt><dd>${esc(M.contractor)}<br>${esc(M.phone)} · ${esc(M.email)}</dd>
        <dt>Основание</dt><dd>Рабочая документация ${esc(M.code)} (${esc(M.designer)}): листы 1–11, спецификация 3069-ЭС.СО, ведомость объёмов работ 3069-ЭС.ВР, опросные листы ОЛ1–ОЛ3</dd>
        <dt>Состав</dt><dd>${D.items.length} видов работ в 6 этапах; к документу приложен файл интерактивной 3D-модели (открывается в любом браузере, интернет не нужен)</dd>
        <dt>Дата</dt><dd>${today}</dd>
      </dl>
      <div class="legend"><b>Как читать таблицу:</b><br>
        <span style="background:#e6f0fa">как в проекте</span><span style="background:#fff3e0">предлагаем дополнительно</span><span style="background:#fdecea">вопрос к заказчику</span></div>
      </div>
      <img src="data:image/jpeg;base64,${imgs[0]}">
    </div>
  </section>
  ${shotPages.join('')}
  <section class="pg"><h2>Виды работ: что делаем, чем и как крепим, по каким нормам</h2>
    <table><thead><tr><th style="width:3%">№</th><th style="width:20%">Вид работ, объём</th><th style="width:36%">Как выполняем и крепим — по проекту</th><th style="width:24%">Предлагаем дополнительно / вопрос</th><th>Нормативы, листы</th></tr></thead>
    <tbody>${rows}</tbody></table></section>
  <section><div class="two">
    <div><h2>Вопросы к заказчику (до начала работ)</h2>
      ${D.questions.map((q, i) => `<div class="q"><b>${i + 1}. ${esc(q.t)}.</b> ${esc(q.d)}</div>`).join('')}</div>
    <div><h2>Акты освидетельствования скрытых работ</h2>${ul(D.hiddenWorks)}
      <h2 style="margin-top:12pt">Условности 3D-схемы</h2>
      <ul><li>Геометрия построена по планам листов 7–11 РД 3069-ЭС.</li>
      <li>Трасса 215 м и переход под дорогой показаны сокращённо.</li>
      <li>Диаметры кабелей и труб увеличены, чтобы их было видно.</li>
      <li>Позиции из оранжевых блоков в проекте отсутствуют. Это предложение исполнителя, применяется только после согласования.</li></ul>
      <table class="sign"><tr><td>Исполнитель: ${esc(M.contractor)}</td><td><span class="line"></span></td></tr>
      <tr><td>Согласовано: представитель заказчика</td><td><span class="line"></span></td></tr>
      <tr><td>Согласовано: генеральный подрядчик</td><td><span class="line"></span></td></tr></table>
    </div></div></section>
  </body></html>`;

  fs.writeFileSync(path.join(here, 'dist', '_report.html'), html);
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: outPdf, format: 'A4', landscape: true, printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:7pt;color:#777;width:100%;padding:0 12mm;display:flex;justify-content:space-between"><span>НПС «Сулак» · 3069-ЭС · пояснение к 3D-схеме</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' } });
  fs.unlinkSync(path.join(here, 'dist', '_report.html'));
  await browser.close();
  console.log(outPdf, (fs.statSync(outPdf).size / 1024).toFixed(0) + ' KB');
})();
