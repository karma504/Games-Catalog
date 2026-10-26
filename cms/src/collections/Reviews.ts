import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { adminOrOwner, anyone, isAdmin, loggedIn } from '../access'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: { singular: 'Відгук', plural: 'Відгуки' },
  admin: { useAsTitle: 'authorName', defaultColumns: ['game', 'authorName', 'rating', 'createdAt'] },
  defaultSort: '-createdAt',
  access: {
    read: anyone, 
    create: loggedIn, 
    update: adminOrOwner('user'),
    delete: adminOrOwner('user'),
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, context }) => {
        if (!data || operation !== 'create') return data
        const payload: any = req.payload
        const seeding = Boolean((context as any)?.seed) // демо-дані зі seed.ts
        if (!req.user && !seeding) throw new APIError('Потрібно увійти.', 401)

        if (!seeding && (!isAdmin(req.user) || !data.user)) data.user = req.user!.id

        const dup = await payload.count({
          collection: 'reviews',
          where: { and: [{ user: { equals: data.user } }, { game: { equals: data.game } }] },
          overrideAccess: true,
          req,
        })
        if (dup.totalDocs > 0) throw new APIError('Ви вже залишили відгук на цю гру.', 400)

        const author = await payload.findByID({
          collection: 'users',
          id: data.user,
          depth: 0,
          overrideAccess: true,
          req,
        })
        data.authorName = author?.firstName || 'Користувач'
        return data
      },
    ],
  },
  fields: [
    { name: 'user', label: 'Автор', type: 'relationship', relationTo: 'users', required: true, access: { update: () => false } },
    { name: 'game', label: 'Гра', type: 'relationship', relationTo: 'games', required: true, access: { update: () => false } },
    {
      name: 'rating',
      label: 'Оцінка',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      validate: (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5) || 'Оцінка — ціле число від 1 до 5',
    },
    { name: 'comment', label: 'Коментар', type: 'textarea', maxLength: 2000 },
    {
      name: 'authorName',
      label: 'Ім’я автора (для показу)',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
