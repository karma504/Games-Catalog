import { api } from '../api.js'
import { ageNotice, card, clearFieldErrors, esc, pagination, showFieldErrors } from '../ui.js'

const SORTS = [
  ['new', 'Спочатку нові'], ['old', 'Спочатку старі'], ['rating', 'За оцінкою'],
  ['cheap', 'Дешевші'], ['pricey', 'Дорожчі'], ['title', 'За назвою'],
]
const select = (name, label, any, items) =>
  `<label>${label}<select name="${name}"><option value="">${any}</option>${items
    .map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`)
    .join('')}</select></label>`

export function render(b) {
  const f = b.filters
  return `<div class="d-flex justify-content-between align-items-center">
      <h1>${esc(b.title || 'Каталог')} <small class="muted" data-total></small></h1></div>
    ${ageNotice()}
    <div class="split">
      <form class="panel filters" novalidate>
        <label>Пошук<input name="q"></label>
        ${select('genre', 'Жанр', 'Будь-який', f.genres.map((x) => [x.id, x.name]))}
        ${select('platform', 'Платформа', 'Будь-яка', f.platforms.map((x) => [x.id, x.name]))}
        ${select('dev', 'Розробник', 'Будь-який', f.developers.map((x) => [x.id, x.name]))}
        ${select('age', 'Віковий рейтинг', 'Будь-який', f.ages.map((a) => [a, a]))}
        <div class="two">
          <label>Ціна від<input name="price_min" inputmode="decimal" autocomplete="off"></label>
          <label>до<input name="price_max" inputmode="decimal" autocomplete="off"></label>
        </div>
        <label class="check"><input type="checkbox" name="free" value="1"> Лише безкоштовні</label>
        <label>Сортування<select name="sort">${SORTS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
        <button class="btn">Застосувати</button> <a class="muted" href="/catalog">Скинути</a>
      </form>
      <div data-results></div>
    </div>`
}

export function mount(el) {
  const form = el.querySelector('form')
  const out = el.querySelector('[data-results]')
  const total = el.querySelector('[data-total]')
  const sp = new URLSearchParams(location.search)

  for (const [k, v] of sp) {
    const input = form.elements[k]
    if (!input || k === 'page') continue
    if (input.type === 'checkbox') input.checked = v === '1'
    else input.value = v
  }

  async function load(page = 1) {
    const qs = new URLSearchParams()
    new FormData(form).forEach((v, k) => {
      if (String(v).trim()) qs.set(k, String(v).trim())
    })
    if (page > 1) qs.set('page', page)
    history.replaceState(null, '', location.pathname + (qs.size ? `?${qs}` : ''))
    clearFieldErrors(form)
    try {
      const r = await api.get(`/catalog?${qs}`)
      total.textContent = r.total
      out.innerHTML = `<div class="grid">${
        r.items.map(card).join('') || '<p class="panel">Нічого не знайдено. Спробуйте пом’якшити фільтри.</p>'
      }</div>${pagination(r.page, r.pages)}`
    } catch (e) {
      if (e.status === 400 && e.data?.errors) {
        showFieldErrors(form, e.data.errors)
        out.innerHTML = '<div class="msg error" role="alert">Каталог поки не фільтруємо: виправте поля, позначені червоним.</div>'
      } else {
        out.innerHTML = '<div class="msg error" role="alert">Не вдалося завантажити каталог. Спробуйте ще раз.</div>'
      }
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    load(1)
  })
  out.addEventListener('click', (e) => {
    const a = e.target.closest('[data-page]')
    if (!a) return
    e.preventDefault()
    load(Number(a.dataset.page))
    window.scrollTo({ top: 0 })
  })
  load(Number(sp.get('page')) || 1)
}
