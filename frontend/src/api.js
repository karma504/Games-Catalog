// Тонкий клієнт до Payload. Cookie входу передаються автоматично (credentials: 'include').
const BASE = import.meta.env.VITE_API_URL || ''

function errorMessage(data) {
  const e = data?.errors?.[0]
  if (!e) return data?.message || data?.error || 'Щось пішло не так'
  const inner = e.data?.errors?.map((x) => x.message).filter(Boolean)
  return inner?.length ? inner.join(' ') : e.message
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* порожня відповідь */
  }
  if (!res.ok) {
    const err = new Error(errorMessage(data))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
}
