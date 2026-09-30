// Создаёт платёж в ЮKassa и возвращает ссылку на страницу оплаты.
// Нужны переменные окружения: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY.
// YOOKASSA_RECEIPT=1 — передавать данные для чека (если в ЮKassa подключены «Чеки от ЮKassa»).
import { randomUUID } from 'node:crypto';

export const TARIFFS = {
  start: { title: 'Старт', price: '990.00' },
  master: { title: 'Мастер', price: '2990.00' },
  praktik: { title: 'Практик', price: '9900.00' }
};

const SITE = process.env.URL || 'https://brilliant-enerji.netlify.app';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (s, max = 100) => String(s || '').trim().slice(0, max);

export function buildPayment(input) {
  const tariff = TARIFFS[input.tariff];
  if (!tariff) throw new Error('Неизвестный тариф');
  const name = clean(input.name);
  const phone = clean(input.phone, 30);
  if (!name || phone.replace(/\D/g, '').length < 10) throw new Error('Укажите имя и телефон');
  const email = clean(input.email, 100);
  const description = `Курс «Электромонтаж с нуля», тариф «${tariff.title}»`;

  const payment = {
    amount: { value: tariff.price, currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: `${SITE}/spasibo.html` },
    description,
    metadata: {
      tariff: input.tariff,
      name,
      phone,
      telegram: clean(input.telegram, 60),
      email
    }
  };

  if (process.env.YOOKASSA_RECEIPT === '1') {
    const customer = email.includes('@') ? { email } : { phone: '+' + phone.replace(/\D/g, '').replace(/^8/, '7') };
    payment.receipt = {
      customer,
      items: [{
        description: description.slice(0, 128),
        quantity: '1.00',
        amount: { value: tariff.price, currency: 'RUB' },
        vat_code: 1,
        payment_subject: 'service',
        payment_mode: 'full_payment'
      }]
    };
  }
  return payment;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Только POST' });
  const { YOOKASSA_SHOP_ID: shop, YOOKASSA_SECRET_KEY: key } = process.env;
  if (!shop || !key) return json(500, { error: 'Оплата ещё не настроена' });

  let payment;
  try {
    const input = await req.json();
    if (!input.consent) return json(400, { error: 'Нужно согласие с офертой' });
    payment = buildPayment(input);
  } catch (e) {
    return json(400, { error: e.message });
  }

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${shop}:${key}`).toString('base64'),
      'Idempotence-Key': randomUUID(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payment)
  });
  const data = await res.json();
  if (!res.ok || !data.confirmation?.confirmation_url) {
    console.error('ЮKassa:', res.status, JSON.stringify(data));
    return json(502, { error: 'ЮKassa не приняла платёж' });
  }
  return json(200, { url: data.confirmation.confirmation_url });
};
