// Netlify вызывает эту функцию сам после каждой заявки с формы сайта.
// Заявка уходит в Telegram-группу мастеров.

const CHAT = process.env.TELEGRAM_LEADS_CHAT_ID || '-1004458487275';

const ICONS = {
  'Частное лицо': '🏠',
  'Организация / госучреждение': '🏛',
  'Генподрядчик / субподряд': '🏗',
  'Хочу на курс': '🎓',
  'Я мастер': '🔧'
};

const esc = (s) => String(s || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function leadText(d) {
  const role = d.role || 'Частное лицо';
  return [
    `${ICONS[role] || '📩'} <b>НОВАЯ ЗАЯВКА С САЙТА</b>`,
    `Кто: ${esc(role)}`,
    `Имя: ${esc(d.name)}`,
    `Телефон: ${esc(d.phone)}`,
    `Город: ${esc(d.city)}`,
    `Сообщение: ${esc(d.message)}`
  ].join('\n');
}

export default async (req) => {
  const { payload } = await req.json();
  if (payload.form_name !== 'zayavka') return new Response('skip');
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN не задан');
    return new Response('no token', { status: 500 });
  }
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text: leadText(payload.data), parse_mode: 'HTML' })
  });
  const json = await res.json();
  if (!json.ok) {
    console.error(json.description);
    return new Response(json.description, { status: 502 });
  }
  return new Response('ok');
};
