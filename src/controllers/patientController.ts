import type { RequestHandler } from "express"
import pool from "../config/db"
import admin from "../config/firebaseAdmin"

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
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ error: "Token não fornecido" })
      return
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await admin.auth().verifyIdToken(token)
    const email = decodedToken.email

    if (!email) {
      res.status(400).json({ error: "Token não contém e-mail." })
      return
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    )

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "Usuário não encontrado" })
      return
    }

    const user = userResult.rows[0]

    if (user.type !== "Doctor") {
      res.status(403).json({ error: "Apenas médicos podem criar pacientes." })
      return
    }

    const doctorResult = await pool.query(
      "SELECT id FROM doctor WHERE user_id = $1",
      [user.id]
    )

    if (doctorResult.rows.length === 0) {
      res.status(404).json({ error: "Médico não encontrado na tabela doctor" })
      return
    }

    const doctorId = doctorResult.rows[0].id

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
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao criar paciente." })
  }
}

export const getPatients: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ error: "Token não fornecido" })
      return
    }

    const token = authHeader.split(" ")[1]
    const decodedToken = await admin.auth().verifyIdToken(token)
    const email = decodedToken.email

    if (!email) {
      res.status(400).json({ error: "Token não contém e-mail." })
      return
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    )

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "Usuário não encontrado" })
      return
    }

    const user = userResult.rows[0]

    if (user.type !== "Doctor") {
      res.status(403).json({ error: "Apenas médicos podem acessar pacientes." })
      return
    }

    const doctorResult = await pool.query(
      "SELECT id FROM doctor WHERE user_id = $1",
      [user.id]
    )

    if (doctorResult.rows.length === 0) {
      res.status(404).json({ error: "Médico não encontrado na tabela doctor" })
      return
    }

    const doctorId = doctorResult.rows[0].id

    const result = await pool.query(
      "SELECT * FROM patient WHERE doctor_id = $1",
      [doctorId]
    )

    res.status(200).json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao obter pacientes." })
  }
}

export const getPatientById: RequestHandler = async (req, res) => {
  try {
    
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ error: 'Token não fornecido' })
      return
    }

    const token = authHeader.split(' ')[1]
    const { email } = await admin.auth().verifyIdToken(token)
    if (!email) {
      res.status(400).json({ error: 'Token não contém e-mail' })
      return
    }

    
    const userRes = await pool.query(
      'SELECT id, type FROM users WHERE email = $1',
      [email]
    )
    if (!userRes.rowCount) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }
    if (userRes.rows[0].type !== 'Doctor') {
      res.status(403).json({ error: 'Apenas médicos podem acessar pacientes' })
      return
    }

    const docRes = await pool.query(
      'SELECT id FROM doctor WHERE user_id = $1',
      [userRes.rows[0].id]
    )
    if (!docRes.rowCount) {
      res.status(404).json({ error: 'Médico não encontrado' })
      return
    }
    const doctorId = docRes.rows[0].id

  
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
  } catch (err: any) {
    console.error('GET /patient/:id error →', err)
    res.status(500).json({ error: err.message || 'Erro ao obter paciente' })
  }
}
