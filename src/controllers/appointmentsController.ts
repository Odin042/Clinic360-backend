import type { RequestHandler } from "express"
import pool from '../config/db'
import admin from '../config/firebaseAdmin'
import { findUserByEmail } from '../models/user'

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
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ message: "Token não fornecido." })
      return
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await admin.auth().verifyIdToken(token)
    const email = decodedToken.email
    if (!email) {
      res.status(400).json({ message: "Token não contém e-mail." })
      return
    }

    const user = await findUserByEmail(email)
    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." })
      return
    }

    if (user.type !== "Doctor") {
      res.status(403).json({ message: "Apenas médicos podem criar agendamentos." })
      return
    }

    const doctorResult = await pool.query(
      "SELECT id FROM doctor WHERE user_id = $1",
      [user.id]
    )

    if (doctorResult.rows.length === 0) {
      res.status(404).json({ message: "Médico não encontrado." })
      return
    }

    const doctorId = doctorResult.rows[0].id

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
    } = req.body

    const result = await pool.query(
      `
      INSERT INTO appointments
        (doctor_id, patient_id, type, status, place_of_service, service,online_service,
         start_time, end_time, timezone, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

    res.status(201).json({
      message: "Agendamento criado com sucesso!",
      appointment: result.rows[0]
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Erro ao criar agendamento.", error })
  }
}


export const getAppointments: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ message: "Token não fornecido." })
      return
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await admin.auth().verifyIdToken(token)
    const email = decodedToken.email

    if (!email) {
      res.status(400).json({ message: "Token não contém e-mail." })
      return
    }

    const user = await findUserByEmail(email)
    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." })
      return
    }

    if (user.type !== "Doctor") {
      res.status(403).json({ message: "Apenas médicos podem listar agendamentos." })
      return
    }

    const result = await pool.query(
      `
      SELECT a.*
      FROM appointments a
      WHERE a.doctor_id = (SELECT id FROM doctor WHERE user_id = $1)
      ORDER BY a.start_time DESC
      `,
      [user.id]
    )

    res.status(200).json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Erro ao obter agendamentos.", error })
  }
}

export const updateAppointment: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ message: "Token não fornecido." })
      return
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await admin.auth().verifyIdToken(token)
    const email = decodedToken.email
    if (!email) {
      res.status(400).json({ message: "Token não contém e-mail." })
      return
    }

    const user = await findUserByEmail(email)
    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." })
      return
    }

    if (user.type !== "Doctor") {
      res
        .status(403)
        .json({ message: "Apenas médicos podem atualizar agendamentos." })
      return
    }

    const { id } = req.params
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
      description,
    } = req.body as AppointmentInput

    const result = await pool.query(
      `
      UPDATE appointments
      SET 
        patient_id = $1,
        type = $2,
        status = $3,
        place_of_service = $4,
        service = $5,
        online_service = $6,
        start_time = $7,
        end_time = $8,
        timezone = $9,
        description = $10,
        updated_at = NOW()
      WHERE id = $11
        AND doctor_id = $12
      RETURNING *
      `,
      [
        patient_id,
        type,
        status,
        place_of_service,
        service,
        online_service,
        start_time,
        end_time,
        timezone,
        description,
        id,
        user.id,
      ]
    )

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Agendamento não encontrado." })
      return
    }

    res.status(200).json({ message: "Agendamento atualizado.", appointment: result.rows[0] })
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar agendamento.", error })
  }
}

export const deleteAppointment: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ message: "Token não fornecido." })
      return
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await admin.auth().verifyIdToken(token)
    const email = decodedToken.email
    if (!email) {
      res.status(400).json({ message: "Token não contém e-mail." })
      return
    }

    const user = await findUserByEmail(email)
    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." })
      return
    }

    if (user.type !== "Doctor") {
      res
        .status(403)
        .json({ message: "Apenas médicos podem excluir agendamentos." })
      return
    }

    const { id } = req.params

    const result = await pool.query(
      `
      DELETE FROM appointments
      WHERE id = $1
        AND doctor_id = $2
      RETURNING *
      `,
      [id, user.id]
    )

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Agendamento não encontrado." })
      return
    }

    res.status(200).json({ message: "Agendamento excluído." })
  } catch (error) {
    res.status(500).json({ message: "Erro ao excluir agendamento.", error })
  }
}
