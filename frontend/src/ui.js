import { api } from './api.js'
import { state } from './state.js'

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
export const nl2br = (v) => esc(v).replace(/\n/g, '<br>')
export const cssUrl = (u) => `url('${encodeURI(u).replace(/'/g, '%27')}')`
export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
export const stars = (n) => `<span class="star">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`
export const safeNext = (v) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : '/')


let pending = null
export function flash(text, type = 'success') {
  const d = document.createElement('div')
  d.className = `msg ${type}`
  d.setAttribute('role', type === 'error' ? 'alert' : 'status')
  d.textContent = text
  document.getElementById('main').prepend(d)
  setTimeout(() => d.remove(), 6000)
}
export const flashNext = (text, type = 'success') => (pending = { text, type })
export function showPendingFlash() {
  if (pending) flash(pending.text, pending.type)
  pending = null
}

export function confirmDialog({ title = 'Підтвердження дії', text = 'Ви впевнені, що хочете продовжити?', yes = 'Підтвердити' } = {}) {
  const modal = document.getElementById('confirm-modal')
  modal.querySelector('#confirm-title').textContent = title
  modal.querySelector('#confirm-text').textContent = text
  modal.querySelector('#confirm-yes').textContent = yes
  return new Promise((resolve) => {
    modal.returnValue = ''
    modal.addEventListener('close', () => resolve(modal.returnValue === 'yes'), { once: true })
    modal.showModal()
  })
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.has-error').forEach((n) => n.classList.remove('has-error'))
  form.querySelectorAll('.field-error').forEach((n) => n.remove())
}
export function showFieldErrors(form, errors) {
  for (const [name, text] of Object.entries(errors)) {
    const input = form.elements[name]
    const box = input?.closest('label') || input?.parentElement
    if (!box) continue
    box.classList.add('has-error')
    box.insertAdjacentHTML('beforeend', `<span class="field-error" role="alert">${esc(text)}</span>`)
  }
}

export function ageNotice() {
  const { limit, isGuest } = state.age
  if (!isGuest || limit == null) return ''
  const link = state.user
    ? '<a href="/profile?edit=profile">Вкажіть дату народження</a>, щоб побачити більше ігор.'
    : '<a href="/login">Увійдіть</a>, щоб бачити ігри, доступні за вашим віком.'
  const head = state.user ? `У профілі не вказано дату народження, тому показано ігри ${limit}+.` : `Показано ігри ${limit}+.`
  return `<div class="msg info" role="note">${head} ${link}</div>`
}

export function wishButton(gameId, { cls = 'btn small', guestLabel = 'Додати в обране' } = {}) {
  if (!state.user) {
    const next = encodeURIComponent(location.pathname)
    return `<a class="${cls}" href="/login?next=${next}" title="Увійдіть, щоб додати в обране">${esc(guestLabel)}</a>`
  }
  const on = Boolean(state.wishes[gameId])
  return `<button type="button" class="${cls}${on ? ' ghost' : ''}" data-wish="${gameId}" aria-pressed="${on}">${
    on ? 'Прибрати з обраного' : 'Додати в обране'
  }</button>`
}

