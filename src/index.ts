import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const corsOptions = {
  origin: [
    'https://clinic360pro-git-homolog-clinic360pro.vercel.app',
    'https://clinic360pro-git-master-clinic360pro.vercel.app',
    'https://clinic360pro.com.br',
    'http://localhost:3000'
  ],
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
