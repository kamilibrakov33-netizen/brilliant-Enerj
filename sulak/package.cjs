// Собирает папку проекта для передачи (флешка/архив):
//   ОТКРЫТЬ.html — главная страница с кнопками
//   1_Проект_от_заказчика/ — исходная документация 3069-ЭС (как получили)
//   2_Наша_работа/ — 3D-модель, видео, PDF
//   3_Письмо/ — текст сопроводительного письма
// Запуск: node sulak/package.cjs <папка с исходным 3069-ЭС> <куда собрать>
const fs = require('fs');
const path = require('path');

const here = __dirname;
const [src, dest] = process.argv.slice(2);
if (!src || !dest) { console.error('usage: node package.cjs <3069-ЭС dir> <out dir>'); process.exit(1); }

const ROOT = path.join(dest, 'Сулак_3069-ЭС');
const P1 = '1_Проект_от_заказчика', P2 = '2_Наша_работа', P3 = '3_Письмо';
fs.rmSync(ROOT, { recursive: true, force: true });
for (const d of [P1, P2, P3]) fs.mkdirSync(path.join(ROOT, d), { recursive: true });

// 1. исходный проект (без служебных Thumbs.db)
fs.cpSync(src, path.join(ROOT, P1, '3069-ЭС'), { recursive: true, filter: f => path.basename(f) !== 'Thumbs.db' });

// 2. наша работа
const ours = {
  model: ['Сулак_3069-ЭС_3D.html', '3D_модель.html'],
  video: ['Сулак_3069-ЭС_видео.mp4', 'Видео_облёт.mp4'],
  works: ['Сулак_3069-ЭС_виды_работ.pdf', 'Виды_работ.pdf'],
  full: ['Сулак_3069-ЭС_пояснение_к_3D.pdf', 'Пояснение_полное.pdf']
};
for (const [from, to] of Object.values(ours)) fs.copyFileSync(path.join(here, 'dist', from), path.join(ROOT, P2, to));

const LETTER = `Тема: НПС «Сулак», 3069-ЭС — как будем выполнять электромонтажные работы

Мурад Магомедович, Тушахан Асадович, добрый день.

Мы изучили рабочую документацию 3069-ЭС «Электроснабжение» по объекту «НПС «Сулак». Заглублённый склад хранения материальных ценностей с резервным МДП» и подготовили наглядные материалы: как будет выполнена каждая работа, чем и на что крепится, по какой норме.

Во вложении:
1. Видео (1,5 мин) — облёт объекта с подписями по каждой работе.
2. PDF «Виды работ» — 13 работ, по одной на странице: что делаем, чем крепим, норма.
3. PDF «Пояснение» — таблица всех 27 видов работ с объёмами, позициями спецификации и нормативами.

Граница работ — как в письме от 30.09.2026: в границах территории НПС работы выполняет заказчик, за её пределами — ИП Ибраков К.М.

Звёздочкой (*) отмечен крепёж, которого в проекте нет (дюбели, анкеры). Ставить его будем только после вашего согласования.

До начала работ прошу ответить на вопросы:
1. Крепёж в проекте не заложен: дюбели для 300 скоб гофры, анкеры для щитов. Согласуете наш вариант (*)?
2. Обогреватели: на плане инфракрасные, в спецификации электроконвекторы 1,5 кВт. Какие ставить?
3. Раздел 3069-АС (крепление вентиляторов) в комплекте отсутствует. Просим выдать.
4. Труба ПНД Ø50: в спецификации 15 м, в ведомости объёмов 30 м. Какой объём верный?
5. Гофра ПВХ Ø25: заложено 150 м, по ведомости кабеля в гофре около 186 м.
6. В спецификации ошибки: масса светильника поз. 18, количество мастики поз. 42, масса круга поз. 54.

Интерактивную 3D-модель могу показать на встрече или передать на флешке.

С уважением,
Ибраков Камиль Мурадович
ИП Ибраков К.М. («Бриллиант Энерджи»),
субподрядчик ООО «Инженерная группа специалистов»
Тел. +7 960 911-19-98
kamilibrakov33@gmail.com
`;
fs.writeFileSync(path.join(ROOT, P3, 'Письмо_заказчику.txt'), '\ufeff' + LETTER.replace(/\n/g, '\r\n')); // BOM и CRLF — чтобы Блокнот и браузер показали кириллицу