export function card(g) {
  const genres = g.genres.slice(0, 3).map((x) => `<span>${esc(x.name)}</span>`).join('')
  return `<article class="tile" style="--h:${g.hue}">
  <a class="tile-link" href="/games/${g.id}" aria-label="${esc(g.title)}: докладніше"></a>
  <div class="cover${g.imageUrl ? ' has-img' : ''}">
    ${g.imageUrl ? `<img src="${esc(g.imageUrl)}" alt="Обкладинка гри «${esc(g.title)}»" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    <span class="cover-letter">${esc(g.title.slice(0, 1))}</span>
    <em class="chip">${esc(g.priceLabel)}</em>
    ${g.ageRating ? `<em class="chip age">${esc(g.ageRating)}</em>` : ''}
  </div>
  <div class="tile-body">
    <h3>${esc(g.title)}</h3>
    <p class="muted">${esc(g.developer?.name || 'Студію не вказано')}${g.releaseDate ? ' · ' + g.releaseDate.slice(0, 4) : ''}</p>
    <p class="tile-rating">${g.avg ? `<b class="star">★ ${g.avg.toFixed(1)}</b> <span class="muted">(${g.votes})</span>` : '<span class="muted">Поки без оцінок</span>'}</p>
    ${genres ? `<p class="tile-tags">${genres}</p>` : ''}
  </div>
  <div class="tile-actions">
    <span class="tile-wish">${wishButton(g.id)}</span>
    ${g.officialUrl ? `<a class="btn small" href="${esc(g.officialUrl)}" target="_blank" rel="noopener noreferrer">Офіційний сайт ↗</a>` : '<span class="btn small ghost disabled" aria-disabled="true">Сайт не вказано</span>'}
  </div>
</article>`
}

export function pagination(page, pages) {
  if (pages <= 1) return ''
  const item = (n, t) => `<li class="page-item"><a class="page-link" href="#" data-page="${n}">${t}</a></li>`
  return `<nav aria-label="Сторінки" class="mt-4"><ul class="pagination justify-content-center">
    ${page > 1 ? item(page - 1, 'Назад') : ''}
    <li class="page-item disabled"><span class="page-link">${page} / ${pages}</span></li>
    ${page < pages ? item(page + 1, 'Далі') : ''}
  </ul></nav>`
}

export function renderHeader() {
  const path = location.pathname
  const on = (p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/')) ? ' class="on" aria-current="page"' : ''
  const links = state.header.links
    .filter((l) => (!l.authOnly || state.user) && (!l.adminOnly || state.user?.isAdmin))
    .filter((l) => l.url !== '/games/add' && l.url !== '/reviews')
    .map((l) => `<a href="${esc(l.url)}"${on(l.url)}>${esc(l.label)}</a>`)
    .join('')
  const u = state.user
  const who = u
    ? `<a class="profile-link" href="/profile"><span class="avatar">${esc((u.firstName || u.email).slice(0, 1).toUpperCase())}</span><span>${esc(u.firstName || u.email)}</span></a>`
    : '<a class="btn ghost small" href="/login">Увійти</a><a class="btn small" href="/register">Реєстрація</a>'
  const q = new URLSearchParams(location.search).get('q') || ''
  document.getElementById('header').innerHTML = `
    <a class="brand" href="/"><i></i>${esc(state.site.name)}</a>
    <nav>${links}</nav>
    <form class="search" id="search-form"><input name="q" placeholder="Знайти гру або студію" value="${esc(path === '/catalog' ? q : '')}"></form>
    <div class="who">${who}</div>`
}

export function renderFooter() {
  const links = state.footer.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(' · ')
  document.getElementById('footer').innerHTML = `${esc(state.footer.text || state.site.name)}${links ? ' · ' + links : ''}`
}

export function bindGlobal(navigate) {

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]')
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const href = a.getAttribute('href')
    if (!href.startsWith('/') || href.startsWith('//') || a.target === '_blank' || a.hasAttribute('download')) return
    e.preventDefault()
    navigate(href)
  })

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'search-form') {
      e.preventDefault()
      const q = new FormData(e.target).get('q').toString().trim()
      navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog')
    }
  })

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-wish]')
    if (!btn) return
    e.preventDefault()
    const gid = btn.dataset.wish
    btn.disabled = true
    try {
      if (state.wishes[gid]) {
        await api.del(`/wishlist/${state.wishes[gid]}`)
        delete state.wishes[gid]
      } else {
        const r = await api.post('/wishlist', { game: Number(gid) })
        state.wishes[gid] = r.doc.id
      }
      const on = Boolean(state.wishes[gid])
      document.querySelectorAll(`[data-wish="${gid}"]`).forEach((b) => {
        b.textContent = on ? 'Прибрати з обраного' : 'Додати в обране'
        b.classList.toggle('ghost', on)
        b.setAttribute('aria-pressed', String(on))
      })
    } catch (err) {
      flash(err.message, 'error')
    } finally {
      btn.disabled = false
    }
  })

  const modal = document.getElementById('confirm-modal')
  document.getElementById('confirm-yes').addEventListener('click', () => modal.close('yes'))
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === modal) modal.close('no')
  })
}
