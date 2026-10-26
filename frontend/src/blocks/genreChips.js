import { esc } from '../ui.js'

export function render(b) {
  if (!b.genres?.length) return ''
  return `<section><h2>${esc(b.title || 'Жанри')}</h2>
    <div class="chips">${b.genres.map((g) => `<a href="/catalog?genre=${g.id}">${esc(g.name)}</a>`).join('')}</div></section>`
}
