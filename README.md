# Brilliant Energy — сайт

Одностраничный сайт компании Brilliant Energy: электромонтаж и школа электриков.

## Разделы

- **Заказчикам** — вкладки: частные лица / организации и госучреждения / генподрядчики (субподряд)
- **Щиты под ключ** — пакеты «Квартира», «Дом», «Объект»
- **Обучение** — курс «Электромонтаж с нуля», 990 ₽, 12 модулей, 46 уроков, формат в Telegram (урок → экзамен → следующий урок), три уровня допуска
- **Мастерам** — подключение к заявкам через Telegram-бота
- **Заявка** — одна форма для всех, тип заявителя выбирается кнопкой
- **Вопросы**, контакты и реквизиты, политика конфиденциальности

## Файлы

```
index.html        главная страница
privacy.html      политика обработки персональных данных (152-ФЗ)
assets/style.css  стили
assets/main.js    меню, вкладки, отправка формы
assets/logo.svg   временный логотип — заменить на настоящий
netlify.toml      настройки Netlify
netlify/functions/submission-created.mjs  заявка с сайта → Telegram-группа мастеров
netlify/functions/autopost.mjs            автопостинг в канал @brilliant_energy (9:00, 13:00, 17:00, 20:00 МСК)
data/posts.mjs    очередь постов: дата, время, рубрика, заголовок, текст, фото
```

## Публикация на Netlify

1. Netlify → сайт `brilliant-enerji` → Site configuration → Build & deploy → Link repository → выбрать этот репозиторий и ветку.
2. Build command — пусто, Publish directory — `.`
3. Site configuration → Environment variables → добавить `TELEGRAM_BOT_TOKEN` — токен бота @brilliant_energy_post_bot (из @BotFather → /mybots → API Token). Без него автопостинг и отправка заявок в Telegram не работают.
4. Forms → включить Form detection. Заявки видны в Netlify → Forms → `zayavka` и сразу приходят в группу мастеров.

Необязательные переменные: `TELEGRAM_CHANNEL` (по умолчанию `@brilliant_energy`), `TELEGRAM_LEADS_CHAT_ID` (по умолчанию группа мастеров `-1004458487275`).

## Автопостинг

Функция `autopost` запускается 4 раза в день и публикует пост, у которого `date` и `time` совпадают с текущими по Москве. Сценарий автопостинга в Make больше не нужен — он не занимает лимит бесплатного тарифа.

Чтобы добавить посты — допишите их в конец `data/posts.mjs` с новыми датами. Сейчас очередь расписана до 12.10.2026.

## Что заменить

- **Логотип:** положить файл в `assets/` и поправить ссылки на `assets/logo.svg`.
- **Фото:** сейчас стоковые фото с Pexels (бесплатная лицензия). На сайте они не подписаны как «наши объекты». Когда появятся свои снимки с объектов, заменить адреса в `style="--img:url(...)"` в `index.html`.

## Оплата через ЮKassa

Страницы для проверки ЮKassa («витрина»): `oferta.html` (оферта), `oplata.html` (оплата, получение, возврат), `kupit.html` (покупка тарифа), `spasibo.html` (после оплаты). Кнопки «Купить» — в блоке тарифов на главной.

Функции:
- `netlify/functions/create-payment.mjs` — создаёт платёж, цена берётся на сервере по тарифу;
- `netlify/functions/yookassa-webhook.mjs` — принимает уведомление `payment.succeeded`, перепроверяет платёж через API и пишет в группу мастеров.

Переменные окружения в Netlify: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `YOOKASSA_RECEIPT=1` — чеки 54-ФЗ через «Чеки от ЮKassa» (подключены, боевой магазин).

В ЮKassa → Интеграция → HTTP-уведомления: адрес `https://brilliant-enerji.netlify.app/.netlify/functions/yookassa-webhook`, событие `payment.succeeded`.

## Яндекс Облако (переезд, 152-ФЗ)

Папка `yandex/` — тот же сайт и та же оплата, но в России (ru-central1):
- сайт лежит в приватном бакете Object Storage и отдаётся через API Gateway (`yandex/gateway.yaml`);
- функция `yandex/api` принимает `/api/lead`, `/api/pay`, `/api/yookassa`. Каждая заявка, заказ и оплата сначала пишется JSON-файлом в бакет данных `brilliant-data-…`, потом уходит в Telegram;
- обработчики оплаты общие с Netlify (`netlify/functions/*.mjs`), `deploy.sh` копирует их в функцию.

Развернуть: `yc` CLI под сервисным аккаунтом, затем
`FOLDER_ID=… TELEGRAM_BOT_TOKEN=… YOOKASSA_SHOP_ID=… YOOKASSA_SECRET_KEY=… yandex/deploy.sh`.
Скрипт выводит адрес сайта и адрес для HTTP-уведомлений ЮKassa. Формы на сайте сами выбирают адрес API: на `*.netlify.app` — Netlify, на любом другом домене — `/api/*`.

## Региональные представители

Страницы: `predstavitel.html` (программа, заработок, заявка, таймер до 15.10.2026 23:59 МСК), `oferta-predstaviteley.html` (договор-оферта). Заявка уходит той же формой `zayavka` с ролью «Региональный представитель» в группу мастеров.

Реферальные ссылки: `kupit.html?t=start&ref=КОД`. Код запоминается на 60 дней (`assets/ref.js`), передаётся в ЮKassa в `metadata.ref` и печатается в уведомлениях об оплате и выдаче курса. Коды выдаём вручную, формат `ГОРОД-ФАМИЛИЯ` (латиница, цифры, `-`, `_`, до 40 символов).

Конец акции — константа `END` в `predstavitel.html` и даты в `oferta-predstaviteley.html` (раздел 1.5, п. 3.4). Рассылка и чек-листы: `docs/predstaviteli.md`.
