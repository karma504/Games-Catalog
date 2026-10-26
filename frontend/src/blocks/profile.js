import { api } from '../api.js'
import { loadCommon, state } from '../state.js'
import { navigate } from '../router.js'
import { confirmDialog, esc, flash, flashNext, fmtDate } from '../ui.js'

const RATINGS = [0, 3, 6, 7, 12, 16, 18]
const maxRating = (age) => {
  const r = RATINGS.filter((n) => n <= age)
  return r.length ? `${r[r.length - 1]}+` : '—'
}

export function render() {
  if (!state.user) return '<p class="panel">Увійдіть, щоб побачити профіль. <a href="/login?next=/profile">Увійти</a></p>'
  return '<section class="profile-page" data-profile></section>'
}

export function mount(el) {
  const root = el.querySelector('[data-profile]')
  if (!root) return
  const edit = new URLSearchParams(location.search).get('edit')
  view(root, edit === 'profile' || edit === 'password' ? edit : null)
}

function view(root, editing) {
  const u = state.user
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
  const today = new Date().toISOString().slice(0, 10)

  let available
  if (u.age != null) available = `рейтинг до ${maxRating(u.age)}`
  else if (state.age.limit == null) available = 'усі ігри'
  else available = `рейтинг до ${maxRating(state.age.limit)} <span class="muted small">— вкажіть дату народження, щоб побачити більше</span>`

  root.innerHTML = `
  <header class="profile-header">
    <div class="profile-avatar" aria-hidden="true">${esc((u.firstName || u.email).slice(0, 1).toUpperCase())}</div>
    <div><h1>${esc(name)}</h1><p>${esc(u.email)}</p></div>
  </header>

  <div class="panel profile-card" id="personal">
    <div class="card-head"><div><h2>Особисті дані</h2><p class="panel-description">Інформація вашого профілю</p></div>
      ${editing !== 'profile' ? '<button type="button" class="btn ghost small" data-edit="profile">Редагувати профіль</button>' : ''}</div>
    ${
      editing === 'profile'
        ? `<form data-form="profile" novalidate>
            <div data-error></div>
            <div class="field"><label>Ім’я</label><input name="firstName" value="${esc(u.firstName)}" maxlength="100"></div>
            <div class="field"><label>Прізвище</label><input name="lastName" value="${esc(u.lastName)}" maxlength="100"></div>
            <div class="field"><label>Дата народження</label><input type="date" name="dateOfBirth" value="${esc(u.dateOfBirth || '')}" max="${today}"></div>
            <div class="hrow"><button class="btn">Зберегти зміни</button><button type="button" class="btn ghost" data-edit="">Скасувати</button></div>
          </form>`
        : `<dl class="info-list">
            <div><dt>Ім’я</dt><dd>${esc(u.firstName || 'Не вказано')}</dd></div>
            <div><dt>Прізвище</dt><dd>${esc(u.lastName || 'Не вказано')}</dd></div>
            <div><dt>Email</dt><dd>${esc(u.email)}</dd></div>
            <div><dt>Дата народження</dt><dd>${u.dateOfBirth ? `${fmtDate(u.dateOfBirth + 'T12:00:00Z')} (${u.age} р.)` : 'Не вказано'}</dd></div>
            <div><dt>Доступні ігри</dt><dd>${available}</dd></div>
            <div><dt>У нас з</dt><dd>${fmtDate(u.createdAt)}</dd></div>
          </dl>`
    }
  </div>

  <div class="panel profile-card" id="security">
    <div class="card-head"><div><h2>Безпека</h2><p class="panel-description">Пароль захищає ваш акаунт</p></div>
      ${editing !== 'password' ? '<button type="button" class="btn ghost small" data-edit="password">Змінити пароль</button>' : ''}</div>
    ${
      editing === 'password'
        ? `<form data-form="password" novalidate>
            <div data-error></div>
            <div class="field"><label>Новий пароль</label><input type="password" name="p1" autocomplete="new-password" required></div>
            <div class="field"><label>Повторіть пароль</label><input type="password" name="p2" autocomplete="new-password" required></div>
            <div class="hrow"><button class="btn">Змінити пароль</button><button type="button" class="btn ghost" data-edit="">Скасувати</button></div>
          </form>`
        : '<p class="muted">Пароль приховано. Натисніть «Змінити пароль», щоб оновити його.</p>'
    }
  </div>

  <div class="panel account-card">
    <div><h2>Керування акаунтом</h2><p class="panel-description">Вихід із профілю або видалення облікового запису</p></div>
    <div class="account-actions">
      <button type="button" class="btn ghost" data-logout>Вийти з акаунта</button>
      <button type="button" class="btn danger" data-delete>Видалити акаунт</button>
    </div>
  </div>`

  root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => view(root, b.dataset.edit || null)))

  const fail = (form, text) => (form.querySelector('[data-error]').innerHTML = `<div class="msg error" role="alert">${esc(text)}</div>`)

  root.querySelector('[data-form=profile]')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = e.target
    const v = Object.fromEntries(new FormData(f))
    try {
      await api.patch(`/users/${u.id}`, {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        dateOfBirth: v.dateOfBirth ? `${v.dateOfBirth}T12:00:00.000Z` : null,
      })
      await loadCommon()
      view(root, null)
      flash('Зміни збережено.')
    } catch (err) {
      fail(f, err.message)
    }
  })

  root.querySelector('[data-form=password]')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = e.target
    const { p1, p2 } = Object.fromEntries(new FormData(f))
    if (p1 !== p2) return fail(f, 'Паролі не збігаються.')
    try {
      await api.patch(`/users/${u.id}`, { password: p1 })
      await loadCommon()
      if (!state.user) {
        flashNext('Пароль змінено. Увійдіть знову.')
        return navigate('/login')
      }
      view(root, null)
      flash('Пароль змінено.')
    } catch (err) {
      fail(f, err.message)
    }
  })

  root.querySelector('[data-logout]').addEventListener('click', async () => {
    await api.post('/users/logout').catch(() => {})
    await loadCommon()
    navigate('/')
  })

  root.querySelector('[data-delete]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Видалити акаунт?',
      text: 'Усі ваші відгуки та обране буде видалено безповоротно.',
      yes: 'Так, видалити',
    })
    if (!ok) return
    try {
      await api.del(`/users/${u.id}`)
      await api.post('/users/logout').catch(() => {})
      await loadCommon()
      flashNext('Акаунт видалено.')
      navigate('/')
    } catch (err) {
      flash(err.message, 'error')
    }
  })
}
