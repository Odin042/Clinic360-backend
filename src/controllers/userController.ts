import type { Request, Response } from "express"
import  pool  from "../config/db"


export const getUserByEmail = async (req: Request, res: Response) => {
  const { email } = req.query

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório" })
  }

  try {
    const result = await pool.query("SELECT * FROM usuario WHERE email = $1", [email])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    res.status(500).json({ error: "Erro no servidor" })
  }
}
