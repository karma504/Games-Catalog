import { api } from '../api.js'
import { refresh } from '../router.js'
import { confirmDialog, esc, flash, fmtDate, nl2br, pagination, stars } from '../ui.js'

// Усі відгуки для модератора (порт ReviewListView). Сторінки по 20 штук.
const PER = 20

export function render(b) {
  return `<h1>Відгуки <small class="muted">${b.items.length}</small></h1>
  <div data-list></div><div data-pages></div>`
}

export function mount(el, b) {
  const list = el.querySelector('[data-list]')
  const pages = el.querySelector('[data-pages]')
  const total = Math.max(Math.ceil(b.items.length / PER), 1)

  function show(page) {
    const items = b.items.slice((page - 1) * PER, page * PER)
    list.innerHTML = items.length
      ? items
          .map(
            (r) => `<article class="panel review-row" data-review="${r.id}">
        <div class="review-head">
          <b>${esc(r.author)}</b> <span class="muted small">${esc(r.email)}</span>
          ${stars(r.rating)} <span class="muted small">${fmtDate(r.date)}</span>
        </div>
        <p class="muted small">${r.game ? `<a href="/games/${r.game.id}">${esc(r.game.title)}</a>` : 'Гру видалено'}
          · <a href="/reviews/${r.id}">Відкрити відгук</a></p>
        ${r.comment ? `<p>${nl2br(r.comment)}</p>` : ''}
        <button type="button" class="linkbtn danger" data-del>Видалити</button>
      </article>`,
          )
          .join('')
      : '<p class="muted">Відгуків поки немає.</p>'
    pages.innerHTML = pagination(page, total)
    pages.querySelectorAll('[data-page]').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault()
        show(Number(a.dataset.page))
        window.scrollTo(0, 0)
      }),
    )
    list.querySelectorAll('[data-del]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const id = btn.closest('[data-review]').dataset.review
        const ok = await confirmDialog({
          title: 'Видалити відгук?',
          text: 'Відгук користувача буде видалено (дія модератора).',
        })
        if (!ok) return
        try {
          await api.del(`/reviews/${id}`)
          await refresh()
        } catch (err) {
          flash(err.message, 'error')
        }
      }),
    )
  }
  show(1)
}
