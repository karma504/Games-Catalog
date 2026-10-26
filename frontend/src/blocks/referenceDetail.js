import { card, esc } from '../ui.js'

export function render(b) {
  const contacts = [
    b.website ? `<a href="${esc(b.website)}" target="_blank" rel="noopener">${esc(b.website)}</a>` : '',
    b.email ? `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return `<p class="muted small">${esc(b.label)}</p>
    <h1>${esc(b.name)}</h1>
    ${b.subtitle ? `<p class="muted">${esc(b.subtitle)}</p>` : ''}
    ${contacts ? `<p>${contacts}</p>` : ''}
    <h2>Ігри</h2>
    <div class="grid">${b.games.map(card).join('') || '<p class="muted">Ігор поки немає.</p>'}</div>`
}
