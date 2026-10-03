// Цены: берём из prices.js и раскладываем по спискам
const prices = window.PRICES || {};

document.querySelectorAll('[data-price="hero"]').forEach(el => {
  el.textContent = prices.hero || '';
});

document.querySelectorAll('[data-prices]').forEach(list => {
  (prices[list.dataset.prices] || []).forEach(item => {
    const li = document.createElement('li');
    const h = document.createElement('h4');
    h.textContent = item.name;
    const p = document.createElement('p');
    p.textContent = item.desc;
    const price = document.createElement('div');
    price.className = 'price';
    price.innerHTML = '<b></b><span></span>';
    price.querySelector('b').textContent = item.price;
    price.querySelector('span').textContent = item.term;
    li.append(h, p, price);
    list.append(li);
  });
});

// Окно браузера на первом экране: вкладки переключают работы
const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
const shot = document.querySelector('.browser-view img');
const addr = document.querySelector('.addr');
const cap = document.querySelector('.browser-cap');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Подгружаем картинки заранее, чтобы вкладки переключались без пустого кадра
tabs.forEach(t => { new Image().src = t.dataset.src; });

function selectTab(tab) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
  });
  addr.textContent = tab.dataset.addr;
  cap.textContent = tab.dataset.cap;
  const swap = () => {
    shot.src = tab.dataset.src;
    shot.alt = 'Первый экран сайта: ' + tab.textContent;
    shot.classList.remove('is-swapping');
  };
  if (reduce) return swap();
  shot.classList.add('is-swapping');
  setTimeout(swap, 200);
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.focus();
    selectTab(next);
  });
});

// Форма заявки: отправка в n8n (сценарий «MaksX - заявки с сайта» → уведомление в Telegram)
const WEBHOOK_URL = 'https://n8n.maksx.ru/webhook/maksx-lead';
const TELEGRAM = 'https://t.me/MaxSmoll';

const form = document.getElementById('lead-form');
const status = form.querySelector('.form-status');

form.addEventListener('submit', async e => {
  e.preventDefault();

  const required = [...form.querySelectorAll('[required]')];
  let firstBad = null;
  required.forEach(input => {
    const bad = input.type === 'checkbox' ? !input.checked : !input.value.trim();
    input.setAttribute('aria-invalid', bad);
    if (input.type === 'checkbox') input.closest('label').dataset.bad = bad;
    if (bad && !firstBad) firstBad = input;
  });
  if (firstBad) {
    status.textContent = firstBad.type === 'checkbox'
      ? 'Отметьте согласие на обработку данных - без него я не могу принять заявку.'
      : 'Заполните имя и контакт - без них я не смогу ответить.';
    firstBad.focus();
    return;
  }

  const data = new FormData(form);

  // Ловушку заполнил бот: делаем вид, что всё отправлено, и ничего не шлём
  if (data.get('website')) {
    form.reset();
    status.textContent = 'Заявка отправлена. Отвечу в течение дня.';
    return;
  }

  const payload = {
    name: data.get('name').trim(),
    contact: data.get('contact').trim(),
    services: data.getAll('service'),
    budget: '',
    task: (data.get('task') || '').trim(),
    page: location.href,
    consent: new Date().toISOString() // когда человек дал согласие на обработку данных
  };

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = 'Отправляю заявку...';
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    status.textContent = 'Заявка отправлена. Отвечу в течение дня.';
  } catch {
    status.innerHTML = `Заявка не отправилась. Напишите мне в <a href="${TELEGRAM}">Telegram</a> - так даже быстрее.`;
  } finally {
    button.disabled = false;
  }
});
