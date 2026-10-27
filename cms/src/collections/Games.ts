import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { adminOnly } from '../access'
import { AGE_CHOICES } from '../lib/age'
import { ageWhere } from '../lib/games'
import { httpUrl, priceValidator, sizeValidator } from '../lib/validators'

export const Games: CollectionConfig = {
  slug: 'games',
  labels: { singular: 'Гра', plural: 'Ігри' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'developer', 'price', 'releaseDate', 'ageRating', 'fileSizeGb'],
  },
  defaultSort: 'title',
  access: {
    
    read: async ({ req }) => ageWhere(req),
    create: adminOnly, 
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data || typeof data.title !== 'string') return data
        data.title = data.title.split(/\s+/).filter(Boolean).join(' ') 
        const found = await (req.payload as any).find({
          collection: 'games',
          where: { title: { like: data.title } },
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        })
        const same = found.docs.some(
          (d: any) => d.title.toLowerCase() === data.title!.toLowerCase() && d.id !== originalDoc?.id,
        )
        if (same) throw new APIError('Гра з такою назвою вже є в каталозі.', 400)
        return data
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        for (const collection of ['reviews', 'wishlist']) {
          await (req.payload as any).delete({
            collection,
            where: { game: { equals: id } },
            overrideAccess: true,
            req,
          })
        }
      },
    ],
  },
  fields: [
    { name: 'title', label: 'Назва', type: 'text', required: true, maxLength: 200 },
    { name: 'developer', label: 'Розробник', type: 'relationship', relationTo: 'developers' },
    { name: 'genres', label: 'Жанри', type: 'relationship', relationTo: 'genres', hasMany: true },
    { name: 'platforms', label: 'Платформи', type: 'relationship', relationTo: 'platforms', hasMany: true },
    {
      type: 'row',
      fields: [
        {
          name: 'releaseDate',
          label: 'Дата виходу',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'ageRating',
          label: 'Віковий рейтинг',
          type: 'select',
          options: AGE_CHOICES.map((c) => ({ label: c, value: c })),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fileSizeGb', label: 'Розмір, ГБ', type: 'number', min: 0, validate: sizeValidator },
        { name: 'price', label: 'Ціна', type: 'number', min: 0, validate: priceValidator },
      ],
    },
    { name: 'officialUrl', label: 'Офіційний сайт', type: 'text', maxLength: 500, validate: httpUrl },
    { name: 'imageUrl', label: 'Посилання на зображення', type: 'text', maxLength: 500, validate: httpUrl },
    { name: 'description', label: 'Опис', type: 'textarea' },
  ],
}
