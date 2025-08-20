import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import router from './routes'

dotenv.config()

const { FRONT_URL, FRONT_V2_URL, FRONT_PRD, PORT } = process.env

const whitelist = [FRONT_URL, FRONT_V2_URL, FRONT_PRD].filter(Boolean)
const allowedRegex = [/\.vercel\.app$/]

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    const ok = whitelist.includes(origin) || allowedRegex.some(r => r.test(origin))
    return ok ? cb(null, true) : cb(new Error(`Not allowed by CORS: <${origin}>`))
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

app.use((req, res) => {
  console.warn('404', req.method, req.originalUrl)
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

app.listen(Number(PORT) || 3000, '0.0.0.0', () => {
  console.log(`up on ${Number(PORT) || 3000}`)
})
