import { api } from '../api.js'
import { navigate } from '../router.js'
import { confirmDialog, esc, flash, flashNext, fmtDate, nl2br, stars } from '../ui.js'


export function render(b) {
  const r = b.review
  return `<p class="muted small"><a href="/catalog">Каталог</a> / <a href="/games/${b.game.id}">${esc(b.game.title)}</a> / Відгук</p>
  <article class="panel review-row">
    <h1>Відгук на «${esc(b.game.title)}»</h1>
    <div class="review-head"><b>${esc(r.author)}</b>${r.mine ? ' <span class="tag">Ваш відгук</span>' : ''}
      ${stars(r.rating)} <span class="muted small">${fmtDate(r.date)}</span></div>
    ${r.comment ? `<p>${nl2br(r.comment)}</p>` : '<p class="muted">Без коментаря.</p>'}
    <div class="hrow">
      <a class="btn ghost" href="/games/${b.game.id}">До гри</a>
    </div>
  </article>`
}

export function mount(el, b) {
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Видалити відгук?', text: 'Відгук користувача буде видалено (дія модератора).' })
    if (!ok) return
    try {
      await api.del(`/reviews/${b.review.id}`)
      flashNext('Відгук видалено.')
      navigate(`/games/${b.game.id}`)
    } catch (err) {
      flash(err.message, 'error')
    }
  })
}
