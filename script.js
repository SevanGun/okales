/* ============================================================
   ОКАЛЕС — логика лендинга сайта okales.ru
   Всё, что нужно менять при запуске, собрано в CONFIG ниже.
   ============================================================ */

const CONFIG = {
  /* Куда уходят заявки.
     Вариант А — сервис форм (Formspree, Getform, Форма Тильды и т.п.):
       впишите сюда URL, заявки будут уходить POST-запросом (JSON).
     Вариант Б — оставьте пустым: кнопка откроет Telegram
       с уже подставленным текстом заявки.                        */
  formEndpoint: '',

  /* Запасной канал, если formEndpoint пустой */
  telegram: 'okales',            // t.me/<...> без «@»
  whatsapp: '79165936232',        // только цифры

  /* Прайс. Всё в рублях. */
  prices: {
    base: 100000,                 // базовая модель 2100×1000, массив дуба
    finish: { oak: 0, wenge: 0, gold: 0 },
    options: {
      led:     12000,
      engrave:  6000,
      custom:  15000,
      mount:    8000
    }
  },

  labels: {
    finish:  { oak: 'Натуральный дуб', wenge: 'Тёмный орех', gold: 'Состаренное золото' },
    options: {
      led: 'Подсветка арки',
      engrave: 'Гравировка на цоколе',
      custom: 'Нестандартный размер',
      mount: 'Доставка и установка'
    }
  }
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

/* ---------- Шапка: фон при скролле ---------- */
const hdr = $('#hdr');
const onScroll = () => hdr.classList.toggle('is-stuck', window.scrollY > 40);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

/* ---------- Мобильное меню ---------- */
const burger = $('#burger'), nav = $('#nav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
});

/* ---------- Появление блоков при скролле ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const animated = $$('.reveal, .sect > .wrap > *, .grid > .card');
if (reduce || !('IntersectionObserver' in window)) {
  animated.forEach(el => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); obs.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  animated.forEach(el => io.observe(el));
}

/* ---------- Надпись на фронтоне ---------- */
const LATIN = 'Erised stra ehru oyt ube cafru oyt on wohsi';
const RU    = '«Я показываю не твоё лицо, но желание твоего сердца»';
const inscrText = $('#inscrText'), inscrBtn = $('#inscrBtn');
let flipped = false;

inscrBtn.addEventListener('click', () => {
  flipped = !flipped;
  inscrText.classList.add('is-flip');
  inscrText.style.opacity = '0';
  setTimeout(() => {
    inscrText.textContent = flipped ? RU : LATIN;
    inscrText.classList.toggle('is-ru', flipped);
    inscrText.classList.remove('is-flip');
    inscrText.style.opacity = '1';
    inscrBtn.textContent = flipped ? 'Вернуть как на резьбе' : 'Прочитать в отражении';
  }, 320);
});

/* ---------- Конфигуратор ---------- */
const cfgForm = $('#cfgForm');
const sumBase = $('#sumBase'), sumList = $('#sumList'), sumTotal = $('#sumTotal');

function readConfig() {
  const finish = cfgForm.querySelector('input[name="finish"]:checked').value;
  const options = $$('input[name="opt"]:checked', cfgForm).map(i => i.value);
  return { finish, options };
}

function configText() {
  const { finish, options } = readConfig();
  const opts = options.map(o => CONFIG.labels.options[o]).join(', ') || 'без доп. опций';
  return `2100×1000 мм, ${CONFIG.labels.finish[finish]}; ${opts}. Итого ≈ ${money(calcTotal())}`;
}

function calcTotal() {
  const { finish, options } = readConfig();
  return CONFIG.prices.base
    + (CONFIG.prices.finish[finish] || 0)
    + options.reduce((s, o) => s + (CONFIG.prices.options[o] || 0), 0);
}

function renderSum() {
  const { finish, options } = readConfig();
  sumBase.textContent = money(CONFIG.prices.base);

  const rows = [];
  const fp = CONFIG.prices.finish[finish] || 0;
  rows.push(`<li><span>${CONFIG.labels.finish[finish]}</span><b>${fp ? '+ ' + money(fp) : 'включено'}</b></li>`);
  options.forEach(o => {
    rows.push(`<li><span>${CONFIG.labels.options[o]}</span><b>+ ${money(CONFIG.prices.options[o])}</b></li>`);
  });
  sumList.innerHTML = rows.join('');

  const total = calcTotal();
  const cur = parseInt(sumTotal.dataset.val || '0', 10);
  animateNumber(cur, total, v => sumTotal.textContent = money(v));
  sumTotal.dataset.val = String(total);
}

