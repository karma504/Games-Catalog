import { api } from '../api.js'
import { ageNotice, card, clearFieldErrors, esc, showFieldErrors } from '../ui.js'

const checks = (name, items) =>
  `<div class="chips pick">${items
    .map((x) => `<label><input type="checkbox" name="${name}" value="${x.id}"><span>${esc(x.name)}</span></label>`)
    .join('')}</div>`

export function render(b) {
  const f = b.filters
  return `<h1>${esc(b.title || 'Підбір гри')}</h1>
    ${b.text ? `<p class="muted">${esc(b.text)}</p>` : ''}
    ${ageNotice()}
    <form class="panel pickform" novalidate>
      <fieldset><legend>Жанри</legend>${checks('genre', f.genres)}</fieldset>
      <fieldset><legend>Платформи</legend>${checks('platform', f.platforms)}</fieldset>
      <div class="four">
        <label>Бюджет до<input name="max_price" inputmode="decimal" autocomplete="off"></label>
        <label>Розмір до, ГБ<input name="max_size" inputmode="decimal" autocomplete="off"></label>
        <label>Віковий рейтинг<select name="age"><option value="">Будь-який</option>${f.ages
          .map((a) => `<option>${esc(a)}</option>`)
          .join('')}</select></label>
        <label>Оцінка від<select name="min_rating"><option value="0">Будь-яка</option>${[2, 3, 4, 5]
          .map((n) => `<option value="${n}">${n}★</option>`)
          .join('')}</select></label>
      </div>
      <button class="btn">Підібрати</button>
    </form>
    <div data-results></div>`
}

export function mount(el) {
  const form = el.querySelector('form')
  const out = el.querySelector('[data-results]')
  const sp = new URLSearchParams(location.search)

  form.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = sp.getAll(c.name).includes(c.value)))
  for (const name of ['max_price', 'max_size', 'age', 'min_rating']) if (sp.has(name)) form.elements[name].value = sp.get(name)

  async function search() {
    const qs = new URLSearchParams()
    new FormData(form).forEach((v, k) => {
      if (String(v).trim() && !(k === 'min_rating' && v === '0')) qs.append(k, String(v).trim())
    })
    history.replaceState(null, '', `${location.pathname}?go=1${qs.size ? '&' + qs : ''}`)
    qs.set('pick', '1')
    clearFieldErrors(form)
    try {
      const r = await api.get(`/catalog?${qs}`)
      out.innerHTML = `<h2>Що знайшлося</h2><div class="grid">${
        r.items.map(card).join('') ||
        '<p class="panel">За такими умовами нічого немає. Збільште бюджет або приберіть частину жанрів.</p>'
      }</div>`
    } catch (e) {
      if (e.status === 400 && e.data?.errors) {
        showFieldErrors(form, e.data.errors)
        out.innerHTML =
          '<div class="msg error" role="alert">Поки що нічого не підбираємо: виправте поля, позначені червоним, — і ми одразу покажемо ігри.</div>'
      } else {
        out.innerHTML = '<div class="msg error" role="alert">Не вдалося виконати пошук. Спробуйте ще раз пізніше.</div>'
      }
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    search()
  })
  if (sp.has('go')) search()
}
