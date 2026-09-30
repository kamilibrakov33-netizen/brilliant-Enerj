// Автовыдача курса. Покупатель после оплаты жмёт «Открыть курс» → бот получает /start o_<заказ>
// → сценарий Make вызывает эту функцию: GET /.netlify/functions/claim-course?o=<заказ>&chat=<chat id>&k=<CLAIM_KEY>
// Функция сама проверяет платёж в ЮKassa (оплачен, не возвращён), привязывает его к одному
// Telegram-аккаунту и присылает первый урок. В группу мастеров уходит отчёт.
import { TARIFFS } from './create-payment.mjs';
import { paymentOf, claimOf, setClaim } from './lib/orders.mjs';

const GROUP = process.env.TELEGRAM_LEADS_CHAT_ID || '-1004458487275';
const esc = (s) => String(s || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await res.json();
  if (!j.ok) console.error('Telegram', method, j.description);
  return j;
}

const START = { inline_keyboard: [[{ text: '▶️ Начать обучение', callback_data: 'ex_0_ok' }]] };
const HELP = '\n\nЕсли это ошибка — напишите сюда, в бот, или позвоните +7 960 911-19-98.';

export function isPaid(p) {
  if (!p || p.status !== 'succeeded' || !p.paid) return false;
  const refunded = Number(p.refunded_amount?.value || 0);
  return refunded < Number(p.amount?.value || 0);
}

export default async (req) => {
  const u = new URL(req.url);
  const order = (u.searchParams.get('o') || '').replace(/[^a-f0-9]/g, '');
  const chat = (u.searchParams.get('chat') || '').replace(/[^0-9-]/g, '');
  const { CLAIM_KEY, YOOKASSA_SHOP_ID: shop, YOOKASSA_SECRET_KEY: key } = process.env;
  if (!CLAIM_KEY || u.searchParams.get('k') !== CLAIM_KEY) return new Response('forbidden', { status: 403 });
  if (!order || !chat) return new Response('bad request', { status: 400 });

  const pid = await paymentOf(order);
  if (!pid) {
    await tg('sendMessage', { chat_id: chat, text: 'Не нашёл такой заказ. Проверьте, что оплата прошла.' + HELP });
    return new Response('no order');
  }

  const res = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(pid)}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${shop}:${key}`).toString('base64') }
  });
  const p = await res.json();
  if (!res.ok || !isPaid(p)) {
    const text = p.status === 'pending'
      ? 'Оплата ещё не завершена. Как только банк подтвердит — нажмите «Открыть курс» ещё раз.'
      : 'Оплата по этому заказу не найдена или была возвращена.';
    await tg('sendMessage', { chat_id: chat, text: text + HELP });
    return new Response('not paid');
  }

  const owner = await claimOf(pid);
  if (owner && owner !== chat) {
    await tg('sendMessage', { chat_id: chat, text: 'Этот заказ уже активирован в другом Telegram-аккаунте.' + HELP });
    await tg('sendMessage', { chat_id: GROUP, text: `⚠️ Повторная попытка активировать платёж ${pid} с другого аккаунта (${chat}).` });
    return new Response('taken');
  }

  const m = p.metadata || {};
  const tariff = TARIFFS[m.tariff]?.title || m.tariff || '';
  if (!owner) await setClaim(pid, chat);

  await tg('sendMessage', {
    chat_id: chat,
    text: `✅ Оплата подтверждена${tariff ? `, тариф «${tariff}»` : ''}. Добро пожаловать в Brilliant Energy!\n\n` +
      'Курс «Электромонтаж с нуля» проходит здесь, в Telegram: урок → короткий экзамен → следующий урок. Всего 49 уроков.\n\n' +
      'Когда будете готовы — нажмите кнопку. Первый урок придёт сразу.',
    reply_markup: START
  });
  if (!owner) {
    const extra = m.tariff === 'start' ? '' : '\nДля этого тарифа отправьте материалы из папки «КУРС — ВСЁ ЗДЕСЬ» (шаблоны, практика, разбор).';
    await tg('sendMessage', {
      chat_id: GROUP,
      parse_mode: 'HTML',
      text: `🎓 <b>КУРС ВЫДАН АВТОМАТИЧЕСКИ${p.test ? ' (ТЕСТ)' : ''}</b>\nТариф: «${esc(tariff)}» — ${esc(p.amount?.value)} ₽\nИмя: ${esc(m.name)}\nТелефон: ${esc(m.phone)}\nTelegram: ${esc(m.telegram)}\nЧат: ${esc(chat)}${extra}`
    });
  }
  return new Response('ok');
};
