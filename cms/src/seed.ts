import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '@payload-config'
import { calculateAge } from './lib/age'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(fs.readFileSync(path.resolve(dirname, 'seed-data.json'), 'utf8'))
const demo = JSON.parse(fs.readFileSync(path.resolve(dirname, 'seed-demo.json'), 'utf8'))
const withDemo = !process.argv.includes('--no-demo-users')

const payload: any = await getPayload({ config })

async function ensure(collection: string, field: string, value: any, doc: any): Promise<any> {
  const found = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (found.docs[0]) return found.docs[0]
  return payload.create({ collection, data: doc, overrideAccess: true })
}

const { totalDocs: usersCount } = await payload.count({ collection: 'users', overrideAccess: true })
if (usersCount === 0 && process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
  await payload.create({
    collection: 'users',
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, firstName: 'Адмін' },
    overrideAccess: true,
  })
  console.log('Створено адміністратора', process.env.SEED_ADMIN_EMAIL)
}

const genreIds = new Map<string, number>()
for (const g of data.genres) {
  const d = await ensure('genres', 'name', g.name, { name: g.name, description: g.description })
  genreIds.set(g.name, d.id)
}
const platformIds = new Map<string, number>()
for (const p of data.platforms) {
  const d = await ensure('platforms', 'name', p.name, { name: p.name, manufacturer: p.manufacturer })
  platformIds.set(p.name, d.id)
}
const devIds = new Map<string, number>()
for (const d of data.developers) {
  const doc = await ensure('developers', 'name', d.name, {
    name: d.name,
    city: d.city,
    country: d.country,
    foundedYear: d.foundedYear,
    website: d.website,
  })
  devIds.set(d.name, doc.id)
}

let added = 0
for (const g of data.games) {
  const exists = await payload.count({ collection: 'games', where: { title: { equals: g.title } }, overrideAccess: true })
  if (exists.totalDocs) continue
  await payload.create({
    collection: 'games',
    overrideAccess: true,
    data: {
      title: g.title,
      developer: devIds.get(g.developer),
      genres: g.genres.map((n: string) => genreIds.get(n)).filter(Boolean),
      platforms: g.platforms.map((n: string) => platformIds.get(n)).filter(Boolean),
      releaseDate: g.releaseDate ? `${g.releaseDate}T12:00:00.000Z` : undefined,
      ageRating: g.ageRating,
      fileSizeGb: g.fileSizeGb ?? undefined,
      price: g.price,
      officialUrl: g.officialUrl ?? undefined,
      imageUrl: g.imageUrl ?? undefined,
      description: g.description,
    },
  })
  added++
}
console.log(`Нових ігор: ${added}`)

await payload.updateGlobal({
  slug: 'site-settings',
  overrideAccess: true,
  data: { siteName: 'Хмарна полиця', currency: '₴', minRegistrationAge: 0 },
})
await payload.updateGlobal({
  slug: 'header',
  overrideAccess: true,
  data: {
    links: [
      { label: 'Каталог', url: '/catalog' },
      { label: 'Розробники', url: '/developers' },
      { label: 'Підбір гри', url: '/pick' },
      { label: 'Обране', url: '/wishlist', authOnly: true },
    ],
  },
})
await payload.updateGlobal({
  slug: 'footer',
  overrideAccess: true,
  data: {
    text: 'Хмарна полиця · каталог ігор',
    links: [
      { label: 'Жанри', url: '/genres' },
      { label: 'Платформи', url: '/platforms' },
    ],
  },
})

const pages = [
  {
    title: 'Головна',
    path: '/',
    layout: [
      {
        blockType: 'hero',
        heading: 'Знаходьте ігри,\nдо яких хочеться повертатися',
        text: 'Читайте відгуки, збирайте обране та добирайте гру під свій настрій і бюджет.',
        primaryLabel: 'Відкрити каталог',
        primaryLink: '/catalog',
        secondaryLabel: 'Підібрати гру',
        secondaryLink: '/pick',
      },
      { blockType: 'genreChips', title: 'Жанри', limit: 10 },
      { blockType: 'gameGrid', title: 'Найкращі за відгуками', source: 'top', limit: 4 },
      { blockType: 'gameGrid', title: 'Новинки', source: 'newest', limit: 8 },
    ],
  },
  { title: 'Каталог', path: '/catalog', layout: [{ blockType: 'catalog', title: 'Каталог' }] },
  {
    title: 'Підбір гри',
    path: '/pick',
    layout: [
      {
        blockType: 'pick',
        title: 'Підбір гри',
        text: 'Позначте, що для вас важливо, а ми підберемо відповідне. Чим більше збігів за жанрами, тим вище гра в списку.',
      },
    ],
  },
  { title: 'Розробники', path: '/developers', layout: [{ blockType: 'referenceList', kind: 'developers', title: 'Розробники' }] },
  { title: 'Жанри', path: '/genres', layout: [{ blockType: 'referenceList', kind: 'genres', title: 'Жанри' }] },
  { title: 'Платформи', path: '/platforms', layout: [{ blockType: 'referenceList', kind: 'platforms', title: 'Платформи' }] },
  { title: 'Обране', path: '/wishlist', layout: [{ blockType: 'wishlist' }] },
  { title: 'Мій профіль', path: '/profile', layout: [{ blockType: 'profile' }] },
  { title: 'Вхід', path: '/login', layout: [{ blockType: 'authForm', mode: 'login' }] },
  { title: 'Реєстрація', path: '/register', layout: [{ blockType: 'authForm', mode: 'register' }] },
]
for (const p of pages) await ensure('pages', 'path', p.path, p)
await payload.delete({
  collection: 'pages',
  where: { path: { in: ['/forgot-password', '/reset-password'] } },
  overrideAccess: true,
})

