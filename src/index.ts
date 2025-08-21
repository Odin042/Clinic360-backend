import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import router from './routes/authRoutes'
import pool from './config/db'

dotenv.config()

const { FRONT_URL, FRONT_V2_URL, FRONT_PRD, PORT } = process.env

const whitelist = [FRONT_URL, FRONT_V2_URL, FRONT_PRD].filter(Boolean)

const allowedRegex = [
  /\.vercel\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/
]

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true
  if (whitelist.includes(origin)) return true
  try {
    const url = new URL(origin)
    if (allowedRegex.some(r => r.test(origin) || r.test(url.hostname))) return true
  } catch {}
  return false
}

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`Not allowed by CORS: <${origin}>`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
}

const app = express()

app.use((req, _res, next) => {
  console.log('DEBUG', req.method, req.url, 'Origin:', req.headers.origin)
  next()
})

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/healthz', (_req, res) => res.status(200).send('ok'))

app.use(express.json())

app.use('/', router)

app.get('/debug/dbinfo', async (_req, res) => {
  const r = await pool.query(`
    select current_database() as db,
           current_user as "user",
           inet_server_addr()::text as host,
           inet_server_port() as port,
           show_config_by_name('search_path') as search_path
  `)
  res.json(r.rows[0])
})

app.get('/debug/materials-smoke', async (_req, res) => {
  try {
    const r = await pool.query('select id, name from public.materials order by id desc limit 1')
    res.json({ ok: true, sample: r.rows[0] || null })
  } catch (err: any) {
    console.error('MATERIALS_SMOKE_ERROR', { message: err?.message, code: err?.code, detail: err?.detail })
    res.status(500).json({ ok: false, code: err?.code, message: err?.message })
  }
})

app.use((req, res) => {
  console.warn('404', req.method, req.originalUrl)
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

app.listen(Number(PORT) || 5000, '0.0.0.0', () => {
  console.log(`up on ${Number(PORT) || 5000}`)
})
