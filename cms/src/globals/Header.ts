import type { GlobalConfig } from 'payload'
import { adminOnly, anyone } from '../access'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Шапка',
  access: { read: anyone, update: adminOnly },
  fields: [
    {
      name: 'links',
      label: 'Меню',
      type: 'array',
      fields: [
        { name: 'label', label: 'Текст', type: 'text', required: true },
        { name: 'url', label: 'Адреса', type: 'text', required: true },
        { name: 'authOnly', label: 'Лише для вхідних користувачів', type: 'checkbox', defaultValue: false },
        { name: 'adminOnly', label: 'Лише для адміністраторів', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
