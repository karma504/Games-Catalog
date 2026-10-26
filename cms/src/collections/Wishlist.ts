import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { adminOrOwner, isAdmin, loggedIn } from '../access'

export const Wishlist: CollectionConfig = {
  slug: 'wishlist',
  labels: { singular: 'Обране', plural: 'Обране' },
  admin: { defaultColumns: ['user', 'game', 'note', 'createdAt'] },
  defaultSort: '-createdAt',
  access: {
    read: adminOrOwner('user'), 
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
          collection: 'wishlist',
          where: { and: [{ user: { equals: data.user } }, { game: { equals: data.game } }] },
          overrideAccess: true,
          req,
        })
        if (dup.totalDocs > 0) throw new APIError('Гра вже в обраному.', 400)
        return data
      },
    ],
  },
  fields: [
    { name: 'user', label: 'Користувач', type: 'relationship', relationTo: 'users', required: true, access: { update: () => false } },
    { name: 'game', label: 'Гра', type: 'relationship', relationTo: 'games', required: true, access: { update: () => false } },
    { name: 'note', label: 'Нотатка', type: 'text', maxLength: 255 },
  ],
}
