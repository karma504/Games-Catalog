import { getPayload } from 'payload'
import config from '@payload-config'
import { safeHttpLink } from '../lib/games'

const UA = 'Mozilla/5.0 (compatible; GameCatalogLinkCheck/1.0)'
const DEAD = new Set([404, 410])
const clear = process.argv.includes('--clear-broken')

type Result = { status: number | null; kind: 'ok' | 'dead' | 'manual'; note: string }

async function probe(url: string, timeoutMs = 12000): Promise<Result> {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.ok) return { status: res.status, kind: 'ok', note: '' }
      if (method === 'HEAD' && [403, 405, 501].includes(res.status)) continue
      if (DEAD.has(res.status)) return { status: res.status, kind: 'dead', note: 'сторінку не знайдено' }
      return { status: res.status, kind: 'manual', note: 'перевірте вручну' }
    } catch (e: any) {
      const code = e?.cause?.code || e?.name
      if (['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN'].includes(code))
        return { status: null, kind: 'dead', note: `недоступно: ${code}` }
      return { status: null, kind: 'manual', note: `${code || 'помилка'}: перевірте вручну` }
    }
  }
  return { status: null, kind: 'manual', note: 'перевірте вручну' }
}

const payload: any = await getPayload({ config })

type Job = { collection: 'games' | 'developers'; id: number; field: string; label: string; url: string }
const jobs: Job[] = []

const games = await payload.find({ collection: 'games', pagination: false, depth: 0, overrideAccess: true })
for (const g of games.docs) {
  for (const field of ['officialUrl', 'imageUrl']) {
    const url = safeHttpLink(g[field])
    if (url) jobs.push({ collection: 'games', id: g.id, field, label: `${g.title} · ${field}`, url })
  }
}
const devs = await payload.find({ collection: 'developers', pagination: false, depth: 0, overrideAccess: true })
for (const d of devs.docs) {
  const url = safeHttpLink(d.website)
  if (url) jobs.push({ collection: 'developers', id: d.id, field: 'website', label: `${d.name} · website`, url })
}

console.log(`Перевіряю посилань: ${jobs.length}…`)
const results: { job: Job; r: Result }[] = []
const queue = [...jobs]
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const job = queue.shift()!
      results.push({ job, r: await probe(job.url) })
    }
  }),
)

let ok = 0
let dead = 0
let manual = 0
for (const { job, r } of results.sort((a, b) => a.job.label.localeCompare(b.job.label, 'uk'))) {
  if (r.kind === 'ok') {
    ok++
    continue
  }
  r.kind === 'dead' ? dead++ : manual++
  console.log(`[${r.kind === 'dead' ? 'НЕ ПРАЦЮЄ' : 'ПЕРЕВІРИТИ'}] ${job.label} → ${job.url} (${r.status ?? '—'}: ${r.note})`)
  if (clear && r.kind === 'dead') {
    await payload.update({ collection: job.collection, id: job.id, data: { [job.field]: null }, overrideAccess: true })
    console.log('   посилання очищено')
  }
}
console.log(`Готово. Працюють: ${ok}, не працюють: ${dead}, потребують ручної перевірки: ${manual}.`)
process.exit(0)