// ---------- главная страница ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const href = p => p.split('/').map(encodeURIComponent).join('/');
const size = p => { const b = fs.statSync(path.join(ROOT, p)).size; return b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ'; };
const btn = (p, label, cls) => `<a class="btn ${cls || ''}" href="${href(p)}" target="_blank" rel="noopener">${esc(label)}</a>`;

const S = `${P1}/3069-ЭС`;
// что нам дали → что мы из этого сделали
const DOCS = [
  { f: `${S}/ФС/3069-ЭС.pdf`, name: 'Полный комплект проекта с подписями', what: '36 листов: общие данные, схемы, планы, спецификация, ведомость объёмов работ, опросные листы', did: 'Прочитали полностью. По планам листов 7–11 построили 3D-модель' },
  { f: `${S}/ФР/3069-ЭС.СО.xlsx`, name: 'Спецификация оборудования и материалов (СО)', what: '62 позиции: кабели, щиты, светильники, гофра, скобы, заземление', did: 'Сверили по каждой работе. Нашли, что не заложен крепёж' },
  { f: `${S}/ФР/3069-ЭС.dwg`, name: 'Чертежи, листы 1–11', what: 'AutoCAD: схемы, планы сетей, освещения, вентиляции, заземления', did: 'Взяли трассы, отметки и узлы для модели' },
  { f: `${S}/ФР/3069-ЭС.ВР.dwg`, name: 'Ведомость объёмов работ (ВР)', what: 'AutoCAD: 66 строк — что и сколько монтировать, кто выполняет', did: 'Объёмы перенесли в карточки работ. Нашли расхождение по трубе ПНД' },
  { f: `${S}/ФР/ОЛ/3069-ЭС.ОЛ1/3069-ЭС.ОЛ1.pdf`, name: 'Опросный лист ОЛ1 — ВРУ с АВР', what: 'Требования к главному щиту: 2 ввода по 63 А, АВР, IP41, сейсмика 8+', did: 'Щит показан в модели, требования — в карточке' },
  { f: `${S}/ФР/ОЛ/3069-ЭС.ОЛ1/3069-ЭС.ВРУ с АВР.pdf`, name: 'Схема ВРУ с АВР', what: 'Однолинейная схема щита к ОЛ1', did: 'Для заказа щита у завода' },
  { f: `${S}/ФР/ОЛ/3069-ЭС.ОЛ2/3069-ЭС.ОЛ2.pdf`, name: 'Опросный лист ОЛ2 — щит ШР', what: 'Щит розеток и обогревателей: 50 А, IP41', did: 'Щит показан в модели' },
  { f: `${S}/ФР/ОЛ/3069-ЭС.ОЛ2/3069-ЭС.ШР.pdf`, name: 'Схема щита ШР', what: 'Однолинейная схема к ОЛ2', did: 'Для заказа щита' },
  { f: `${S}/ФР/ОЛ/3069-ЭС.ОЛ3/3069-ЭС.ОЛ3.pdf`, name: 'Опросный лист ОЛ3 — щит ШО', what: 'Щит освещения: 10 А, IP41', did: 'Щит показан в модели' },
  { f: `${S}/ФР/ОЛ/3069-ЭС.ОЛ3/3069-ЭС.ШО.pdf`, name: 'Схема щита ШО', what: 'Однолинейная схема к ОЛ3', did: 'Для заказа щита' },
  { f: `${S}/ФР/3069-ЭС_Обложка.doc`, name: 'Обложка проекта', what: 'Титульный лист (Word)', did: '—' }
];
const OTHER = [`${S}/ФР/ОЛ/3069-ЭС.ОЛ1/3069-ЭС.ОЛ1.docx`, `${S}/ФР/ОЛ/3069-ЭС.ОЛ2/3069-ЭС.ОЛ2.docx`, `${S}/ФР/ОЛ/3069-ЭС.ОЛ3/3069-ЭС.ОЛ3.docx`,
  `${S}/ФР/ОЛ/3069-ЭС.ОЛ1/3069-ЭС.ВРУ с АВР.dwg`, `${S}/ФР/ОЛ/3069-ЭС.ОЛ2/3069-ЭС.ШР.dwg`, `${S}/ФР/ОЛ/3069-ЭС.ОЛ3/3069-ЭС.ШО.dwg`];
for (const d of DOCS) if (!fs.existsSync(path.join(ROOT, d.f))) throw new Error('нет файла ' + d.f);
const ext = f => path.extname(f).slice(1).toUpperCase();
const openLabel = f => ({ PDF: 'Открыть', XLSX: 'Открыть в Excel', DWG: 'Открыть в AutoCAD', DOC: 'Открыть в Word', DOCX: 'Открыть в Word' }[ext(f)] || 'Открыть');

const docRows = DOCS.map(d => `
      <tr>
        <td class="ok" aria-label="получено">✓</td>
        <td><b>${esc(d.name)}</b><div class="mut">${esc(d.what)}</div></td>
        <td class="did">${esc(d.did)}</td>
        <td class="act"><span class="ext">${ext(d.f)} · ${size(d.f)}</span>${btn(d.f, openLabel(d.f), 'sm')}</td>
      </tr>`).join('');

const STATUS = [
  [1, '30.09', 'Отправлено письмо «Состав и порядок работ» — Ибраков М.М., Алиев Т.А.'],
  [1, '01.10', 'Проект 3069-ЭС разобран полностью: 19 файлов, 36 листов'],
  [1, '01.10', 'Сделаны 3D-модель, видео и два PDF'],
  [1, '01.10', 'Отправлено письмо с 3D-моделью и полным пояснением — Ибраков М.М., Алиев Т.А.'],
  [0, '', 'Отправить письмо с видео и двумя PDF (черновик в почте, файлы прикрепить)'],
  [0, '', 'Получить ответы заказчика на 6 вопросов'],
  [0, '', 'Согласовать крепёж (*) и получить раздел 3069-АС'],
  [0, '', 'Начать работы']
];

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сулак 3069-ЭС — папка проекта</title>
<style>
:root{--bg:#f2f4f3;--paper:#fff;--ink:#18211f;--muted:#5a6561;--line:#dce1de;--blue:#0e5a8a;--blue-bg:#e4eef6;--green:#1d7a41;--green-bg:#e5f4ea;--amber:#9a5b00;--amber-bg:#fdf1dc}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Segoe UI",Roboto,Arial,sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:28px 16px 64px;display:grid;gap:26px}
.eyebrow{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);font-weight:700}
h1{font-size:clamp(28px,4.4vw,40px);line-height:1.12;margin:6px 0 8px}
h2{font-size:23px;margin:0 0 4px;display:flex;gap:12px;align-items:center}
h2 .step{flex:none;width:34px;height:34px;border-radius:9px;background:var(--blue);color:#fff;display:grid;place-items:center;font-size:17px}
.sub{color:var(--muted);margin:0 0 14px}
.lead{color:var(--muted);max-width:62ch;margin:0}
.box{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:20px 22px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px 24px;margin:14px 0 0}
.facts dt{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.facts dd{margin:2px 0 0;font-weight:600}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:720px}
th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;font-weight:600;padding:0 10px 8px;border-bottom:2px solid var(--line)}
td{padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top}
td.ok{color:var(--green);font-weight:800;font-size:20px;width:34px;text-align:center}
td.did{color:#26453a;width:30%}
td.act{width:200px;text-align:right}
.mut{color:var(--muted);font-size:14px}
.ext{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}
.btn{display:inline-block;background:var(--blue);color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:16px}
.btn:hover{filter:brightness(1.12)}
.btn:focus-visible{outline:3px solid var(--amber);outline-offset:2px}
.btn.sm{padding:6px 12px;font-size:14px}
.btn.line{background:transparent;color:var(--blue);border:1.5px solid var(--blue)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:8px}
.card .k{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.card h3{margin:0;font-size:19px}
.card p{margin:0;color:var(--muted);flex:1}
.card .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
video{width:100%;border-radius:12px;background:#0b141c;display:block;margin-top:14px}
.find{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:12px}
@media (max-width:700px){.find{grid-template-columns:1fr}}
.find div{border-radius:10px;padding:12px 14px}
.find .g{background:var(--green-bg)} .find .a{background:var(--amber-bg)}
.find b{display:block;margin-bottom:2px}
ol.q{margin:0;padding-left:24px;display:grid;gap:8px}
pre{white-space:pre-wrap;font:15.5px/1.6 "Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:12px 0 0}
.status{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.status li{display:grid;grid-template-columns:30px 70px 1fr;gap:8px;align-items:start}
.status .m{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;font-weight:800;border:2px solid var(--line);color:transparent}
.status .done .m{background:var(--green);border-color:var(--green);color:#fff}
.status .d{color:var(--muted);font-variant-numeric:tabular-nums}
.status li:not(.done) span:last-child{color:var(--muted)}
.note{background:var(--amber-bg);border-radius:10px;padding:12px 16px;font-size:15px}
footer{color:var(--muted);font-size:14px}
@media print{.btn{display:none}}
</style></head>
<body><div class="wrap">

  <header>
    <div class="eyebrow">НПС «Сулак» · проект 3069-ЭС · электроснабжение</div>
    <h1>Папка проекта</h1>
    <p class="lead">Заглублённый склад хранения материальных ценностей с резервным МДП (укрытие на 50 человек). Здесь проект, который дал заказчик, и всё, что мы по нему подготовили.</p>
    <dl class="facts">
      <div><dt>Заказчик</dt><dd>АО «Черномортранснефть»</dd></div>
      <div><dt>Генподрядчик</dt><dd>ООО «Инженерная группа специалистов»</dd></div>
      <div><dt>Исполнитель</dt><dd>ИП Ибраков К.М. («Бриллиант Энерджи»)</dd></div>
      <div><dt>Граница работ</dt><dd>На территории НПС — заказчик, за её пределами — мы</dd></div>
    </dl>
  </header>

  <section class="box">
    <h2><span class="step">1</span>Что нам дали</h2>
    <p class="sub">Рабочая документация 3069-ЭС от ПСБ АО «Черномортранснефть», 2025. Все файлы получены и разобраны. Лежат в папке «${P1}».</p>
    <div class="tw"><table>
      <thead><tr><th></th><th>Документ</th><th>Что мы из него сделали</th><th style="text-align:right">Файл</th></tr></thead>
      <tbody>${docRows}</tbody>
    </table></div>
    <p class="mut" style="margin:10px 0 0">Там же исходники опросных листов в Word и схемы щитов в AutoCAD (${OTHER.length} файлов). Файлы DWG открываются в AutoCAD или в бесплатной программе DWG TrueView.</p>
  </section>

  <section class="box">
    <h2><span class="step">2</span>Что мы нашли в проекте</h2>
    <p class="sub">Коротко, что следует из документов.</p>
    <div class="find">
      <div class="g"><b>Наш объём</b>13 видов работ: траншея, переход под дорогой, ввод в здание, щиты, кабель-канал, гофра, свет, розетки, вентиляция, заземление, генератор, пусконаладка.</div>
      <div class="g"><b>Делает заказчик</b>Всё в границах территории НПС: прокладка кабеля по территории и эстакаде, подключение в ЩСУ-2.</div>
      <div class="a"><b>Не хватает крепежа</b>В спецификации нет дюбелей для 300 скоб гофры, анкеров для щитов, крепежа кабель-канала и светильников.</div>
      <div class="a"><b>Не сходятся цифры</b>Труба ПНД Ø50: 15 м и 30 м в разных документах. Гофра: 150 м против около 186 м. Тип обогревателей.</div>
    </div>
  </section>

  <section>
    <h2><span class="step">3</span>Что мы сделали</h2>
    <p class="sub">Все файлы — в папке «${P2}».</p>
    <div class="cards">
      <div class="card"><span class="k">3D-модель · ${size(`${P2}/${ours.model[1]}`)}</span><h3>Интерактивная модель</h3>
        <p>Модель можно крутить мышью. Слева список работ: нажмите на работу, и откроется, что делаем и чем крепим.</p>
        <div class="row">${btn(`${P2}/${ours.model[1]}`, 'Открыть модель')}</div></div>
      <div class="card"><span class="k">PDF · 15 страниц · ${size(`${P2}/${ours.works[1]}`)}</span><h3>Виды работ</h3>
        <p>13 работ, по одной на странице: картинка, что делаем, чем крепим, норма.</p>
        <div class="row">${btn(`${P2}/${ours.works[1]}`, 'Открыть PDF')}</div></div>
      <div class="card"><span class="k">PDF · 12 страниц · ${size(`${P2}/${ours.full[1]}`)}</span><h3>Полное пояснение</h3>
        <p>Таблица всех 27 видов работ: объёмы, позиции спецификации, нормативы, лист согласования.</p>
        <div class="row">${btn(`${P2}/${ours.full[1]}`, 'Открыть PDF')}</div></div>
      <div class="card"><span class="k">Видео MP4 · 1,5 мин · ${size(`${P2}/${ours.video[1]}`)}</span><h3>Облёт объекта</h3>
        <p>Камера проходит по всем работам, внизу короткие подписи. Видео ниже на этой странице.</p>
        <div class="row">${btn(`${P2}/${ours.video[1]}`, 'Открыть видео', 'line')}</div></div>
    </div>
    <video controls preload="metadata" src="${href(`${P2}/${ours.video[1]}`)}"></video>
  </section>

  <section class="box">
    <h2><span class="step">4</span>Вопросы к заказчику</h2>
    <p class="sub">Нужны ответы до начала работ.</p>
    <ol class="q">
      <li>Крепёж в проекте не заложен: дюбели для 300 скоб гофры, анкеры для щитов. Согласуете наш вариант (*)?</li>
      <li>Обогреватели: на плане инфракрасные, в спецификации электроконвекторы 1,5 кВт. Какие ставить?</li>
      <li>Раздел 3069-АС (крепление вентиляторов) в комплекте отсутствует. Просим выдать.</li>
      <li>Труба ПНД Ø50: в спецификации 15 м, в ведомости объёмов 30 м. Какой объём верный?</li>
      <li>Гофра ПВХ Ø25: заложено 150 м, по ведомости кабеля в гофре около 186 м.</li>
      <li>В спецификации ошибки: масса светильника поз. 18, количество мастики поз. 42, масса круга поз. 54.</li>
    </ol>
  </section>

  <section class="box">
    <h2><span class="step">5</span>Сопроводительное письмо</h2>
    <p class="sub">Кому: Ибраков Мурад Магомедович, Алиев Тушахан Асадович (АО «Черномортранснефть»). Вложения: видео, PDF «Виды работ», PDF «Пояснение».</p>
    <div class="row">${btn(`${P3}/Письмо_заказчику.txt`, 'Открыть текст письма', 'line sm')}</div>
<pre>${esc(LETTER)}</pre>
  </section>

  <section class="box">
    <h2><span class="step">6</span>Где мы сейчас</h2>
    <p class="sub">Состояние на ${new Date().toLocaleDateString('ru-RU')}.</p>
    <ul class="status">${STATUS.map(([d, dt, t]) => `<li class="${d ? 'done' : ''}"><span class="m">✓</span><span class="d">${dt}</span><span>${esc(t)}</span></li>`).join('')}</ul>
  </section>

  <p class="note"><b>Важно.</b> Документация 3069-ЭС помечена грифом «Коммерческая тайна». Папку не передавайте посторонним.</p>
  <footer>ИП Ибраков Камиль Мурадович · +7 960 911-19-98 · kamilibrakov33@gmail.com</footer>
</div></body></html>`;
fs.writeFileSync(path.join(ROOT, 'ОТКРЫТЬ.html'), html);
console.log(ROOT);
