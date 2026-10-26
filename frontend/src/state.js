import { api } from './api.js'

export const state = {
  site: { name: 'Хмарна полиця', currency: '₴' },
  header: { links: [] },
  footer: { text: '', links: [] },
  user: null,
  age: { limit: null, isGuest: true },
  wishes: {}, // gameId -> wishlist record id
}

export async function loadCommon() {
  Object.assign(state, await api.get('/common'))
}
