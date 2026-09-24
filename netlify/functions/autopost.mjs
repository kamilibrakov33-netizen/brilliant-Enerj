// Автопостинг в Telegram-канал по расписанию из data/posts.mjs.
// Запускается 4 раза в день: 9:00, 13:00, 17:00, 20:00 по Москве (UTC+3).
import posts from '../../data/posts.mjs';

const CHANNEL = process.env.TELEGRAM_CHANNEL || '@brilliant_energy';
const BOT = 'brilliant_energy_post_bot';
const PHONE = '+7 960 911-19-98';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function moscowNow() {
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

export function caption(post) {
  const link = post.start ? `t.me/${BOT}?start=${post.start}` : `t.me/${BOT}`;
  return `<b>${esc(post.title)}</b>\n\n${esc(post.text)}\n\n⚡ Заказать или спросить — ${link}\n📞 ${PHONE}`;
}

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json;
}

export default async () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN не задан');
    return;
  }
  const now = moscowNow();
  const post = posts.find((p) => p.date === now.date && Number(p.time.slice(0, 2)) === now.hour);
  if (!post) {
    console.log(`Нет поста на ${now.date} ${now.hour}:00`);
    return;
  }
  const text = caption(post);
  try {
    await tg('sendPhoto', { chat_id: CHANNEL, photo: post.photo, caption: text, parse_mode: 'HTML' });
  } catch (e) {
    // Если фото не загрузилось — публикуем текстом, чтобы слот не пропал
    console.error(e.message);
    await tg('sendMessage', { chat_id: CHANNEL, text, parse_mode: 'HTML', disable_web_page_preview: true });
  }
  console.log(`Опубликовано: ${post.date} ${post.time} — ${post.title}`);
};

export const config = { schedule: '0 6,10,14,17 * * *' };
