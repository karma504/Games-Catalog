import { card, esc } from '../ui.js'

export function render(b) {
  if (b.source === 'top' && !b.games.length) return ''
  return `<section><h2>${esc(b.title)}</h2><div class="grid">${
    b.games.map(card).join('') || '<p class="muted">Поки що в каталозі немає ігор.</p>'
  }</div></section>`
}
