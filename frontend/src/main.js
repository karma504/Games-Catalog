import './style.css'
import { loadCommon } from './state.js'
import { navigate, render } from './router.js'
import { bindGlobal, renderFooter } from './ui.js'

async function start() {
  bindGlobal(navigate)
  window.addEventListener('popstate', () => render())
  try {
    await loadCommon() // налаштування сайту, шапка, футер, користувач, обране
  } catch (e) {
    console.error('Не вдалося завантажити /api/common', e)
  }
  renderFooter()
  render()
}

start()
