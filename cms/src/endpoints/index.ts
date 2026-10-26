import type { Endpoint } from 'payload'
import { isAdmin } from '../access'
import { AGE_CHOICES, ageFor, allowedRatings, calculateAge, getSiteSettings } from '../lib/age'
import { findGames, loadRatings, safeHttpLink, toGameDTO } from '../lib/games'

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

const params = (req: any) => new URL(req.url as string).searchParams
const id = (v: any) => (v && typeof v === 'object' ? v.id : v)

export const common: Endpoint = {
  path: '/common',
  method: 'get',
  handler: async (req) => {
    const payload: any = req.payload
    const settings = await getSiteSettings(payload)
    const [header, footer] = await Promise.all(
      ['header', 'footer'].map((slug) => payload.findGlobal({ slug, depth: 0, overrideAccess: true })),
    )

    const wishes: Record<string, number> = {}
    if (req.user) {
      const w = await payload.find({
        collection: 'wishlist',
        where: { user: { equals: req.user.id } },
        pagination: false,
        depth: 0,
        req,
        overrideAccess: false,
      })
      w.docs.forEach((d: any) => (wishes[id(d.game)] = d.id))
    }

    const u: any = req.user
    const limit = await ageFor(req)
    return json({
      site: { name: settings.siteName || 'Хмарна полиця', currency: settings.currency || '₴' },
      header: { links: header?.links ?? [] },
      footer: { text: footer?.text ?? '', links: footer?.links ?? [] },
      user: u
        ? {
            id: u.id,
            email: u.email,
            firstName: u.firstName ?? '',
            lastName: u.lastName ?? '',
            dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : null,
            createdAt: u.createdAt,
            age: calculateAge(u.dateOfBirth),
            isAdmin: isAdmin(u),
          }
        : null,
      age: { limit, isGuest: !u || !u.dateOfBirth },
      wishes,
    })
  },
}

export const games: Endpoint = {
  path: '/games',
  method: 'get',
  handler: async (req) => {
    const sp = params(req)
    const errors: Record<string, string> = {}

    const num = (name: string): number | undefined => {
      const raw = (sp.get(name) ?? '').trim().replace(',', '.')
      if (!raw) return undefined
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) {
        errors[name] = 'Вкажіть невід’ємне число.'
        return undefined
      }
      return n
    }
    const ids = (name: string) =>
      sp.getAll(name).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n))

    const age = (sp.get('age') ?? '').trim()
    if (age && !allowedRatings(await ageFor(req)).includes(age)) errors.age = 'Недоступний віковий рейтинг.'

    const pick = sp.get('pick') === '1'
    const priceMin = num('price_min')
    const priceMax = num('price_max') ?? num('max_price')
    if (priceMin != null && priceMax != null && priceMin > priceMax) errors.price_max = 'Максимум менший за мінімум.'
    const maxSize = num('max_size')
    const minRating = parseInt(sp.get('min_rating') ?? '0', 10) || 0
    if (minRating < 0 || minRating > 5) errors.min_rating = 'Оцінка від 0 до 5.'

    if (Object.keys(errors).length) return json({ errors }, 400)

    const result = await findGames(req, {
      q: (sp.get('q') ?? '').trim() || undefined,
      genres: ids('genre'),
      platforms: ids('platform'),
      dev: ids('dev')[0],
      age: age || undefined,
      priceMin,
      priceMax,
      free: sp.get('free') === '1',
      maxSize,
      minRating: minRating || undefined,
      sort: sp.get('sort') ?? 'new',
      page: parseInt(sp.get('page') ?? '1', 10) || 1,
      perPage: pick ? 24 : 12,
      pick,
    })
    return json(result)
  },
}

const everyVisible = (req: any, extra: any = {}) => findGames(req, { perPage: 100000, ...extra })

async function listFilters(req: any) {
  const payload: any = req.payload
  const find = (collection: string, sort: string) =>
    payload.find({ collection, pagination: false, depth: 0, sort, overrideAccess: true })
  const [genres, platforms, developers] = await Promise.all([
    find('genres', 'name'),
    find('platforms', 'name'),
    find('developers', 'name'),
  ])
  const slim = (r: any) => r.docs.map((d: any) => ({ id: d.id, name: d.name }))
  return {
    genres: slim(genres),
    platforms: slim(platforms),
    developers: slim(developers),
    ages: allowedRatings(await ageFor(req)),
  }
}

