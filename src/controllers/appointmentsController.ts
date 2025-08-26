import type { RequestHandler } from 'express'
import pool from '../config/db'
import admin from '../config/firebaseAdmin'
import { findUserByEmail } from '../models/user'

async function requireDoctorIdByToken(authHeader?: string) {
  if (!authHeader) return { error: { status: 401, message: 'Token não fornecido' } }

  const token = authHeader.split(' ')[1]
  const decoded = await admin.auth().verifyIdToken(token).catch(() => null)
  const email = decoded?.email
  if (!email) return { error: { status: 400, message: 'Token não contém e-mail' } }

  const user = await findUserByEmail(email)
  if (!user) return { error: { status: 404, message: 'Usuário não encontrado' } }
  if (user.type !== 'Doctor') return { error: { status: 403, message: 'Apenas médicos podem operar agendamentos' } }

  const q = await pool.query('select id from doctor where user_id = $1', [user.id])
  if (!q.rowCount) return { error: { status: 404, message: 'Médico não encontrado' } }

  return { doctorId: q.rows[0].id, userId: user.id }
}

export const createAppointment: RequestHandler = async (req, res) => {
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ('error' in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const {
      patient_id,
      type,
      status,
      place_of_service,
      service,
      online_service,
      start_time,
      end_time,
      description
    } = req.body as {
      patient_id: number
      type: string
      status: string
      place_of_service: string
      service: string
      online_service: boolean
      start_time: string
      end_time: string
      description?: string
    }

    const result = await pool.query(
      `
      insert into appointments
        (doctor_id, patient_id, type, status, place_of_service, service, online_service,
         start_time, end_time, description)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      returning *
      `,
      [
        auth.doctorId,
        patient_id,
        type,
        status,
        place_of_service,
        service,
        online_service,
        start_time,
        end_time,
        description ?? ''
      ]
    )

    res.status(201).json({
      message: 'Agendamento criado com sucesso',
      appointment: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar agendamento', error })
  }
}

export const getAppointments: RequestHandler = async (req, res) => {
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ('error' in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const result = await pool.query(
      `
      select a.*
      from appointments a
      where a.doctor_id = $1
      order by a.start_time desc
      `,
      [auth.doctorId]
    )

    res.status(200).json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter agendamentos', error })
  }
}

export const updateAppointment: RequestHandler = async (req, res) => {
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ('error' in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: 'ID inválido' })
      return
    }

    const allowedFields = [
      'type',
      'status',
      'place_of_service',
      'service',
      'online_service',
      'start_time',
      'end_time',
      'description',
      'missed'
    ]

    const updates: string[] = []
    const values: any[] = []
    let i = 1

    for (const f of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        updates.push(`${f} = $${i++}`)
        values.push(req.body[f])
      }
    }

    if (!updates.length) {
      res.status(400).json({ message: 'Nada para atualizar' })
      return
    }

    updates.push('updated_at = now()')

    values.push(id)
    values.push(auth.doctorId)

    const result = await pool.query(
      `
      update appointments
         set ${updates.join(', ')}
       where id = $${i++}
         and doctor_id = $${i}
       returning *
      `,
      values
    )

    if (!result.rowCount) {
      res.status(404).json({ message: 'Agendamento não encontrado' })
      return
    }

    res.status(200).json({ message: 'Agendamento atualizado', appointment: result.rows[0] })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar agendamento', error })
  }
}

export const deleteAppointment: RequestHandler = async (req, res) => {
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ('error' in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: 'ID inválido' })
      return
    }

    const result = await pool.query(
      `
      delete from appointments
      where id = $1
        and doctor_id = $2
      returning *
      `,
      [id, auth.doctorId]
    )

    if (!result.rowCount) {
      res.status(404).json({ message: 'Agendamento não encontrado' })
      return
    }

    res.status(200).json({ message: 'Agendamento excluído' })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir agendamento', error })
  }
}