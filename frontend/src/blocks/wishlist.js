import { api } from '../api.js'
import { state } from '../state.js'
import { refresh } from '../router.js'
import { confirmDialog, esc, flash } from '../ui.js'

function item(it) {
  const g = it.game
  const note = it.note
    ? `<div class="note">
        <span class="note-label">Нотатка</span><p>${esc(it.note)}</p>
        <div class="hrow">
          <details class="note-edit"><summary class="btn ghost small">Змінити</summary>
            <form class="hrow" data-note-form><input name="note" value="${esc(it.note)}" maxlength="255" required><button class="btn small">Зберегти</button></form>
          </details>
          <button type="button" class="btn ghost small danger" data-note-delete>Видалити нотатку</button>
        </div>
      </div>`
    : `<form class="hrow" data-note-form><input name="note" placeholder="Нотатка: чому хочеться" maxlength="255" required><button class="btn small">Додати нотатку</button></form>`
  return `<article class="panel wish" style="--h:${g.hue}" data-wish-id="${it.wishId}" data-game="${g.id}" data-title="${esc(g.title)}">
    <div class="cover mini">${g.imageUrl ? `<img src="${esc(g.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="cover-letter">${esc(g.title.slice(0, 1))}</span></div>
    <div><h3><a href="/games/${g.id}">${esc(g.title)}</a></h3><p class="muted">${esc(g.developer?.name || '')} · ${esc(g.priceLabel)}</p></div>
    <button type="button" class="btn ghost small danger" data-remove>Прибрати</button>
    <div class="wish-note">${note}</div>
  </article>`
}

export function render(b) {
  if (b.requiresLogin || !state.user)
    return '<p class="panel">Увійдіть, щоб бачити обране. <a href="/login?next=/wishlist">Увійти</a></p>'
  return `<h1>Обране <small class="muted">${b.items.length}</small></h1>${
    b.items.map(item).join('') || '<p class="panel">Тут поки порожньо. Загляньте в <a href="/catalog">каталог</a>.</p>'
  }`
}

export function mount(el) {
  const wishOf = (node) => node.closest('[data-wish-id]')

  async function saveNote(card, note) {
    try {
      await api.patch(`/wishlist/${card.dataset.wishId}`, { note })
      await refresh()
    } catch (e) {
      flash(e.message, 'error')
    }
  }

  el.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-note-form]')
    if (!form) return
    e.preventDefault()
    saveNote(wishOf(form), new FormData(form).get('note').toString().trim())
  })

  el.addEventListener('click', async (e) => {
    const card = wishOf(e.target)
    if (!card) return
    if (e.target.closest('[data-note-delete]')) {
      const ok = await confirmDialog({
        title: 'Видалити нотатку?',
        text: 'Гра залишиться в обраному, зникне лише ваша нотатка.',
      })
      if (ok) saveNote(card, '')
    }
    if (e.target.closest('[data-remove]')) {
      const ok = await confirmDialog({
        title: 'Прибрати з обраного?',
        text: `«${card.dataset.title}» зникне зі списку обраного разом із нотаткою.`,
        yes: 'Так, прибрати',
      })
      if (!ok) return
      try {
        await api.del(`/wishlist/${card.dataset.wishId}`)
        delete state.wishes[card.dataset.game]
        await refresh()
      } catch (err) {
        flash(err.message, 'error')
      }
    }
  })
}
