import { Pool } from 'pg'
import { DATABASE_URL, DB_SSL, DB_REJECT_UNAUTHORIZED } from './env'

const ssl = DB_SSL === 'false'
  ? false
  : { rejectUnauthorized: DB_REJECT_UNAUTHORIZED !== 'false' }

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl
})

export default pool
