import { api } from '../api.js'
import { state } from '../state.js'
import { navigate } from '../router.js'
import { clearFieldErrors, esc, flashNext, showFieldErrors } from '../ui.js'

// Форма додавання (/games/add) та редагування (/games/:id/edit) гри. Порт GameCreateView / GameUpdateView.
const checks = (name, items, chosen) =>
  `<div class="checks">${items
    .map(
      (x) =>
        `<label class="check"><input type="checkbox" name="${name}" value="${x.id}"${chosen.includes(x.id) ? ' checked' : ''}> ${esc(x.name)}</label>`,
    )
    .join('')}</div>`

export function render(b) {
  if (b.requiresLogin || !state.user)
    return '<p class="panel">Щоб додати гру, <a href="/login?next=/games/add">увійдіть</a> або <a href="/register">зареєструйтесь</a>.</p>'
  const g = b.game || {}
  const f = b.filters
  const edit = b.mode === 'edit'
  return `<p class="muted small"><a href="/catalog">Каталог</a> / ${edit ? esc(g.title) : 'Нова гра'}</p>
  <h1>${edit ? `Редагувати: ${esc(g.title)}` : 'Додати гру'}</h1>
  <form class="panel game-form" novalidate>
    <div data-error></div>
    <div class="field"><label for="g-title">Назва *</label>
      <input id="g-title" name="title" maxlength="200" value="${esc(g.title)}" required></div>
    <div class="field"><label for="g-dev">Розробник</label>
      <select id="g-dev" name="developer"><option value="">Не вказано</option>${f.developers
        .map((d) => `<option value="${d.id}"${g.developer === d.id ? ' selected' : ''}>${esc(d.name)}</option>`)
        .join('')}</select></div>
    <div class="field"><label>Жанри</label>${checks('genres', f.genres, g.genres || [])}</div>
    <div class="field"><label>Платформи</label>${checks('platforms', f.platforms, g.platforms || [])}</div>
    <div class="two">
      <div class="field"><label for="g-date">Дата виходу</label>
        <input id="g-date" type="date" name="releaseDate" value="${esc(g.releaseDate)}"></div>
      <div class="field"><label for="g-age">Віковий рейтинг</label>
        <select id="g-age" name="ageRating"><option value="">Не вказано</option>${b.ages
          .map((a) => `<option value="${a}"${g.ageRating === a ? ' selected' : ''}>${a}</option>`)
          .join('')}</select></div>
    </div>
    <div class="two">
      <div class="field"><label for="g-size">Розмір, ГБ</label>
        <input id="g-size" name="fileSizeGb" inputmode="decimal" autocomplete="off" value="${esc(g.fileSizeGb)}" placeholder="12,5"></div>
      <div class="field"><label for="g-price">Ціна, ${esc(state.site.currency)}</label>
        <input id="g-price" name="price" inputmode="decimal" autocomplete="off" value="${esc(g.price)}" placeholder="19,99"></div>
    </div>
    <div class="field"><label for="g-site">Офіційний сайт</label>
      <input id="g-site" name="officialUrl" maxlength="500" value="${esc(g.officialUrl)}" placeholder="https://example.com"></div>
    <div class="field"><label for="g-img">Посилання на зображення</label>
      <input id="g-img" name="imageUrl" maxlength="500" value="${esc(g.imageUrl)}" placeholder="https://example.com/game.jpg"></div>
    <div class="field"><label for="g-desc">Опис</label>
      <textarea id="g-desc" name="description" rows="5">${esc(g.description)}</textarea></div>
    <div class="hrow"><button class="btn">${edit ? 'Зберегти зміни' : 'Додати гру'}</button>
      <a class="btn ghost" href="${edit ? `/games/${g.id}` : '/catalog'}">Скасувати</a></div>
  </form>`
}

const toNumber = (raw) => {
  const t = String(raw ?? '').trim().replace(',', '.')
  return t === '' ? null : Number(t)
}

export function mount(el, b) {
  const form = el.querySelector('form')
  if (!form) return
  const box = form.querySelector('[data-error]')
  const banner = (t) => (box.innerHTML = `<div class="msg error" role="alert">${esc(t)}</div>`)

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearFieldErrors(form)
    box.innerHTML = ''
    const fd = new FormData(form)
    const v = Object.fromEntries(fd)
    const errors = {}

    if (!String(v.title).trim()) errors.title = 'Вкажіть назву гри.'
    const size = toNumber(v.fileSizeGb)
    const price = toNumber(v.price)
    if (size !== null && (!Number.isFinite(size) || size < 0)) errors.fileSizeGb = 'Розмір — це невід’ємне число, наприклад 12,5.'
    if (price !== null && (!Number.isFinite(price) || price < 0)) errors.price = 'Ціна — це невід’ємне число, наприклад 19,99.'
    if (Object.keys(errors).length) return showFieldErrors(form, errors)

    const body = {
      title: String(v.title).trim(),
      developer: v.developer ? Number(v.developer) : null,
      genres: fd.getAll('genres').map(Number),
      platforms: fd.getAll('platforms').map(Number),
      releaseDate: v.releaseDate ? `${v.releaseDate}T12:00:00.000Z` : null,
      ageRating: v.ageRating || null,
      fileSizeGb: size,
      price,
      officialUrl: String(v.officialUrl).trim() || null,
      imageUrl: String(v.imageUrl).trim() || null,
      description: String(v.description).trim() || null,
    }

    const btn = form.querySelector('button')
    btn.disabled = true
    try {
      if (b.mode === 'edit') {
        await api.patch(`/games/${b.game.id}`, body)
        flashNext('Зміни збережено.')
        navigate(`/games/${b.game.id}`)
      } else {
        const r = await api.post('/games', body)
        flashNext(`Гру «${r.doc.title}» додано до каталогу.`)
        navigate(`/games/${r.doc.id}`)
      }
    } catch (err) {
      // Payload повертає помилки полів у data.errors[0].data.errors: [{ path, message }]
      const inner = err.data?.errors?.[0]?.data?.errors
      const known = ['title', 'fileSizeGb', 'price', 'officialUrl', 'imageUrl', 'releaseDate', 'description']
      const mapped = {}
      for (const x of inner || []) if (known.includes(x.path)) mapped[x.path] = x.message
      if (Object.keys(mapped).length) showFieldErrors(form, mapped)
      else if (/назв/i.test(err.message) && /вже є/.test(err.message)) showFieldErrors(form, { title: err.message })
      else banner(err.status === 403 ? 'Недостатньо прав для цієї дії.' : err.message)
    } finally {
      btn.disabled = false
    }
  })
}
