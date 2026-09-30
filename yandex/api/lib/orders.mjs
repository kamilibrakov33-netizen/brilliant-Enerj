// Та же схема заказов, что на Netlify (netlify/functions/lib/orders.mjs), но в Object Storage в РФ.
// Токен сервисного аккаунта берётся из сервиса метаданных функции.
const BUCKET = process.env.DATA_BUCKET;

async function token() {
  const r = await fetch('http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } });
  return (await r.json()).access_token;
}
async function put(key, value) {
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, { method: 'PUT', headers: { 'X-YaCloud-SubjectToken': await token() }, body: value });
  if (!r.ok) throw new Error(`Object Storage ${r.status}`);
}
async function get(key) {
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, { headers: { 'X-YaCloud-SubjectToken': await token() } });
  return r.ok ? r.text() : null;
}

export const saveOrder = (order, paymentId) => put(`system/order-${order}`, paymentId);
export const paymentOf = (order) => get(`system/order-${order}`);
export const claimOf = (paymentId) => get(`system/claim-${paymentId}`);
export const setClaim = (paymentId, chatId) => put(`system/claim-${paymentId}`, String(chatId));
