import type { RequestHandler } from 'express'
import pool from '../config/db'
import getDoctorIdFromRequest from '../helpers/auth/getDoctorIdFromRequest'


interface RecordPayload {
  note_type?: string          
  content: string
  attachments?: any           
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
