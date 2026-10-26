import type { CollectionConfig } from 'payload'
import { adminOnly, anyone } from '../access'

export const Genres: CollectionConfig = {
  slug: 'genres',
  labels: { singular: 'Жанр', plural: 'Жанри' },
  admin: { useAsTitle: 'name' },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'name', label: 'Жанр', type: 'text', required: true, unique: true, maxLength: 100 },
    { name: 'description', label: 'Опис', type: 'textarea' },
  ],
}
