import type { CollectionConfig } from 'payload'
import { adminOnly, anyone } from '../access'
import { blocks } from '../blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Сторінка', plural: 'Сторінки' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'path', 'updatedAt'] },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'title', label: 'Назва сторінки', type: 'text', required: true },
    {
      name: 'path',
      label: 'Адреса (напр. / або /catalog)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (v: unknown) =>
        (typeof v === 'string' && /^\/[a-z0-9\-\/]*$/.test(v)) || 'Адреса має починатися з «/» (латиниця, цифри, дефіс)',
    },
    { name: 'description', label: 'Опис для пошуковиків', type: 'textarea' },
    { name: 'layout', label: 'Блоки сторінки', type: 'blocks', blocks, required: true, minRows: 1 },
  ],
}