function animateNumber(from, to, cb) {
  if (reduce || from === to) { cb(to); return; }
  const t0 = performance.now(), dur = 400;
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    cb(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

cfgForm.addEventListener('change', renderSum);
renderSum();

/* ---------- Модальное окно заявки ---------- */
const modal = $('#modal');
let lastFocus = null;

function openModal(source) {
  lastFocus = document.activeElement;
  $('#modalCfg').textContent = configText();
  $('#m-config').value = configText();
  $('#m-source').value = source || 'page';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#m-name').focus(), 50);
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  lastFocus && lastFocus.focus();
}

$$('.js-order').forEach(b => b.addEventListener('click', () => openModal(b.dataset.src)));
modal.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeModal(); });

/* Фокус не убегает из модалки */
modal.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('a[href],button,input,textarea,select', modal).filter(el => !el.disabled && el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- Лайтбокс ---------- */
const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
let lbItems = [], lbIdx = 0;

$$('.card--gal').forEach(card => {
  card.addEventListener('click', () => {
    lbItems = $$('.card--gal', card.closest('.grid'));
    lbIdx = lbItems.indexOf(card);
    showLb();
  });
});

function showLb() {
  const card = lbItems[lbIdx];
  lbImg.src = card.dataset.full || card.querySelector('img').src;
  lbImg.alt = card.querySelector('img').alt;
  const fc = card.querySelector('figcaption'), strong = fc.querySelector('b');
  lbCap.textContent = strong
    ? strong.textContent + ' — ' + fc.textContent.replace(strong.textContent, '').trim()
    : fc.textContent;
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeLb() { lb.hidden = true; document.body.style.overflow = ''; lbImg.src = ''; }
function stepLb(d) { lbIdx = (lbIdx + d + lbItems.length) % lbItems.length; showLb(); }

lb.addEventListener('click', e => {
  if (e.target.hasAttribute('data-lbclose') || e.target === lb) closeLb();
  else if (e.target.hasAttribute('data-lbprev')) stepLb(-1);
  else if (e.target.hasAttribute('data-lbnext')) stepLb(1);
});

addEventListener('keydown', e => {
  if (!lb.hidden) {
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') stepLb(-1);
    if (e.key === 'ArrowRight') stepLb(1);
  } else if (!modal.hidden && e.key === 'Escape') closeModal();
});

/* ---------- Маска телефона ---------- */
function maskPhone(el) {
  el.addEventListener('input', () => {
    let d = el.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 5) out += ') ' + d.slice(4, 7);
    if (d.length >= 8) out += '-' + d.slice(7, 9);
    if (d.length >= 10) out += '-' + d.slice(9, 11);
    el.value = out;
  });
  el.addEventListener('focus', () => { if (!el.value) el.value = '+7 ('; });
  el.addEventListener('blur',  () => { if (el.value.replace(/\D/g, '').length < 11) el.value = el.value.replace(/^\+7 \($/, ''); });
}
$$('input[type="tel"]').forEach(maskPhone);

/* ---------- Отправка заявок ---------- */
function validate(form) {
  let ok = true;
  $$('input[required], textarea[required]', form).forEach(el => {
    const bad = el.type === 'checkbox'
      ? !el.checked
      : (el.type === 'tel' ? el.value.replace(/\D/g, '').length < 11 : !el.value.trim());
    el.classList.toggle('is-err', bad);
    if (bad) ok = false;
  });
  return ok;
}

function telegramFallback(data) {
  const text = [
    'Заявка с сайта okales.ru',
    'Имя: ' + data.name,
    'Телефон: ' + data.phone,
    data.message ? 'Комментарий: ' + data.message : '',
    data.config ? 'Комплектация: ' + data.config : '',
    'Источник: ' + data.source
  ].filter(Boolean).join('\n');
  window.open(`https://t.me/${CONFIG.telegram}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

function bindForm(form, statusEl) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const status = $(statusEl);

    if (form.querySelector('input[name="company"]').value) return;   // ловушка для ботов
    if (!validate(form)) {
      status.textContent = 'Заполните имя, телефон и согласие на обработку данных.';
      status.className = 'form__status is-err';
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.config) data.config = configText();
    data.page = location.href;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = 'Отправляем…';
    status.className = 'form__status';

    try {
      if (CONFIG.formEndpoint) {
        const r = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data)
        });
        if (!r.ok) throw new Error('bad status ' + r.status);
      } else {
        telegramFallback(data);
      }
      status.textContent = 'Заявка принята. Перезвоним в течение рабочего дня.';
      status.className = 'form__status is-ok';
      form.reset();
      if (form.id === 'modalForm') setTimeout(closeModal, 2200);
    } catch (err) {
      status.innerHTML = `Не удалось отправить. Позвоните нам: <a href="tel:+79165936232">+7 916 593-62-32</a>`;
      status.className = 'form__status is-err';
    } finally {
      btn.disabled = false;
    }
  });
}

bindForm($('#leadForm'), '#formStatus');
bindForm($('#modalForm'), '#modalStatus');

/* Конфигуратор подставляется в форму внизу страницы */
cfgForm.addEventListener('change', () => { $('#f-config').value = configText(); });
$('#f-config').value = configText();

/* ---------- Год в подвале ---------- */
$('#year').textContent = new Date().getFullYear();
