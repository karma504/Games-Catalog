import type { Access, Where } from 'payload'

export const isAdmin = (user: any): boolean => Boolean(user?.roles?.includes('admin'))

export const anyone: Access = () => true
export const adminOnly: Access = ({ req }) => isAdmin(req.user)
export const loggedIn: Access = ({ req }) => Boolean(req.user)

export const adminOrOwner =
  (field: string = 'user'): Access =>
  ({ req }) => {
    if (!req.user) return false
    if (isAdmin(req.user)) return true
    return { [field]: { equals: req.user.id } } as Where
  }
