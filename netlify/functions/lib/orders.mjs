// Хранилище заказов (Netlify Blobs). Только служебные номера, без персональных данных:
//   order:<номер заказа> → номер платежа ЮKassa
//   claim:<номер платежа> → Telegram chat id, которому выдан курс (один платёж — один аккаунт)
import { getStore } from '@netlify/blobs';

const store = () => getStore({ name: 'orders', consistency: 'strong' });

export const saveOrder = (order, paymentId) => store().set(`order:${order}`, paymentId);
export const paymentOf = (order) => store().get(`order:${order}`);
export const claimOf = (paymentId) => store().get(`claim:${paymentId}`);
export const setClaim = (paymentId, chatId) => store().set(`claim:${paymentId}`, String(chatId));
