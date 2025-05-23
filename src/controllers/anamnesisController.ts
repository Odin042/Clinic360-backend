import type { RequestHandler } from 'express'
import pool from '../config/db'
import admin from '../config/firebaseAdmin'

async function getDoctorIdFromRequest (req: any) {
  const hdr = req.headers.authorization
  if (!hdr) throw { status: 401, msg: 'Token não fornecido' }

  const token = hdr.split(' ')[1]
  const { email } = await admin.auth().verifyIdToken(token)
  if (!email) throw { status: 400, msg: 'Token não contém e-mail' }

  const usr = await pool.query('select * from users where email = $1', [email])
  if (!usr.rowCount) throw { status: 404, msg: 'Usuário não encontrado' }

  const user = usr.rows[0]
  if (user.type !== 'Doctor') throw { status: 403, msg: 'Apenas médicos podem acessar anamneses' }

  const doc = await pool.query('select id from doctor where user_id = $1', [user.id])
  if (!doc.rowCount) throw { status: 404, msg: 'Médico não encontrado' }

  return doc.rows[0].id as number
}

interface AnamnesisPayload {
  specialty: string
  content: Record<string, any>
}

export const createAnamnesis: RequestHandler = async (req, res) => {
  try {
    const doctorId  = await getDoctorIdFromRequest(req)
    const patientId = Number(req.params.id)

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, doctorId]
    )
    if (!own.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    const { specialty, content } = req.body as AnamnesisPayload

    if (!specialty || typeof specialty !== 'string') {
      res.status(400).json({ error: 'Especialidade obrigatória' })
      return
    }
    if (!content || typeof content !== 'object') {
      res.status(400).json({ error: 'Conteúdo inválido' })
      return
    }

    const { rows } = await pool.query(
      `insert into anamnesis
         (patient_id, doctor_id, specialty, content)
       values ($1,$2,$3,$4)
       returning *`,
      [patientId, doctorId, specialty.toUpperCase(), content]
    )

    res.status(201).json(rows[0])
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao criar anamnese' })
  }
}

export const listAnamnesis: RequestHandler = async (req, res) => {
  try {
    const doctorId  = await getDoctorIdFromRequest(req)
    const patientId = Number(req.params.id)

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, doctorId]
    )
    if (!own.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    const { rows } = await pool.query(
      `select * from anamnesis
       where patient_id = $1
       order by created_at desc`,
      [patientId]
    )

    res.json(rows)
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao listar anamneses' })
  }
}
