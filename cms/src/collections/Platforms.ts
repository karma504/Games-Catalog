import type { CollectionConfig } from 'payload'
import { adminOnly, anyone } from '../access'

export const Platforms: CollectionConfig = {
  slug: 'platforms',
  labels: { singular: 'Платформа', plural: 'Платформи' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'manufacturer'] },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'name', label: 'Платформа', type: 'text', required: true, unique: true, maxLength: 100 },
    { name: 'manufacturer', label: 'Виробник', type: 'text', maxLength: 100 },
  ],
}
