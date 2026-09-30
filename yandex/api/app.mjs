// API сайта в Яндекс Облаке. Вызывается через API Gateway:
//   POST /api/lead            — заявка с формы сайта
//   POST /api/pay             — создать платёж ЮKassa
//   POST /api/yookassa        — уведомление ЮKassa об оплате
//   GET  /api/claim?o=&chat=&k= — автовыдача курса (вызывает бот)
// Каждая заявка и оплата СНАЧАЛА записывается в Object Storage (Россия, ru-central1),
// и только потом уходит в Telegram — так требует ч. 5 ст. 18 152-ФЗ.
// Обработчики create-payment и yookassa-webhook — те же файлы, что на Netlify
// (deploy.sh копирует их сюда), чтобы логика оплаты была одна.
import { randomUUID } from 'node:crypto';
import createPayment from './create-payment.mjs';
import yookassaWebhook from './yookassa-webhook.mjs';
import { leadText } from './submission-created.mjs';
import claimCourse from './claim-course.mjs';

const BUCKET = process.env.DATA_BUCKET;
const CHAT = process.env.TELEGRAM_LEADS_CHAT_ID || '-1004458487275';

const reply = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

function rawBody(event) {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

// Запись JSON в приватный бакет. Токен сервисного аккаунта функции приходит в context.token.
export async function save(context, folder, data) {
  const token = context?.token?.access_token;
  if (!BUCKET || !token) throw new Error('Хранилище не настроено');
  const day = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const key = `${folder}/${day}/${Date.now()}-${randomUUID().slice(0, 8)}.json`;
  const res = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, {
    method: 'PUT',
    headers: { 'X-YaCloud-SubjectToken': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, saved_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(`Object Storage ${res.status}`);
  return key;
}

async function lead(event, context) {
  const body = rawBody(event);
  const type = (event.headers?.['Content-Type'] || event.headers?.['content-type'] || '');
  const d = type.includes('json') ? JSON.parse(body || '{}') : Object.fromEntries(new URLSearchParams(body));
  if (d['bot-field']) return reply(200, { ok: true });
  const clean = (s, n = 500) => String(s || '').trim().slice(0, n);
  const data = {
    role: clean(d.role, 60), name: clean(d.name, 100), phone: clean(d.phone, 30),
    city: clean(d.city, 100), message: clean(d.message, 2000), consent: Boolean(d.consent)
  };
  if (!data.name || data.phone.replace(/\D/g, '').length < 10) return reply(400, { error: 'Укажите имя и телефон' });
  if (!data.consent) return reply(400, { error: 'Нужно согласие на обработку данных' });
  await save(context, 'leads', data);
  const tg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text: leadText(data), parse_mode: 'HTML' })
  });
  if (!(await tg.json()).ok) console.error('Telegram не принял заявку');
  return reply(200, { ok: true });
}

// Вызов обработчика в формате Netlify (Web Request → Response) из события API Gateway.
async function viaWeb(handler, event) {
  const req = new Request('https://local/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody(event)
  });
  const res = await handler(req);
  return { statusCode: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || 'text/plain' }, body: await res.text() };
}

export async function route(event, context) {
  const action = event.params?.action || event.pathParams?.action || String(event.path || '').split('/').pop();
  try {
    if (action === 'claim' && event.httpMethod === 'GET') {
      const qs = new URLSearchParams(event.queryStringParameters || {}).toString();
      const res = await claimCourse(new Request(`https://local/?${qs}`));
      return { statusCode: res.status, body: await res.text() };
    }
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Только POST' });
    if (action === 'lead') return await lead(event, context);
    if (action === 'pay') {
      const input = JSON.parse(rawBody(event) || '{}');
      if (input.consent) {
        const { name, phone, telegram, email, tariff } = input;
        await save(context, 'orders', { tariff, name, phone, telegram, email });
      }
      return await viaWeb(createPayment, event);
    }
    if (action === 'yookassa') {
      const ev = JSON.parse(rawBody(event) || '{}');
      if (ev.event === 'payment.succeeded' && ev.object?.id) await save(context, 'payments', { event: ev.event, id: ev.object.id, metadata: ev.object.metadata || {} });
      return await viaWeb(yookassaWebhook, event);
    }
    return reply(404, { error: 'Нет такого адреса' });
  } catch (e) {
    console.error(action, e.message);
    return reply(500, { error: 'Ошибка сервера' });
  }
}
