import { api } from '../api.js'
import { state } from '../state.js'
import { navigate, refresh } from '../router.js'
import { confirmDialog, cssUrl, esc, flash, flashNext, fmtDate, nl2br, stars, wishButton } from '../ui.js'

export function render(b) {
  const g = b.game
  const list = (arr) => arr.map((x) => esc(x.name)).join(', ') || 'Не вказано'
  return `<p class="muted small"><a href="/catalog">Каталог</a> / ${esc(g.title)}</p>
  <section class="detail game-hero" style="--h:${g.hue}${g.imageUrl ? `;--img:${esc(cssUrl(g.imageUrl))}` : ''}">
    <div class="hero-info">
      <h1>${esc(g.title)}</h1>
      <p>${g.avg ? `<b class="star">★ ${g.avg.toFixed(1)}</b> <span class="muted">(${g.votes})</span>` : '<span class="muted">Поки без оцінок</span>'}</p>
      ${g.genres.length ? `<div class="chips">${g.genres.map((x) => `<a href="/catalog?genre=${x.id}">${esc(x.name)}</a>`).join('')}</div>` : ''}
      <p class="long">${g.description ? nl2br(g.description) : 'Опису поки немає.'}</p>
      <dl>
        <dt>Розробник</dt><dd>${g.developer ? `<a href="/developers/${g.developer.id}">${esc(g.developer.name)}</a>` : 'Не вказано'}</dd>
        <dt>Дата виходу</dt><dd>${g.releaseDate ? fmtDate(g.releaseDate + 'T12:00:00Z') : 'Не вказано'}</dd>
        <dt>Віковий рейтинг</dt><dd>${g.ageRating ? `<span class="tag">${esc(g.ageRating)}</span>` : 'Не вказано'}</dd>
        <dt>Розмір</dt><dd>${g.fileSizeGb != null ? `${g.fileSizeGb} ГБ` : 'Не вказано'}</dd>
        <dt>Платформи</dt><dd>${list(g.platforms)}</dd>
      </dl>
    </div>
    <aside class="panel buy">
      <div class="price">${esc(g.priceLabel)}</div>
      ${wishButton(g.id, { cls: 'btn wide', guestLabel: 'Увійдіть, щоб додати в обране' })}
      ${g.officialUrl ? `<a class="btn ghost wide" href="${esc(g.officialUrl)}" target="_blank" rel="noopener noreferrer">Офіційний сайт ↗</a>` : '<span class="btn ghost wide disabled" aria-disabled="true">Офіційний сайт не вказано</span>'}
    </aside>
  </section>
  <section id="reviews" data-reviews></section>`
}

export function mount(el, b) {
  reviews(el.querySelector('[data-reviews]'), b, false)
}

function reviewForm(r) {
  return `<form class="panel review-form" data-review-form novalidate>
    <h3>${r ? 'Редагувати відгук' : 'Залишити відгук'}</h3>
    <div data-error></div>
    <div class="field"><label for="rv-rating">Оцінка</label>
      <select id="rv-rating" name="rating" required><option value="">Оберіть оцінку</option>${[5, 4, 3, 2, 1]
        .map((n) => `<option value="${n}"${r?.rating === n ? ' selected' : ''}>${'★'.repeat(n)} ${n}/5</option>`)
        .join('')}</select></div>
    <div class="field"><label for="rv-comment">Коментар</label>
      <textarea id="rv-comment" name="comment" rows="4" maxlength="2000">${esc(r?.comment)}</textarea></div>
    <div class="hrow"><button class="btn">${r ? 'Зберегти зміни' : 'Опублікувати відгук'}</button>
      ${r ? '<button type="button" class="btn ghost" data-cancel>Скасувати</button>' : ''}</div>
  </form>`
}

function reviewItem(r, b) {
  const own = r.mine
  return `<article class="review" data-review="${r.id}">
    <span class="avatar sm">${esc(r.author.slice(0, 1).toUpperCase())}</span>
    <div class="review-main">
      <div class="review-head">
        <b>${esc(r.author)}</b>${own ? '<span class="tag">Ваш відгук</span>' : ''}
        ${stars(r.rating)}<a class="muted small" href="/reviews/${r.id}">${fmtDate(r.date)}</a>
        ${own ? '<button type="button" class="linkbtn" data-edit>Редагувати</button><button type="button" class="linkbtn danger" data-del="own">Видалити</button>' : ''}
      </div>
      ${r.comment ? `<p>${nl2br(r.comment)}</p>` : ''}
    </div></article>`
}

function reviews(sec, b, editing) {
  const mine = b.reviews.find((r) => r.mine)
  const next = encodeURIComponent(location.pathname)
  let html = `<div class="sec-head"><h2>Відгуки ${b.game.votes ? `<small class="muted">${b.game.votes}</small>` : ''}</h2></div>`

  if (state.user) {
    if (!mine) html += reviewForm(null)
    else if (editing) html += reviewForm(mine)
  } else {
    html += `<p class="panel">Щоб залишити відгук, <a href="/login?next=${next}">увійдіть</a> або <a href="/register">зареєструйтесь</a>.</p>`
  }

  if (mine && !editing) html += reviewItem(mine, b)
  html += b.reviews.filter((r) => !mine || r.id !== mine.id).map((r) => reviewItem(r, b)).join('')
  if (!b.reviews.length) html += '<p class="muted">Поки ніхто не писав. Будьте першим.</p>'
  sec.innerHTML = html

  sec.querySelector('[data-review-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target
    const v = Object.fromEntries(new FormData(form))
    const box = form.querySelector('[data-error]')
    if (!v.rating) return (box.innerHTML = '<div class="msg error" role="alert">Оберіть оцінку від 1 до 5.</div>')
    const body = { rating: Number(v.rating), comment: v.comment.trim() }
    try {
      if (mine) await api.patch(`/reviews/${mine.id}`, body)
      else await api.post('/reviews', { game: b.game.id, ...body })
      await refresh()
      flash(mine ? 'Зміни збережено.' : 'Відгук опубліковано.')
    } catch (err) {
      box.innerHTML = `<div class="msg error" role="alert">${esc(err.message)}</div>`
    }
  })

  sec.querySelector('[data-cancel]')?.addEventListener('click', () => reviews(sec, b, false))
  sec.querySelector('[data-edit]')?.addEventListener('click', () => reviews(sec, b, true))
  sec.querySelectorAll('[data-del]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.closest('[data-review]').dataset.review
      const own = btn.dataset.del === 'own'
      const ok = await confirmDialog({
        title: 'Видалити відгук?',
        text: own ? 'Ваш відгук і оцінку буде видалено.' : 'Відгук користувача буде видалено (дія модератора).',
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
