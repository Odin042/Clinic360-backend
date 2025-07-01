import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const allowedOrigins = [
  'https://clinic360pro-git-homolog-clinic360pro.vercel.app',
  'http://localhost:5173',
  'https://clinic360pro.com.br'
]

const corsOptions = {
  origin: function (origin, callback) {
    console.log('Origin da requisição:', origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(authRoutes)

app.use((req, res, next) => {
  console.log(`Requisição: ${req.method} ${req.url} | Origem: ${req.headers.origin}`)
  next()
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})