async function enrich(req: any, b: any): Promise<any> {
  const payload: any = req.payload
  const { id: _id, blockName: _bn, blockType, ...fields } = b
  const block: any = { type: blockType, ...fields }

  switch (blockType) {
    case 'gameGrid': {
      const r = await findGames(req, { sort: fields.source === 'top' ? 'rating' : 'new', perPage: fields.limit || 8 })
      block.games = fields.source === 'top' ? r.items.filter((g: any) => g.votes > 0) : r.items
      break
    }
    case 'genreChips': {
      const all = (await everyVisible(req)).items
      const counts = new Map<number, { id: number; name: string; n: number }>()
      all.forEach((g: any) =>
        g.genres.forEach((x: any) => {
          const c = counts.get(x.id) ?? { id: x.id, name: x.name, n: 0 }
          c.n += 1
          counts.set(x.id, c)
        }),
      )
      block.genres = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, fields.limit || 10)
      block.total = all.length
      break
    }
    case 'catalog':
      block.filters = await listFilters(req)
      break
    case 'pick':
      block.filters = await listFilters(req)
      break
    case 'referenceList': {
      const all = (await everyVisible(req)).items
      const kind = fields.kind as 'developers' | 'genres' | 'platforms'
      const docs = (
        await payload.find({ collection: kind, pagination: false, depth: 0, sort: 'name', overrideAccess: true })
      ).docs
      block.items = docs.map((d: any) => {
        const n = all.filter((g: any) =>
          kind === 'developers' ? g.developer?.id === d.id : g[kind].some((x: any) => x.id === d.id),
        ).length
        return {
          id: d.id,
          name: d.name,
          sub: kind === 'developers' ? [d.country, d.foundedYear ? `з ${d.foundedYear}` : ''].filter(Boolean).join(' · ') : '',
          n,
          href: `/${kind}/${d.id}`,
        }
      })
      break
    }
    case 'wishlist': {
      if (!req.user) {
        block.requiresLogin = true
        break
      }
      const w = await payload.find({
        collection: 'wishlist',
        where: { user: { equals: req.user.id } },
        pagination: false,
        depth: 2,
        sort: '-createdAt',
        req,
        overrideAccess: false,
      })
      const ratings = await loadRatings(payload)
      const settings = await getSiteSettings(payload)
      block.items = w.docs
        .filter((d: any) => d.game && typeof d.game === 'object')
        .map((d: any) => ({ wishId: d.id, note: d.note ?? '', game: toGameDTO(d.game, ratings, settings.currency || '₴') }))
      break
    }
  }
  return block
}

const noStore = (status: number, error: string) => json({ error }, status)

