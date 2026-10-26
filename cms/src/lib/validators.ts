export const httpUrl = (value?: string | null) => {
  if (!value) return true
  const v = value.trim()
  if (/^[a-z][a-z0-9+.\-]*:/i.test(v) && !/^https?:\/\//i.test(v)) return 'Дозволені лише http/https посилання'
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    return Boolean(u.hostname.includes('.')) || 'Невірне посилання'
  } catch {
    return 'Невірне посилання'
  }
}

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'qwerty123', 'qwertyuiop', 'qwerty12', '12345678', '123456789',
  '1234567890', '11111111', '00000000', 'iloveyou', 'admin123', 'welcome1', 'abc12345', 'letmein1',
  'passw0rd', 'p@ssw0rd', 'qwerty1234', '1q2w3e4r', '1qaz2wsx', 'zaq12wsx', 'monkey123', 'dragon123',
  'football1', 'sunshine1', 'princess1', 'master123', 'login123', 'user1234', 'test1234', 'changeme',
])

export function passwordError(password: string): string | null {
  if (password.length < 8) return 'Пароль занадто короткий: потрібно щонайменше 8 символів.'
  if (/^\p{Nd}+$/u.test(password)) return 'Пароль не може складатися лише з цифр.'
  if (/^\p{L}+$/u.test(password)) return 'Пароль не може складатися лише з літер.'
  if (!/[\p{L}\p{N}]/u.test(password)) return 'Пароль не може складатися лише зі спеціальних символів.'
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'Цей пароль занадто поширений.'
  return null
}

export function amountValidator(subject: string, max: number, maxLabel: string) {
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') return true
    const n = Number(value)
    if (!Number.isFinite(n)) return `${subject} — це число.`
    if (n < 0) return `${subject} не може бути від’ємним. Введіть 0 або більше.`
    if (Math.round(n * 100) / 100 !== n) return 'Після коми потрібно не більше двох цифр, наприклад 19,99.'
    if (n > max) return `Забагато: максимум — ${maxLabel}.`
    return true
  }
}
export const priceValidator = amountValidator('Ціна', 99_999_999.99, '99 999 999,99')
export const sizeValidator = amountValidator('Розмір', 9_999.99, '9 999,99 ГБ')
