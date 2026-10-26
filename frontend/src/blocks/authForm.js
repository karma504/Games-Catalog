import { api } from '../api.js'
import { loadCommon, state } from '../state.js'
import { navigate } from '../router.js'
import { esc, flashNext, safeNext } from '../ui.js'
import { PASSWORD_HINT, passwordError } from '../passwordRules.js'

const field = (label, name, type = 'text', attrs = '', hint = '') =>
  `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" ${attrs}>${
    hint ? `<p class="field-hint">${hint}</p>` : ''
  }</div>`

const TITLES = {
  login: ['Вхід', 'Увійдіть за email і паролем.'],
  register: ['Реєстрація', 'Дата народження потрібна, щоб показувати лише ігри, доступні за віком.'],
}

export function render(b) {
  const mode = b.mode
  if (state.user)
    return `<p class="panel">Ви вже увійшли як ${esc(state.user.email)}. <a href="/">На головну</a></p>`

  const [title, lead] = TITLES[mode] || TITLES.login
  const today = new Date().toISOString().slice(0, 10)
  const login = mode === 'login'
  const register = mode === 'register'

  return `<form class="panel auth" novalidate data-mode="${mode}">
    <h1>${title}</h1>
    <p class="muted lead">${lead}</p>
    <div data-error></div>
    ${field('Email', 'email', 'email', 'autocomplete="email" required')}
    ${register ? field('Ім’я', 'firstName', 'text', 'maxlength="100" autocomplete="given-name"') : ''}
    ${register ? field('Прізвище', 'lastName', 'text', 'maxlength="100" autocomplete="family-name"') : ''}
    ${register ? field('Дата народження', 'dateOfBirth', 'date', `max="${today}"`) : ''}
    ${field('Пароль', 'password', 'password', `autocomplete="${login ? 'current-password' : 'new-password'}" required`, register ? PASSWORD_HINT : '')}
    ${register ? field('Повторіть пароль', 'password2', 'password', 'autocomplete="new-password" required') : ''}
    <button class="btn wide">${login ? 'Увійти' : 'Створити акаунт'}</button>
    <p class="muted">${
      login ? 'Немає акаунта? <a href="/register">Зареєструйтесь</a>' : 'Уже є акаунт? <a href="/login">Увійти</a>'
    }</p>
  </form>`
}

export function mount(el) {
  const form = el.querySelector('form')
  if (!form) return
  const err = form.querySelector('[data-error]')
  const showError = (t) => (err.innerHTML = `<div class="msg error" role="alert">${esc(t)}</div>`)
  const mode = form.dataset.mode

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    err.innerHTML = ''
    const v = Object.fromEntries(new FormData(form))
    const email = String(v.email ?? '').trim().toLowerCase()

    if (!email || !v.password) return showError('Заповніть email і пароль.')

    if (mode === 'register') {
      if (v.password !== v.password2) return showError('Паролі не збігаються.')
      const bad = passwordError(String(v.password))
      if (bad) return showError(bad)
    }

    const btn = form.querySelector('button')
    btn.disabled = true
    try {
      if (mode === 'register') {
        await api.post('/users', {
          email,
          password: v.password,
          firstName: v.firstName?.trim() || undefined,
          lastName: v.lastName?.trim() || undefined,
          dateOfBirth: v.dateOfBirth ? `${v.dateOfBirth}T12:00:00.000Z` : undefined,
        })
      }
      await api.post('/users/login', { email, password: v.password })
      await loadCommon()
      flashNext(mode === 'register' ? 'Акаунт створено. Ласкаво просимо!' : 'Ви увійшли.')
      navigate(safeNext(new URLSearchParams(location.search).get('next')))
    } catch (e2) {
      showError(mode === 'login' && e2.status === 401 ? 'Невірний email або пароль.' : e2.message)
    } finally {
      btn.disabled = false
    }
  })
}
