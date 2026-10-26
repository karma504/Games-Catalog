import { ageNotice, esc } from '../ui.js'

export function render(b) {
  const buttons = [
    [b.primaryLabel, b.primaryLink, 'btn'],
    [b.secondaryLabel, b.secondaryLink, 'btn ghost'],
  ]
    .filter(([label, link]) => label && link)
    .map(([label, link, cls]) => `<a class="${cls}" href="${esc(link)}">${esc(label)}</a>`)
    .join('')
  return `<section class="hero">
    <h1>${esc(b.heading).replace(/\n/g, '<br>')}</h1>
    ${b.text ? `<p>${esc(b.text)}</p>` : ''}
    ${buttons ? `<div class="hrow">${buttons}</div>` : ''}
  </section>${ageNotice()}`
}
