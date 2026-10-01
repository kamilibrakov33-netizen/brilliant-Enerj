// Запоминает код регионального представителя из ссылки ?ref=КОД на 60 дней.
// Страница покупки передаёт код в оплату, а мы выплачиваем вознаграждение.
(function () {
  try {
    var c = new URLSearchParams(location.search).get('ref');
    if (c && /^[A-Za-z0-9_-]{1,40}$/.test(c)) localStorage.setItem('be_ref', JSON.stringify({ c: c, t: Date.now() }));
  } catch (e) {}
  window.beRef = function () {
    try {
      var o = JSON.parse(localStorage.getItem('be_ref') || 'null');
      if (o && Date.now() - o.t < 60 * 864e5) return o.c;
    } catch (e) {}
    return '';
  };
})();
