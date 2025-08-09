import type { RequestHandler } from 'express'
import pool from '../config/db'
import getDoctorIdFromRequest from '../helpers/auth/getDoctorIdFromRequest'
import { toHttpError } from '../helpers/httpError'

interface AppointmentInput {
  patient_id: number
  type: string
  status: string
  place_of_service: string
  service: string
  online_service: boolean
  start_time: string
  end_time: string
  timezone: string
  description: string
}

export const createAppointment: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)
    const {
      patient_id,
      type,
      status,
      place_of_service,
      service,
      online_service,
      start_time,
      end_time,
      timezone,
      description
    } = req.body as AppointmentInput

    const result = await pool.query(
      `
      INSERT INTO appointments
        (doctor_id, patient_id, type, status, place_of_service, service, online_service,
         start_time, end_time, timezone, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        doctorId,
        patient_id,
        type,
        status,
        place_of_service,
        service,
        online_service,
        start_time,
        end_time,
        timezone,
        description
      ]
    )

    res.status(201).json({ message: 'Agendamento criado com sucesso!', appointment: result.rows[0] })
  } catch (err: unknown) {
    console.error(err)
    const { status, message } = toHttpError(err, 'Erro ao criar agendamento')
    res.status(status).json({ message })
  }
}

export const getAppointments: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)
    const result = await pool.query('SELECT * FROM appointments WHERE doctor_id = $1 ORDER BY start_time', [doctorId])
    res.json(result.rows)
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao listar agendamentos')
    res.status(status).json({ message })
  }
}

export const updateAppointment: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)
    const id = Number(req.params.id)

    const allowedFields = [
      'type',
      'status',
      'place_of_service',
      'service',
      'online_service',
      'start_time',
      'end_time',
      'timezone',
      'description',
      'missed'
    ]

    const updates: string[] = []
    const values: any[] = []
    let i = 1

    allowedFields.forEach(field => {
      if ((req.body as any)[field] !== undefined) {
        updates.push(`${field} = $${i++}`)
        values.push((req.body as any)[field])
      }
    })

    if (updates.length === 0) {
      res.status(400).json({ message: 'Nada para atualizar.' })
      return
    }

    updates.push('updated_at = NOW()')
    values.push(id, doctorId)

    const result = await pool.query(
      `
      UPDATE appointments
         SET ${updates.join(', ')}
       WHERE id = $${i++}
         AND doctor_id = $${i}
       RETURNING *
      `,
      values
    )

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Agendamento não encontrado.' })
      return
    }

    res.status(200).json({ message: 'Agendamento atualizado.', appointment: result.rows[0] })
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao atualizar agendamento')
    res.status(status).json({ message })
  }
}

export const deleteAppointment: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)
    const { id } = req.params

    const result = await pool.query(
      `
      DELETE FROM appointments
      WHERE id = $1
        AND doctor_id = $2
      RETURNING *
      `,
      [id, doctorId]
    )

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Agendamento não encontrado.' })
      return
    }

    res.status(200).json({ message: 'Agendamento excluído.' })
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao excluir agendamento')
    res.status(status).json({ message })
  }
}
