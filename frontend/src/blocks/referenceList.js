import { esc } from '../ui.js'

export function render(b) {
  const title = `<h1>${esc(b.title || '')}${b.kind === 'developers' ? ` <small class="muted">${b.items.length}</small>` : ''}</h1>`
  if (b.kind === 'developers') {
    return `${title}<div class="grid">${
      b.items
        .map(
          (d) => `<a class="panel" href="${d.href}"><h3>${esc(d.name)}</h3>
            <p class="muted">${esc(d.sub || 'Країну не вказано')}</p>
            <p>Ігор у каталозі: <b>${d.n}</b></p></a>`,
        )
        .join('') || '<p class="panel">Розробників поки немає.</p>'
    }</div>`
  }
  return `${title}<div class="chips">${
    b.items.map((o) => `<a href="${o.href}">${esc(o.name)} <span class="muted">(${o.n})</span></a>`).join('') ||
    '<p class="muted">Поки порожньо.</p>'
  }</div>`
}
