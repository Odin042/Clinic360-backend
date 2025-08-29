import type { Request } from 'express'
import pool from '../../config/db'
import admin from '../../config/firebaseAdmin'

export async function getAuthIdsFromRequest(req: Request) {
  const hdr = req.headers.authorization
  if (!hdr) throw { status: 401, msg: 'Token não fornecido' }

  const token = hdr.split(' ')[1]
  const { email } = await admin.auth().verifyIdToken(token)
  if (!email) throw { status: 400, msg: 'Token não contém e-mail' }

  const usr = await pool.query('select id, type from users where email = $1', [email])
  if (!usr.rowCount) throw { status: 404, msg: 'Usuário não encontrado' }

  const user = usr.rows[0]
  if (user.type !== 'Doctor') throw { status: 403, msg: 'Apenas médicos podem acessar este recurso' }

  const doc = await pool.query('select id from doctor where user_id = $1', [user.id])
  if (!doc.rowCount) throw { status: 404, msg: 'Médico não encontrado' }

  return { userId: user.id as number, doctorId: doc.rows[0].id as number }
}

export default getAuthIdsFromRequest