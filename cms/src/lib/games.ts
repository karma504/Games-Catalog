import { isAdmin } from '../access'
import { allowedRatings, ageFor, canSeeUnrated, getSiteSettings } from './age'

export function safeHttpLink(value?: string | null): string {
  const v = (value ?? '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (/^[a-z][a-z0-9+.\-]*:/i.test(v)) return ''
  return 'https://' + v
}

export const hue = (title: string) =>
  185 + (Array.from(title).reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0) % 50)

export function priceLabel(price: number | null | undefined, currency = '₴') {
  if (price === null || price === undefined) return 'Ціну не вказано'
  if (price === 0) return 'Безкоштовно'
  return `${Number(price).toFixed(2)} ${currency}`
}

export async function ageWhere(req: any): Promise<any> {
  if (isAdmin(req.user)) return true
  const age = await ageFor(req)
  if (age === null) return true
  const or: any[] = [{ ageRating: { in: allowedRatings(age) } }]
  if (canSeeUnrated(age)) or.push({ ageRating: { exists: false } })
  return { or }
}

export async function loadRatings(payload: any): Promise<Map<number, { avg: number; votes: number }>> {
  const res = await payload.find({
    collection: 'reviews',
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { rating: true, game: true },
  })
  const sums = new Map<number, { s: number; n: number }>()
  for (const r of res.docs) {
    const gid = typeof r.game === 'object' ? r.game?.id : r.game
    const cur = sums.get(gid) ?? { s: 0, n: 0 }
    cur.s += r.rating
    cur.n += 1
    sums.set(gid, cur)
  }
  const out = new Map<number, { avg: number; votes: number }>()
  sums.forEach((v, k) => out.set(k, { avg: Math.round((v.s / v.n) * 100) / 100, votes: v.n }))
  return out
}

export function toGameDTO(doc: any, ratings: Map<number, { avg: number; votes: number }>, currency: string) {
  const r = ratings.get(doc.id)
  const dev = doc.developer && typeof doc.developer === 'object' ? doc.developer : null
  const pick = (arr: any[]) =>
    (arr ?? []).filter((x) => x && typeof x === 'object').map((x) => ({ id: x.id, name: x.name }))
  return {
    id: doc.id,
    title: doc.title,
    developer: dev ? { id: dev.id, name: dev.name } : null,
    genres: pick(doc.genres),
    platforms: pick(doc.platforms),
    releaseDate: doc.releaseDate ? String(doc.releaseDate).slice(0, 10) : null,
    ageRating: doc.ageRating ?? null,
    fileSizeGb: doc.fileSizeGb ?? null,
    price: doc.price ?? null,
    priceLabel: priceLabel(doc.price, currency),
    officialUrl: safeHttpLink(doc.officialUrl),
    imageUrl: safeHttpLink(doc.imageUrl),
    description: doc.description ?? '',
    hue: hue(doc.title),
    avg: r?.avg ?? null,
    votes: r?.votes ?? 0,
  }
}

export type FindOpts = {
  q?: string
  genres?: number[]
  platforms?: number[]
  dev?: number
  age?: string
  priceMin?: number
  priceMax?: number
  free?: boolean
  maxSize?: number
  minRating?: number
  sort?: string
  page?: number
  perPage?: number
  pick?: boolean
}

const byTitle = (a: any, b: any) => a.title.localeCompare(b.title, 'uk')
const nullsLast = (x: number | null | undefined, y: number | null | undefined, dir: 1 | -1) => {
  const nx = x == null || Number.isNaN(x)
  const ny = y == null || Number.isNaN(y)
  if (nx && ny) return 0
  if (nx) return 1
  if (ny) return -1
  return ((x as number) - (y as number)) * dir
}

export async function findGames(req: any, o: FindOpts = {}) {
  const payload: any = req.payload
  const settings = await getSiteSettings(payload)
  const and: any[] = []
  if (o.q) and.push({ or: [{ title: { contains: o.q } }, { 'developer.name': { contains: o.q } }] })
  if (o.genres?.length) and.push({ genres: { in: o.genres } })
  if (o.platforms?.length) and.push({ platforms: { in: o.platforms } })
  if (o.dev) and.push({ developer: { equals: o.dev } })
  if (o.age) and.push({ ageRating: { equals: o.age } })
  if (o.free) and.push({ price: { equals: 0 } })
  if (o.priceMin != null) and.push({ price: { greater_than_equal: o.priceMin } })
  if (o.priceMax != null) and.push({ price: { less_than_equal: o.priceMax } })
  if (o.maxSize != null) and.push({ fileSizeGb: { less_than_equal: o.maxSize } })

  const res = await payload.find({
    collection: 'games',
    where: and.length ? { and } : undefined,
    depth: 1,
    pagination: false,
    req,
    overrideAccess: false,
  })
  const ratings = await loadRatings(payload)
  const currency = settings.currency || '₴'
  let items: any[] = res.docs.map((d: any) => toGameDTO(d, ratings, currency))

  if (o.minRating) items = items.filter((g) => g.avg != null && g.avg >= o.minRating!)

  if (o.pick) {
    const sel = new Set(o.genres ?? [])
    items.forEach((g) => (g.match = g.genres.filter((x: any) => sel.has(x.id)).length))
    items.sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || nullsLast(b.avg, a.avg, 1) || byTitle(a, b))
  } else {
    const d = (s: string | null) => (s ? Date.parse(s) : NaN)
    const sorters: Record<string, (a: any, b: any) => number> = {
      new: (a, b) => nullsLast(d(b.releaseDate), d(a.releaseDate), 1) || byTitle(a, b),
      old: (a, b) => nullsLast(d(a.releaseDate), d(b.releaseDate), 1) || byTitle(a, b),
      rating: (a, b) => nullsLast(b.avg, a.avg, 1) || b.votes - a.votes || byTitle(a, b),
      cheap: (a, b) => nullsLast(a.price, b.price, 1) || byTitle(a, b),
      pricey: (a, b) => nullsLast(b.price, a.price, 1) || byTitle(a, b),
      title: byTitle,
    }
    items.sort(sorters[o.sort ?? 'new'] ?? sorters.new)
  }

  const total = items.length
  const perPage = o.perPage ?? 12
  const page = Math.max(o.page ?? 1, 1)
  const pages = Math.max(Math.ceil(total / perPage), 1)
  return { items: items.slice((page - 1) * perPage, page * perPage), total, page, pages }
}
