import type { RequestHandler } from "express"
import pool from "../config/db"
import admin from "../config/firebaseAdmin"

export const getUserByToken: RequestHandler = async (req, res, next) => {
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

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Usuário não encontrado" })
      return
    }

    const user = result.rows[0]
    delete user.password

    // Chame res.json(...) SEM retornar
    res.json(user)
    // Pronto! Acabou. Sem `return res.json(...)`
    
  } catch (error) {
    console.error(error)
    res.status(401).json({ error: "Token inválido ou erro na validação." })
  }
}
