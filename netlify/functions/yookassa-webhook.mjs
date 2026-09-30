// Приём HTTP-уведомлений от ЮKassa.
// Адрес для настройки в ЮKassa: https://brilliant-enerji.netlify.app/.netlify/functions/yookassa-webhook
// Событие: payment.succeeded. Платёж перепроверяем запросом к API, телу уведомления не доверяем.
import { TARIFFS } from './create-payment.mjs';

const CHAT = process.env.TELEGRAM_LEADS_CHAT_ID || '-1004458487275';

const esc = (s) => String(s || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function paidText(p) {
  const m = p.metadata || {};
  const t = TARIFFS[m.tariff]?.title || m.tariff;
  return [
    `💰 <b>ОПЛАТА НА САЙТЕ${p.test ? ' (ТЕСТ)' : ''}</b>`,
    `Тариф: «${esc(t)}» — ${esc(p.amount?.value)} ₽`,
    `Имя: ${esc(m.name)}`,
    `Телефон: ${esc(m.phone)}`,
    `Telegram: ${esc(m.telegram)}`,
    `Email: ${esc(m.email)}`,
    `Платёж ЮKassa: ${esc(p.id)}`,
    '',
    'Покупатель напишет боту «Оплатил на сайте». Выдать курс, для «Мастера» и «Практика» — материалы из папки «КУРС — ВСЁ ЗДЕСЬ».'
  ].join('\n');
}

export default async (req) => {
  const { YOOKASSA_SHOP_ID: shop, YOOKASSA_SECRET_KEY: key, TELEGRAM_BOT_TOKEN: bot } = process.env;
  let event;
  try { event = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  if (event?.event !== 'payment.succeeded' || !event.object?.id) return new Response('skip');
  if (!shop || !key || !bot) { console.error('Нет ключей'); return new Response('not configured', { status: 500 }); }

  const res = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(event.object.id)}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${shop}:${key}`).toString('base64') }
  });
  const payment = await res.json();
  if (!res.ok || payment.status !== 'succeeded') {
    console.error('Платёж не подтверждён', res.status, payment.status);
    return new Response('not succeeded');
  }

  const tg = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text: paidText(payment), parse_mode: 'HTML' })
  });
  if (!(await tg.json()).ok) console.error('Telegram не принял сообщение');
  return new Response('ok');
};
