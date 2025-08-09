import type { RequestHandler } from 'express'
import pool from '../config/db'
import getDoctorIdFromRequest from '../helpers/auth/getDoctorIdFromRequest'
import { toHttpError } from '../helpers/httpError'

interface Patient {
  name: string
  birthday: string
  gender: string
  email: string
  whatsapp: string
  place_of_service: string
  occupation: string
  cpf_cnpj: string
  rg: string
  address: string
  health_plan: string
  weight: string
  height: string
}

export const createPatient: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)

    const {
      name,
      birthday,
      gender,
      email: patientEmail,
      whatsapp,
      place_of_service,
      occupation,
      cpf_cnpj,
      rg,
      address,
      health_plan,
      weight,
      height
    } = req.body as Patient

    const result = await pool.query(
      `
      INSERT INTO patient
        (name, birthday, gender, email, whatsapp, place_of_service,
         occupation, cpf_cnpj, rg, address, health_plan, weight, height, doctor_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
      `,
      [
        name,
        birthday,
        gender,
        patientEmail,
        whatsapp,
        place_of_service,
        occupation,
        cpf_cnpj,
        rg,
        address,
        health_plan,
        weight,
        height,
        doctorId
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    console.error(err)
    const { status, message } = toHttpError(err, 'Erro ao criar paciente')
    res.status(status).json({ error: message })
  }
}

export const getPatients: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)

    const result = await pool.query(
      'SELECT * FROM patient WHERE doctor_id = $1',
      [doctorId]
    )

    res.status(200).json(result.rows)
  } catch (err: unknown) {
    console.error(err)
    const { status, message } = toHttpError(err, 'Erro ao obter pacientes')
    res.status(status).json({ error: message })
  }
}

export const getPatientById: RequestHandler = async (req, res) => {
  try {
    const doctorId = await getDoctorIdFromRequest(req)
    const patientId = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(patientId)) {
      res.status(400).json({ error: 'Parâmetro id inválido' })
      return
    }

    const patRes = await pool.query(
      'SELECT * FROM patient WHERE id = $1 AND doctor_id = $2',
      [patientId, doctorId]
    )
    if (!patRes.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    res.status(200).json(patRes.rows[0])
  } catch (err: unknown) {
    console.error('GET /patient/:id error →', err)
    const { status, message } = toHttpError(err, 'Erro ao obter paciente')
    res.status(status).json({ error: message })
  }
}
