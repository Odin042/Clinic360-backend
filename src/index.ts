import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import dotenv from 'dotenv'

dotenv.config()

const { FRONT_URL, FRONT_V2_URL, FRONT_PRD, PORT } = process.env

const whitelist = [FRONT_URL, FRONT_V2_URL, FRONT_PRD].filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||                                  
      /\.vercel\.app$/.test(origin) ||            
      whitelist.includes(origin)                  
    ) {
      callback(null, true)
    } else {
      callback(new Error(`Not allowed by CORS: <${origin}>`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}

const app = express()


app.use((req, res, next) => {
  console.log('DEBUG', req.method, req.url, 'Origin:', req.headers.origin)
  next()
})


app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(express.json())
app.use(authRoutes)

app.listen(PORT || 5000, () => {
  console.log(`Servidor rodando na porta ${PORT || 5000}`)
})
