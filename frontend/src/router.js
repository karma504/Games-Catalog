import { api } from './api.js'
import { state } from './state.js'
import { renderBlocks } from './renderBlocks.js'
import { esc, renderHeader, showPendingFlash } from './ui.js'

let token = 0

// Життєвий цикл: URL → /api/page?path=… → JSON з блоками → renderBlocks → DOM
export async function render({ loading = true, keepScroll = false } = {}) {
  const mine = ++token
  const main = document.getElementById('main')
  if (loading) main.innerHTML = '<p class="muted">Завантаження…</p>'
  try {
    const data = await api.get(`/page?path=${encodeURIComponent(location.pathname)}`)
    if (mine !== token) return
    document.title = `${data.meta.title} · ${state.site.name}`
    renderBlocks(data.blocks, main)
  } catch (e) {
    if (mine !== token) return
    document.title = state.site.name
    main.innerHTML =
      e.status === 404
        ? `<h1>Сторінку не знайдено</h1><p class="muted">Такої адреси немає. <a href="/">На головну</a></p>`
        : e.status === 403
          ? `<h1>Немає доступу</h1><p class="muted">У вас недостатньо прав для цієї сторінки. <a href="/">На головну</a></p>`
          : `<div class="msg error" role="alert">Щось пішло не так. Спробуйте оновити сторінку.</div>`
  }
  renderHeader()
  showPendingFlash()
  if (!keepScroll) window.scrollTo(0, 0)
}

export function navigate(to) {
  history.pushState(null, '', to)
  return render()
}

// Оновити поточну сторінку, не скидаючи прокрутку (після відгуку, нотатки тощо)
export const refresh = () => render({ loading: false, keepScroll: true })
