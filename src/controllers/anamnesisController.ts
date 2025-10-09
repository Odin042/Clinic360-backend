import type { RequestHandler } from 'express'
import pool from '../config/db'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'

const toInt = (v: any, label: string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) throw { status: 400, msg: `${label} inválido` }
  return n
}

interface AnamnesisPayload {
  specialty: string
  content: Record<string, any>
}

export const createAnamnesis: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const patientId = toInt(req.params.id, 'patientId')

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, Number(doctorId)]
    )
    if (!own.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    const { specialty, content } = req.body as AnamnesisPayload
    if (!specialty || typeof specialty !== 'string' || !specialty.trim()) {
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
       values ($1,$2,$3,$4::jsonb)
       returning *`,
      [patientId, Number(doctorId), specialty.trim().toUpperCase(), JSON.stringify(content)]
    )

    res.status(201).json(rows[0])
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao criar anamnese' })
  }
}

export const listAnamnesis: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const patientId = toInt(req.params.id, 'patientId')

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, Number(doctorId)]
    )
    if (!own.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    const { rows } = await pool.query(
      `select * from anamnesis
       where patient_id = $1 and doctor_id = $2
       order by created_at desc`,
      [patientId, Number(doctorId)]
    )

    res.json(rows)
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao listar anamneses' })
  }
}
