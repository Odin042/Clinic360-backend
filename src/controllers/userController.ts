import type { RequestHandler } from "express"
import pool from "../config/db"

export const getUserByEmail: RequestHandler = async (req, res) => {
  const { email } = req.query

  if (!email) {
    res.status(400).json({ error: "Email é obrigatório" })
    return
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Usuário não encontrado" })
      return
    }

    const user = result.rows[0]
    delete user.password

    res.json(user)
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    res.status(500).json({ error: "Erro no servidor" })
  }
}
