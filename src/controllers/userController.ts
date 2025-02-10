import type { Request, Response } from "express"
import pool from "../config/db"

export const getUserByEmail = async (req: Request, res: Response) => {
  const { email } = req.query

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email as string)) {
    return res.status(400).json({ error: "Email inválido" })
  }

  try {
    const result = await pool.query("SELECT * FROM usuario WHERE email = $1", [email])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

 
    const user = result.rows[0]
    delete user.password

    res.json(user);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    res.status(500).json({ error: "Erro no servidor" })
  }
}