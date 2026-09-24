(function () {
  // Мобильное меню
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  // Вкладки «Заказчикам»
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { e.preventDefault(); selectTab(next); next.focus(); }
    });
  });

  // Форма заявки
  var form = document.getElementById('form');
  var status = document.getElementById('form-status');
  var message = document.getElementById('message');
  var msgLabel = document.getElementById('msg-label');
  var labels = {
    'Частное лицо': ['Что нужно сделать', 'Например: квартира 2 комнаты, новая проводка и щит'],
    'Организация / госучреждение': ['Объект и объём работ', 'Название организации, тип объекта, что нужно сделать, сроки'],
    'Генподрядчик / субподряд': ['Объект, объём, сроки', 'Город, объект, объём электромонтажа, дата выхода бригады'],
    'Хочу на курс': ['Вопрос по курсу (необязательно)', 'Есть ли опыт, что хотите узнать'],
    'Я мастер': ['Опыт и виды работ', 'Сколько лет в электрике, что делаете, есть ли инструмент и транспорт']
  };
  function syncRole() {
    var checked = form.querySelector('input[name=role]:checked');
    var l = labels[checked.value];
    msgLabel.textContent = l[0];
    message.placeholder = l[1];
  }
  form.addEventListener('change', function (e) {
    if (e.target.name === 'role') syncRole();
  });
  syncRole();

  // Кнопки «Оставить заявку» заранее выбирают тип заказчика
  document.querySelectorAll('[data-role]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var radio = form.querySelector('input[name=role][value="' + btn.dataset.role + '"]');
      if (radio) { radio.checked = true; syncRole(); }
      if (btn.dataset.topic && !message.value) message.value = btn.dataset.topic + ': ';
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var button = form.querySelector('button[type=submit]');
    button.disabled = true;
    status.className = 'form__status';
    status.textContent = 'Отправляем…';
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      form.reset();
      syncRole();
      status.className = 'form__status ok';
      status.textContent = 'Заявка отправлена. Свяжемся с вами в течение дня.';
    }).catch(function () {
      status.className = 'form__status err';
      status.innerHTML = 'Не получилось отправить. Позвоните <a href="tel:+79609111998">+7 960 911-19-98</a> или напишите в <a href="https://t.me/brilliant_energy_post_bot" target="_blank" rel="noopener">Telegram</a>.';
    }).then(function () {
      button.disabled = false;
    });
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
