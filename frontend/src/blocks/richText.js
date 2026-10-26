import { esc } from '../ui.js'

export function render(b) {
  const paragraphs = String(b.content || '')
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `<section>${b.title ? `<h1>${esc(b.title)}</h1>` : ''}${paragraphs}</section>`
}
