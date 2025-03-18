import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'http://localhost:5173',
  'https://clinic360pro.com.br',
  'clinic360pro-git-homolog-odin042s-projects.vercel.app',
  'localhost:5173'
]

const corsOptions = {
  origin: allowedOrigins,
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