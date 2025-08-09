import dotenv from 'dotenv'

dotenv.config()

export const {
  DATABASE_URL,
  FRONT_URL,
  FRONT_V2_URL,
  FRONT_PRD,
  PORT,
  JWT_SECRET,
  DB_SSL,
  DB_REJECT_UNAUTHORIZED
} = process.env