if (withDemo) {
  const DAY = 24 * 3600 * 1000
  const now = Date.now()
  const today = new Date()
  const hash = (k: string) => Array.from(k).reduce((a, c) => a + c.charCodeAt(0), 0)
  const yearsAgo = (years: number, extra: number) => {
    const d = new Date(Date.UTC(today.getUTCFullYear() - years, today.getUTCMonth(), today.getUTCDate(), 12))
    if (d.getUTCMonth() !== today.getUTCMonth()) d.setUTCDate(0)
    return new Date(d.getTime() - extra * DAY)
  }
  const minAge = (rating?: string) => {
    const n = parseInt(rating ?? '', 10)
    return Number.isFinite(n) ? n : 0
  }

  const firstSeen: Record<string, number> = {}
  for (const r of demo.reviews) firstSeen[r.user] = Math.max(firstSeen[r.user] ?? 0, r.daysAgo)
  for (const w of demo.wishes) firstSeen[w.user] = Math.max(firstSeen[w.user] ?? 0, w.daysAgo)

  const users = new Map<string, any>()
  let newUsers = 0
  for (const u of demo.users) {
    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: u.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    let doc = found.docs[0]
    if (!doc) {
      const birth: Date = demo.oldBirths[u.key]
        ? new Date(`${demo.oldBirths[u.key]}T12:00:00.000Z`)
        : yearsAgo(u.age, (hash(u.key) % 300) + 1)
      const registered = new Date(now - (( firstSeen[u.key] ?? 0) + 10 + (hash(u.key) % 30)) * DAY)
      doc = await payload.create({
        collection: 'users',
        overrideAccess: true,
        context: { seed: true },
        data: {
          email: u.email,
          password: demo.password,
          firstName: u.firstName,
          lastName: u.lastName ?? undefined,
          dateOfBirth: birth.toISOString(),
          createdAt: registered.toISOString(),
        },
      })
      newUsers++
    }
    users.set(u.key, doc)
  }

  const allGames = (await payload.find({ collection: 'games', pagination: false, depth: 0, overrideAccess: true })).docs
  const games = new Map<string, any>(allGames.map((g: any) => [g.title.toLowerCase(), g]))
  const allowed = (user: any, game: any) => {
    const age = calculateAge(user.dateOfBirth)
    return age === null || age >= minAge(game.ageRating)
  }

  let reviews = 0
  let wishes = 0
  let skipped = 0
  for (const [n, r] of demo.reviews.entries()) {
    const game = games.get(String(r.game).toLowerCase())
    const user = users.get(r.user)
    if (!game || !user || !allowed(user, game)) {
      skipped++
      continue
    }
    const exists = await payload.count({
      collection: 'reviews',
      where: { and: [{ user: { equals: user.id } }, { game: { equals: game.id } }] },
      overrideAccess: true,
    })
    if (exists.totalDocs) continue
    const when = new Date(now - r.daysAgo * DAY - ((n * 7) % 24) * 3600000 - ((n * 13) % 60) * 60000)
    await payload.create({
      collection: 'reviews',
      overrideAccess: true,
      context: { seed: true },
      data: { user: user.id, game: game.id, rating: r.rating, comment: r.comment ?? undefined, createdAt: when.toISOString() },
    })
    reviews++
  }
  for (const [n, w] of demo.wishes.entries()) {
    const game = games.get(String(w.game).toLowerCase())
    const user = users.get(w.user)
    if (!game || !user || !allowed(user, game)) {
      skipped++
      continue
    }
    const exists = await payload.count({
      collection: 'wishlist',
      where: { and: [{ user: { equals: user.id } }, { game: { equals: game.id } }] },
      overrideAccess: true,
    })
    if (exists.totalDocs) continue
    const when = new Date(now - w.daysAgo * DAY - ((n * 5) % 24) * 3600000 - ((n * 11) % 60) * 60000)
    await payload.create({
      collection: 'wishlist',
      overrideAccess: true,
      context: { seed: true },
      data: { user: user.id, game: game.id, note: w.note ?? undefined, createdAt: when.toISOString() },
    })
    wishes++
  }
  console.log(
    `Демо-дані: нових користувачів ${newUsers}, відгуків ${reviews}, записів в обраному ${wishes}` +
      (skipped ? `, пропущено ${skipped} (гра не знайдена або вікове обмеження)` : '') +
      '.',
  )
  console.log(`Пароль усіх демо-акаунтів: ${demo.password}. Приклад входу: ${demo.users[5].email}`)
}

console.log('Готово. Перевірити посилання: npm run payload -- run src/scripts/check-links.ts')
process.exit(0)
