import type { Request, Response, NextFunction } from 'express'
import pool from '../config/db'
import admin from '../config/firebaseAdmin'

export interface AuthRequest extends Request {
  userId?: number
  doctorId?: number
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hdr = req.headers.authorization
    if (!hdr) {
      res.status(401).json({ error: 'Token não fornecido' })
      return
    }

    const token = hdr.split(' ')[1]
    const { email } = await admin.auth().verifyIdToken(token)
    if (!email) {
      res.status(400).json({ error: 'Token não contém e-mail' })
      return
    }

    const usr = await pool.query('select id, type from users where email = $1', [email])
    if (!usr.rowCount) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }

    const user = usr.rows[0]
    req.userId = user.id

    if (user.type === 'Doctor') {
      const doc = await pool.query('select id from doctor where user_id = $1', [user.id])
      if (!doc.rowCount) {
        res.status(404).json({ error: 'Médico não encontrado' })
        return
      }
      req.doctorId = doc.rows[0].id
    }

    next()
  } catch (err) {
    console.error(err)
    res.status(401).json({ error: 'Token inválido' })
  }
}
