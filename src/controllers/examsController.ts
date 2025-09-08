import type { RequestHandler } from 'express'
import pool from '../config/db'
import { getStorage } from 'firebase-admin/storage'
import dayjs from 'dayjs'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'

const toInt = (v: any, label: string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) throw { status: 400, msg: `${label} inválido` }
  return n
}

export const createExam: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const patientId = toInt(req.params.id, 'patientId')

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, Number(doctorId)]
    )
    if (!own.rowCount) return res.status(404).json({ error: 'Paciente não encontrado' })
    if (!req.file) return res.status(400).json({ error: 'Arquivo PDF obrigatório (campo "file")' })

    const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const folder = `exams/patient_${patientId}`
    const fileName = `${Date.now()}_${req.file.originalname}`
    const file = bucket.file(`${folder}/${fileName}`)
    await file.save(req.file.buffer, { metadata: { contentType: 'application/pdf' } })
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7
    })

    const examDate = req.body?.examDate ? dayjs(req.body.examDate).format('YYYY-MM-DD') : null

    const { rows } = await pool.query(
      `insert into exam (patient_id, doctor_id, file_name, file_url, exam_date)
       values ($1,$2,$3,$4,$5)
       returning id, file_url, created_at`,
      [patientId, Number(doctorId), req.file.originalname, url, examDate]
    )

    res.status(201).json(rows[0])
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao enviar exame' })
  }
}

export const listExams: RequestHandler = async (req, res) => {
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
      `select id, file_name, file_url, exam_date, created_at
       from exam
       where patient_id = $1 and doctor_id = $2
       order by created_at desc`,
      [patientId, Number(doctorId)]
    )

    res.json(rows)
  } catch (err: any) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.msg || 'Erro ao listar exames' })
  }
}
