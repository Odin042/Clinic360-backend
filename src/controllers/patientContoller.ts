import type { RequestHandler } from "express"
import pool from "../config/db"
import admin from "../config/firebaseAdmin"
import { findUserByEmail } from "../models/user"

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

export const createPatient: RequestHandler = async (req, res, next) => {
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
      return res.status(400).json({ error: "Token não contém e-mail." })
    }

    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    if (user.type !== "Doctor") {
      return res.status(403).json({ error: "Apenas médicos podem criar pacientes." })
    }

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
      height,
    } = req.body as Patient

    const result = await pool.query(
      `
        INSERT INTO patients
          (name, birthday, gender, email, whatsapp, place_of_service,
           occupation, cpf_cnpj, rg, address, health_plan, weight, height)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        height
      ]
    )

    
    res.status(201).json(result.rows[0])

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Erro ao criar paciente." })
  }
}