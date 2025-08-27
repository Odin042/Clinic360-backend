import type { RequestHandler } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../config/db'
import admin from '../config/firebaseAdmin'

export const register: RequestHandler = async (req, res) => {
  const b = req.body || {}

  const username = b.username
  const emailNorm = String(b.email || '').trim().toLowerCase()
  const password = b.password
  const cpf_cnpj = String(b.cpf_cnpj || '').replace(/\D/g, '')
  const gender = String(b.gender || '').trim()
  const reg = String(b.register || '').trim()
  const uf = String(b.uf || '').trim().toUpperCase()
  const phone = String(b.phone || '').replace(/\D/g, '')
  const specialityInput = b.speciality

  if (!username || !emailNorm || !password || !cpf_cnpj || !gender || !phone) {
    res.status(400).json({ error: 'Campos obrigatórios ausentes' })
    return
  }

  const client = await pool.connect()
  let fbUid: string | null = null

  try {
    await client.query('BEGIN')

    const dup = await client.query(
      'select 1 from users where lower(email) = lower($1)',
      [emailNorm]
    )
    if (dup.rowCount) {
      await client.query('ROLLBACK')
      res.status(409).json({ error: 'E-mail já cadastrado' })
      return
    }

    const hash = await bcrypt.hash(password, 10)

    const p = await client.query('select id from persons where cpf_cnpj = $1', [cpf_cnpj])
    const personId = p.rowCount
      ? p.rows[0].id
      : (await client.query(
          'insert into persons (name, cpf_cnpj, phone, gender, type, status) values ($1,$2,$3,$4,$5,$6) returning id',
          [username, cpf_cnpj, phone, gender, 'person', true]
        )).rows[0].id

    let specialtyId: number | null = null
    if (specialityInput != null) {
      const s = String(specialityInput)
      if (/^\d+$/.test(s)) {
        specialtyId = Number(s)
      } else {
        const r = await client.query(
          'select id from specialty where lower(name) = lower($1) limit 1',
          [s]
        )
        if (r.rowCount) specialtyId = r.rows[0].id
      }
    }

    const userType = specialtyId ? 'Doctor' : 'User'

    const u = await client.query(
      `insert into users
       (username, email, password, speciality, cpf_cnpj, gender, register, uf, phone, type, person_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       returning id`,
      [username, emailNorm, hash, specialityInput || null, cpf_cnpj, gender, reg, uf, phone, userType, personId]
    )
    const userId = u.rows[0].id

    if (userType === 'Doctor') {
      if (!specialtyId) {
        throw new Error('Especialidade inválida')
      }
      await client.query(
        'insert into doctor (name, register, uf, specialty_id, status, user_id) values ($1,$2,$3,$4,$5,$6)',
        [username, reg, uf, specialtyId, true, userId]
      )
    }

    const fb = await admin.auth().createUser({
      email: emailNorm,
      password,
      displayName: username
    })
    fbUid = fb.uid

    await client.query('update users set firebase_uid = $1 where id = $2', [fbUid, userId])

    await client.query('COMMIT')
    res.status(201).json({ id: userId })
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {})
    if (fbUid) {
      try { await admin.auth().deleteUser(fbUid) } catch {}
    }
    const msg = String(err?.message || err)
    if (/duplicate key value/i.test(msg)) {
      res.status(409).json({ error: 'E-mail ou CPF/CNPJ já cadastrado' })
      return
    }
    if (/Especialidade inválida/i.test(msg)) {
      res.status(400).json({ error: 'Especialidade inválida' })
      return
    }
    console.error('REGISTER_ERROR', msg)
    res.status(400).json({ error: 'Não foi possível concluir o cadastro' })
  } finally {
    client.release()
  }
}