async function gameFormPage(req: any, editId: number | null) {
  const payload: any = req.payload
  const filters = await listFilters(req)
  const base = { type: 'gameForm', mode: editId ? 'edit' : 'create', filters: { ...filters, ages: [...AGE_CHOICES] } }

  if (!req.user) return { meta: { title: 'Додати гру', description: '' }, blocks: [{ ...base, requiresLogin: true }] }
  if (editId) {
    if (!isAdmin(req.user)) return 'forbidden'
    const doc = await payload
      .findByID({ collection: 'games', id: editId, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!doc) return 'not_found'
    const rel = (v: any) => (v && typeof v === 'object' ? v.id : v)
    const game = {
      id: doc.id,
      title: doc.title,
      developer: rel(doc.developer) ?? null,
      genres: (doc.genres ?? []).map(rel),
      platforms: (doc.platforms ?? []).map(rel),
      releaseDate: doc.releaseDate ? String(doc.releaseDate).slice(0, 10) : '',
      ageRating: doc.ageRating ?? '',
      fileSizeGb: doc.fileSizeGb ?? '',
      price: doc.price ?? '',
      officialUrl: doc.officialUrl ?? '',
      imageUrl: doc.imageUrl ?? '',
      description: doc.description ?? '',
    }
    return { meta: { title: `Редагувати: ${doc.title}`, description: '' }, blocks: [{ ...base, game }] }
  }
  return { meta: { title: 'Додати гру', description: '' }, blocks: [base] }
}

async function reviewListPage(req: any) {
  if (!isAdmin(req.user)) return 'forbidden'
  const res = await req.payload.find({
    collection: 'reviews',
    pagination: false,
    depth: 1,
    sort: '-createdAt',
    overrideAccess: true,
  })
  const items = res.docs.map((r: any) => ({
    id: r.id,
    author: r.authorName || 'Користувач',
    email: r.user && typeof r.user === 'object' ? r.user.email : '',
    game: r.game && typeof r.game === 'object' ? { id: r.game.id, title: r.game.title } : null,
    rating: r.rating,
    comment: r.comment ?? '',
    date: r.createdAt,
  }))
  return { meta: { title: 'Відгуки', description: '' }, blocks: [{ type: 'reviewList', items }] }
}

async function reviewDetailPage(req: any, reviewId: number) {
  const payload: any = req.payload
  const r = await payload
    .findByID({ collection: 'reviews', id: reviewId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!r) return 'not_found'
  const gameId = typeof r.game === 'object' ? r.game?.id : r.game
  const visible = await payload.find({
    collection: 'games',
    where: { id: { equals: gameId } },
    depth: 0,
    limit: 1,
    req,
    overrideAccess: false,
  })
  const game = visible.docs[0]
  if (!game) return 'not_found'
  const uid = typeof r.user === 'object' ? r.user?.id : r.user
  return {
    meta: { title: `Відгук на «${game.title}»`, description: '' },
    blocks: [
      {
        type: 'reviewDetail',
        review: {
          id: r.id,
          author: r.authorName || 'Користувач',
          rating: r.rating,
          comment: r.comment ?? '',
          date: r.createdAt,
          mine: Boolean(req.user) && uid === req.user.id,
        },
        game: { id: game.id, title: game.title },
        canModerate: isAdmin(req.user),
      },
    ],
  }
}

async function resolveDynamic(req: any, path: string) {
  const payload: any = req.payload
  if (path === '/games/add') return 'not_found'
  const edit = path.match(/^\/games\/(\d+)\/edit$/)
  if (edit) return gameFormPage(req, Number(edit[1]))
  if (path === '/reviews') return reviewListPage(req)
  const rv1 = path.match(/^\/reviews\/(\d+)$/)
  if (rv1) return reviewDetailPage(req, Number(rv1[1]))

  const m = path.match(/^\/(games|developers|genres|platforms)\/(\d+)$/)
  if (!m) return null
  const [, kind, rawId] = m
  const num = Number(rawId)

  if (kind === 'games') {
    const res = await payload.find({
      collection: 'games',
      where: { id: { equals: num } },
      depth: 1,
      limit: 1,
      req,
      overrideAccess: false,
    })
    const doc = res.docs[0]
    if (!doc) return 'not_found'
    const settings = await getSiteSettings(payload)
    const game = toGameDTO(doc, await loadRatings(payload), settings.currency || '₴')
    const rv = await payload.find({
      collection: 'reviews',
      where: { game: { equals: num } },
      pagination: false,
      depth: 0,
      sort: '-createdAt',
      overrideAccess: true,
    })
    const reviews = rv.docs.map((r: any) => ({
      id: r.id,
      author: r.authorName || 'Користувач',
      rating: r.rating,
      comment: r.comment ?? '',
      date: r.createdAt,
      mine: Boolean(req.user) && id(r.user) === req.user!.id,
    }))
    let wishId: number | null = null
    if (req.user) {
      const w = await payload.find({
        collection: 'wishlist',
        where: { and: [{ user: { equals: req.user.id } }, { game: { equals: num } }] },
        depth: 0,
        limit: 1,
        req,
        overrideAccess: false,
      })
      wishId = w.docs[0]?.id ?? null
    }
    return {
      meta: { title: game.title, description: game.description.slice(0, 160) },
      blocks: [{ type: 'gameDetail', game, reviews, wishId, canModerate: isAdmin(req.user), canManage: isAdmin(req.user) }],
    }
  }

  const doc = await payload
    .findByID({ collection: kind, id: num, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!doc) return 'not_found'
  const list = await findGames(req, {
    perPage: 1000,
    ...(kind === 'developers' ? { dev: num } : kind === 'genres' ? { genres: [num] } : { platforms: [num] }),
  })
  const label = { developers: 'Розробник', genres: 'Жанр', platforms: 'Платформа' }[kind as string]
  return {
    meta: { title: doc.name, description: '' },
    blocks: [
      {
        type: 'referenceDetail',
        label,
        name: doc.name,
        subtitle:
          kind === 'developers'
            ? [doc.country, doc.city, doc.foundedYear ? `заснована у ${doc.foundedYear}` : ''].filter(Boolean).join(', ')
            : doc.description || doc.manufacturer || '',
        website: kind === 'developers' ? safeHttpLink(doc.website) : '',
        email: kind === 'developers' ? doc.email || '' : '',
        games: list.items,
      },
    ],
  }
}

export const page: Endpoint = {
  path: '/page',
  method: 'get',
  handler: async (req) => {
    const payload: any = req.payload
    let path = (params(req).get('path') || '/').split('?')[0]
    if (!path.startsWith('/')) path = '/' + path
    if (path.length > 1) path = path.replace(/\/+$/, '')

    const dynamic: any = await resolveDynamic(req, path)
    if (dynamic === 'not_found') return json({ error: 'not_found' }, 404)
    if (dynamic === 'forbidden') return noStore(403, 'forbidden')
    if (dynamic) return json(dynamic)

    const res = await payload.find({
      collection: 'pages',
      where: { path: { equals: path } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const doc = res.docs[0]
    if (!doc) return json({ error: 'not_found' }, 404)

    const blocks = await Promise.all((doc.layout ?? []).map((b: any) => enrich(req, b)))
    return json({ meta: { title: doc.title, description: doc.description ?? '' }, blocks })
  },
}

export const endpoints: Endpoint[] = [common, games, page]
