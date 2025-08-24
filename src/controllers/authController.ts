import type { RequestHandler } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../config/db'
import admin from '../config/firebaseAdmin'

export const register: RequestHandler = async (req, res) => {
  const {
    username,
    email,
    password,
    speciality,
    cpf_cnpj,
    gender,
    register: reg,
    uf,
    phone
  } = req.body || {}

  if (!username || !email || !password || !cpf_cnpj || !gender || !phone) {
    res.status(400).json({ error: 'Campos obrigatórios ausentes' })
    return
  }

  const client = await pool.connect()
  let fbUid: string | null = null

  try {
    await client.query('BEGIN')

    const dup = await client.query('select 1 from users where email = $1', [email])
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

    const userType = speciality ? 'Doctor' : 'User'
    const u = await client.query(
      `insert into users
       (username, email, password, speciality, cpf_cnpj, gender, register, uf, phone, type, person_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       returning id`,
      [username, email, hash, speciality || null, cpf_cnpj, gender, reg || '', uf || '', phone, userType, personId]
    )
    const userId = u.rows[0].id

    if (userType === 'Doctor') {
      await client.query(
        `insert into doctor (name, register, uf, specialty_id, status, user_id)
         values ($1,$2,$3,$4,$5,$6)`,
        [username, reg || '', uf || '', speciality, true, userId]
      )
    }

    const fb = await admin.auth().createUser({
      email,
      password,
      displayName: username
    })
    fbUid = fb.uid

    await client.query('update users set firebase_uid = $1 where id = $2', [fbUid, userId])

    await client.query('COMMIT')
    res.status(201).json({ id: userId })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    if (fbUid) {
      try { await admin.auth().deleteUser(fbUid) } catch {}
    }
    const msg = String((err as any)?.message || err)
    if (/duplicate key value/i.test(msg)) {
      res.status(409).json({ error: 'E-mail ou CPF/CNPJ já cadastrado' })
      return
    }
    console.error('REGISTER_ERROR', msg)
    res.status(400).json({ error: 'Não foi possível concluir o cadastro' })
  } finally {
    client.release()
  }
}
