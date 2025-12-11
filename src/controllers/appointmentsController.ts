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

export const completeAppointment: RequestHandler = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ('error' in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const appointmentId = Number(req.params.id)
    if (!appointmentId) {
      res.status(400).json({ message: 'ID inválido' })
      return
    }

    const { note_type, content, attachments } = req.body as {
      note_type: string
      content: string
      attachments?: any[]
    }

    if (!note_type || !content) {
      res.status(400).json({ message: 'note_type e content são obrigatórios' })
      return
    }

    await client.query('BEGIN')

    const appointmentCheck = await client.query(
      `select patient_id from appointments 
       where id = $1 and doctor_id = $2`,
      [appointmentId, auth.doctorId]
    )

    if (!appointmentCheck.rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ message: 'Agendamento não encontrado' })
      return
    }

    const patientId = appointmentCheck.rows[0].patient_id

    const medicalRecord = await client.query(
      `insert into medical_record 
       (patient_id, doctor_id, note_type, content, attachments)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [patientId, auth.doctorId, note_type, content, attachments || []]
    )

    const appointment = await client.query(
      `update appointments
       set status = 'completed',
           missed = false,
           medical_record_id = $1,
           finished_at = now(),
           updated_at = now()
       where id = $2
       returning *`,
      [medicalRecord.rows[0].id, appointmentId]
    )

    await client.query('COMMIT')

    res.status(200).json({
      message: 'Atendimento registrado com sucesso',
      appointment: appointment.rows[0],
      medical_record: medicalRecord.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Erro ao registrar atendimento', error })
  } finally {
    client.release()
  }
}

export const markAppointmentAsMissed: RequestHandler = async (req, res) => {
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ("error" in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const appointmentId = Number(req.params.id)
    if (!appointmentId) {
      res.status(400).json({ message: "ID inválido" })
      return
    }

    const { reason } = req.body as { reason?: string }

    let result

    if (reason && reason.trim() !== "") {
      result = await pool.query(
        `
        update appointments
           set status = 'missed',
               missed = true,
               description = coalesce(description, '') || ' | Falta registrada: ' || $3::text,
               updated_at = now()
         where id = $1 
           and doctor_id = $2
           and status != 'completed'
         returning *
        `,
        [appointmentId, auth.doctorId, reason]
      )
    } else {
      result = await pool.query(
        `
        update appointments
           set status = 'missed',
               missed = true,
               description = coalesce(description, '') || ' | Falta registrada',
               updated_at = now()
         where id = $1 
           and doctor_id = $2
           and status != 'completed'
         returning *
        `,
        [appointmentId, auth.doctorId]
      )
    }

    if (!result.rowCount) {
      res.status(404).json({
        message: "Agendamento não encontrado ou já foi finalizado",
      })
      return
    }

    res.status(200).json({
      message: "Falta registrada com sucesso",
      appointment: result.rows[0],
    })
  } catch (error) {
    res.status(500).json({ message: "Erro ao registrar falta", error })
  }
}



export const startAppointment: RequestHandler = async (req, res) => {
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ('error' in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const appointmentId = Number(req.params.id)
    if (!appointmentId) {
      res.status(400).json({ message: 'ID inválido' })
      return
    }

    const result = await pool.query(
      `update appointments
       set status = 'in_progress',
           started_at = now(),
           updated_at = now()
       where id = $1 
         and doctor_id = $2
         and status in ('CONFIRMED', 'scheduled')
       returning *`,
      [appointmentId, auth.doctorId]
    )

    if (!result.rowCount) {
      res.status(404).json({
        message: 'Agendamento não encontrado ou não está em estado válido para iniciar'
      })
      return
    }

    res.status(200).json({
      message: 'Atendimento iniciado',
      appointment: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao iniciar atendimento', error })
  }
}


export const getAppointmentReport: RequestHandler = async (req, res) => {
  try {
    const auth = await requireDoctorIdByToken(req.headers.authorization)
    if ('error' in auth) {
      res.status(auth.error?.status).json({ message: auth.error?.message })
      return
    }

    const { start_date, end_date, patient_id } = req.query

    let query = `
      select 
        a.id,
        a.patient_id,
        a.start_time,
        a.end_time,
        a.status,
        a.missed,
        a.medical_record_id,
        a.started_at,
        a.finished_at,
        a.created_at,
        case 
          when a.status = 'completed' then 'Atendimento Realizado'
          when a.missed = true then 'Falta'
          when a.status = 'in_progress' then 'Em Andamento'
          else 'Agendado'
        end as attendance_status,
        mr.note_type,
        mr.created_at as medical_record_date
      from appointments a
      left join medical_record mr on mr.id = a.medical_record_id
      where a.doctor_id = $1
    `

    const params: any[] = [auth.doctorId]
    let paramCount = 1

    if (start_date) {
      query += ` and a.start_time >= $${++paramCount}`
      params.push(start_date)
    }

    if (end_date) {
      query += ` and a.start_time <= $${++paramCount}`
      params.push(end_date)
    }

    if (patient_id) {
      query += ` and a.patient_id = $${++paramCount}`
      params.push(Number(patient_id))
    }

    query += ` order by a.start_time desc`

    const result = await pool.query(query, params)

    const stats = {
      total: result.rows.length,
      completed: result.rows.filter(r => r.status === 'completed').length,
      missed: result.rows.filter(r => r.missed === true).length,
      scheduled: result.rows.filter(r => r.status === 'scheduled').length,
      in_progress: result.rows.filter(r => r.status === 'in_progress').length,
      completion_rate: result.rows.length > 0 
        ? ((result.rows.filter(r => r.status === 'completed').length / result.rows.length) * 100).toFixed(2)
        : '0.00'
    }

    res.status(200).json({
      stats,
      appointments: result.rows
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao gerar relatório', error })
  }
}