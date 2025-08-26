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
  /^https?:\/\/([a-z0-9-]+\.)*clinic360pro\.com\.br$/i,
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
    cb(null, !origin || isAllowedOrigin(origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-No-Auth'],
  exposedHeaders: ['X-Request-Id'],
  optionsSuccessStatus: 204
}

const app = express()

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined
  if (!origin || isAllowedOrigin(origin)) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    const reqHeaders = req.headers['access-control-request-headers']
    res.setHeader('Access-Control-Allow-Headers', typeof reqHeaders === 'string' && reqHeaders.length ? reqHeaders : 'Content-Type, Authorization, X-No-Auth')
    res.setHeader('Vary', 'Origin, Access-Control-Request-Headers')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
  }
  next()
})

app.use(express.json())
app.use(authRoutes)

app.listen(PORT || 5000, () => {
  console.log(`Servidor rodando na porta ${PORT || 5000}`)
})
