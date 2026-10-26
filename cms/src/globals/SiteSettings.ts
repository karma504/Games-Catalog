import type { GlobalConfig } from 'payload'
import { adminOnly, anyone } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Налаштування сайту',
  access: { read: anyone, update: adminOnly },
  fields: [
    { name: 'siteName', label: 'Назва сайту', type: 'text', defaultValue: 'Хмарна полиця', required: true },
    { name: 'currency', label: 'Валюта', type: 'text', defaultValue: '₴', required: true },
    {
      name: 'guestAgeLimit',
      label: 'Віковий ліміт для гостей (років)',
      type: 'number',
      min: 0,
      max: 99,
      admin: { description: 'Порожньо = гості бачать усе. Той самий GUEST_AGE_LIMIT, що був у Django.' },
    },
    {
      name: 'minRegistrationAge',
      label: 'Мінімальний вік для реєстрації',
      type: 'number',
      min: 0,
      max: 99,
      defaultValue: 0,
      admin: { description: '0 = без обмежень (MIN_REGISTRATION_AGE у Django).' },
    },
  ],
}
