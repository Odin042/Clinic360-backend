import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import dotenv from 'dotenv'

dotenv.config()

const { FRONT_URL, FRONT_V2_URL, FRONT_PRD, PORT } = process.env

const normalize = (u?: string) => {
  if (!u) return ''
  try { return new URL(u).origin } catch { return String(u).replace(/\/+$/, '') }
}

const whitelist = [FRONT_URL, FRONT_V2_URL, FRONT_PRD].filter(Boolean).map(normalize)

const allowedRegex = [
  /^https?:\/\/[^/]*clinic360pro[^/]*\.vercel\.app$/i,
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i
]

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true
  const o = normalize(origin)
  if (whitelist.includes(o)) return true
  try {
    const url = new URL(origin)
    return allowedRegex.some(r => r.test(origin) || r.test(url.hostname))
  } catch {
    return false
  }
}

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`Not allowed by CORS: <${origin}>`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  optionsSuccessStatus: 204
}

const app = express()

console.log('CORS whitelist:', whitelist)

app.use((req, _res, next) => {
  console.log('DEBUG', req.method, req.url, 'Origin:', req.headers.origin, 'ACRH:', req.headers['access-control-request-headers'])
  next()
})

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(express.json())
app.use(authRoutes)

app.listen(PORT || 5000, () => {
  console.log(`Servidor rodando na porta ${PORT || 5000}`)
})
