import type { RequestHandler } from 'express'
import pool from '../config/db'
import admin from '../config/firebaseAdmin'

export const getUserByToken: RequestHandler = async (req, res) => {
  try {
    const hdr = req.headers.authorization || ''
    const parts = hdr.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Authorization inválido. Formato esperado: Bearer <token>' })
      return
    }

    const token = parts[1]
    const decoded = await admin.auth().verifyIdToken(token)
    const email = decoded.email
    if (!email) {
      res.status(400).json({ error: 'Token não contém e-mail.' })
      return
    }

    const { rows } = await pool.query(
      'select * from users where lower(email) = lower($1)',
      [email]
    )
    if (!rows.length) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }

    const user = rows[0]
    delete user.password

    const dr = await pool.query('select id from doctor where user_id = $1', [user.id])
    const doctor_id = dr.rows[0]?.id ?? null

    res.json({ ...user, doctor_id, is_doctor: !!doctor_id })
  } catch (err: any) {
    const msg = String(err?.message || err)
    if (/self signed certificate/i.test(msg)) {
      res.status(502).json({ error: 'Falha TLS ao validar token (CA não confiável).' })
      return
    }
    if (err?.code) {
      switch (err.code) {
        case 'auth/argument-error':
          res.status(400).json({ error: 'Token ausente ou malformado.' })
          return
        case 'auth/id-token-expired':
          res.status(401).json({ error: 'Token expirado.' })
          return
        case 'auth/invalid-id-token':
          res.status(401).json({ error: 'ID Token inválido.' })
          return
        case 'auth/tenant-id-mismatch':
        case 'auth/project-id-mismatch':
          res.status(401).json({ error: 'Token de outro projeto Firebase.' })
          return
      }
    }
    res.status(401).json({ error: 'Token inválido ou erro na validação.' })
  }
}
