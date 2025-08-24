import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
})


pool.on('connect', () => {
  console.log('Connected to database')
})

pool.on('error', (err) => {
  console.error('Database connection error:', err)
})

export default pool