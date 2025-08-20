import type { RequestHandler } from 'express'
import pool from '../config/db'
import admin from '../config/firebaseAdmin'

interface RecordPayload {
  note_type?: string          
  content: string
  attachments?: any           
}


async function getDoctorIdFromRequest(req: any) {
  const authHeader = req.headers.authorization
  if (!authHeader) throw { status: 401, msg: 'Token não fornecido' }

  const token = authHeader.split(' ')[1]
  const { email } = await admin.auth().verifyIdToken(token)
  if (!email) throw { status: 400, msg: 'Token não contém e-mail' }

  const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  if (!userRes.rowCount) throw { status: 404, msg: 'Usuário não encontrado' }

  const user = userRes.rows[0]
  if (user.type !== 'Doctor') throw { status: 403, msg: 'Apenas médicos podem acessar prontuários' }

  const docRes = await pool.query('SELECT id FROM doctor WHERE user_id = $1', [user.id])
  if (!docRes.rowCount) throw { status: 404, msg: 'Médico não encontrado' }

  return docRes.rows[0].id as number
}


export const createRecord: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)
    const patientId = Number(req.params.id)

  
    const patRes = await pool.query(
      'SELECT 1 FROM patient WHERE id = $1 AND doctor_id = $2',
      [patientId, doctorId]
    )
    if (!patRes.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    const { note_type = 'EVOLUTION', content, attachments = [] } =
      req.body as RecordPayload

    const insert = await pool.query(
      `INSERT INTO medical_record
        (patient_id, doctor_id, note_type, content, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patientId, doctorId, note_type, content, attachments]
    )

    res.status(201).json(insert.rows[0])
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao criar registro' })
  }
}


export const listRecords: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)
    const patientId = Number(req.params.id)

    const patRes = await pool.query(
      'SELECT 1 FROM patient WHERE id = $1 AND doctor_id = $2',
      [patientId, doctorId]
    )
    if (!patRes.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    const records = await pool.query(
      `SELECT * FROM medical_record
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId]
    )

    res.status(200).json(records.rows)
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao listar prontuário' })
  }
}
