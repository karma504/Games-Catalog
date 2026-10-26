import type { GlobalConfig } from 'payload'
import { adminOnly, anyone } from '../access'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Футер',
  access: { read: anyone, update: adminOnly },
  fields: [
    { name: 'text', label: 'Текст', type: 'text', defaultValue: 'Хмарна полиця · каталог ігор' },
    {
      name: 'links',
      label: 'Посилання',
      type: 'array',
      fields: [
        { name: 'label', label: 'Текст', type: 'text', required: true },
        { name: 'url', label: 'Адреса', type: 'text', required: true },
      ],
    },
  ],
}
