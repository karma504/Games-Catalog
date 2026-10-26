import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdmin } from '../access'
import { calculateAge, getSiteSettings } from '../lib/age'
import { passwordError } from '../lib/validators'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Користувач', plural: 'Користувачі' },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'dateOfBirth', 'roles'],
  },
  access: {
    admin: ({ req }) => isAdmin(req.user),
    create: () => true,
    read: ({ req }) => {
      if (!req.user) return false
      return isAdmin(req.user) ? true : { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      return isAdmin(req.user) ? true : { id: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return isAdmin(req.user) ? true : { id: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, context }) => {
        if (!data) return data
        const payload: any = req.payload
        const seeding = Boolean((context as any)?.seed)

        if (data.password) {
          const bad = passwordError(String(data.password))
          if (bad) throw new APIError(bad, 400)
        }

        if (data.dateOfBirth) {
          const age = calculateAge(data.dateOfBirth)
          if (age === null || new Date(data.dateOfBirth) > new Date()) {
            throw new APIError('Дата народження не може бути в майбутньому.', 400)
          }
          if (age > 120) throw new APIError('Перевірте дату народження.', 400)
        }

        if (operation === 'create') {
          const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
          if (totalDocs === 0) {
            data.roles = ['admin']
          } else if (!isAdmin(req.user)) {
            data.roles = ['user']
            const settings = await getSiteSettings(payload)
            const min = seeding ? 0 : Number(settings.minRegistrationAge ?? 0)
            if (min > 0) {
              const age = calculateAge(data.dateOfBirth)
              if (age === null || age < min) {
                throw new APIError(`Реєстрація доступна з ${min} років. Вкажіть дату народження.`, 400)
              }
            }
          }
        } else if (!isAdmin(req.user)) {
          delete data.roles
        }
        return data
      },
    ],
    beforeDelete: [

      async ({ req, id }) => {
        const payload: any = req.payload
        for (const collection of ['reviews', 'wishlist']) {
          await payload.delete({
            collection,
            where: { user: { equals: id } },
            overrideAccess: true,
            req,
          })
        }
      },
    ],
  },
  fields: [
    { name: 'firstName', label: 'Ім’я', type: 'text', maxLength: 100 },
    { name: 'lastName', label: 'Прізвище', type: 'text', maxLength: 100 },
    {
      name: 'dateOfBirth',
      label: 'Дата народження',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'roles',
      label: 'Ролі',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Адміністратор', value: 'admin' },
        { label: 'Користувач', value: 'user' },
      ],
      defaultValue: ['user'],
      saveToJWT: true,
    },
  ],
}
