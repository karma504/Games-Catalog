export function passwordError(password) {
  if (password.length < 8) return 'Пароль занадто короткий: потрібно щонайменше 8 символів.'
  if (/^\p{Nd}+$/u.test(password)) return 'Пароль не може складатися лише з цифр.'
  if (/^\p{L}+$/u.test(password)) return 'Пароль не може складатися лише з літер.'
  if (!/[\p{L}\p{N}]/u.test(password)) return 'Пароль не може складатися лише зі спеціальних символів.'
  return null
}
export const PASSWORD_HINT = 'Щонайменше 8 символів; не лише цифри, не лише літери й не поширений пароль.'
