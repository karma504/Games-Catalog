import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { uk } from '@payloadcms/translations/languages/uk'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { endpoints } from './endpoints'
import { Developers } from './collections/Developers'
import { Games } from './collections/Games'
import { Genres } from './collections/Genres'
import { Pages } from './collections/Pages'
import { Platforms } from './collections/Platforms'
import { Reviews } from './collections/Reviews'
import { Users } from './collections/Users'
import { Wishlist } from './collections/Wishlist'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const origins = (process.env.FRONTEND_URLS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, Developers, Genres, Platforms, Games, Reviews, Wishlist, Pages],
  globals: [SiteSettings, Header, Footer],
  endpoints,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },

  }),
  i18n: { supportedLanguages: { uk }, fallbackLanguage: 'uk' },
  cors: origins,
  csrf: origins,
})
