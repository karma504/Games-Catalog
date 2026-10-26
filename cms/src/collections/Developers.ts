import type { CollectionConfig } from 'payload'
import { adminOnly, anyone } from '../access'
import { httpUrl } from '../lib/validators'

export const Developers: CollectionConfig = {
  slug: 'developers',
  labels: { singular: 'Розробник', plural: 'Розробники' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'country', 'city', 'foundedYear'] },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'name', label: 'Назва', type: 'text', required: true, maxLength: 255 },
    { name: 'foundedYear', label: 'Рік заснування', type: 'number', min: 1950, max: 2100 },
    { name: 'city', label: 'Місто', type: 'text', maxLength: 100 },
    { name: 'country', label: 'Країна', type: 'text', maxLength: 100 },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'website', label: 'Сайт', type: 'text', maxLength: 255, validate: httpUrl },
  ],
}
