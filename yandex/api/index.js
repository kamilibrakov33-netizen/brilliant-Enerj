// Точка входа Yandex Cloud Functions (CommonJS). Логика — в app.mjs.
module.exports.handler = async (event, context) => {
  const { route } = await import('./app.mjs');
  return route(event, context);
};
