import type { RequestHandler } from 'express'
import pool from '../config/db'
import type { AuthRequest } from '../middlewares/auth'
import { toHttpError } from '../helpers/httpError'

export const createMaterial: RequestHandler = async (req, res) => {
  const { name, category, unit, measures, stock, price, brand, expiration } = req.body
  const userId = (req as AuthRequest).userId

  if (!name || !category || !unit || !measures || stock === undefined || price === undefined || !brand || !userId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO materials (name, category, unit, measures, stock, price, brand, user_id, expiration) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, category, unit, measures, stock, price, brand, userId, expiration]
    )
    res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao criar material')
    res.status(status).json({ error: message })
  }
}

export const listMaterials: RequestHandler = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials ORDER BY id DESC')
    res.json(result.rows)
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao listar materiais')
    res.status(status).json({ error: message })
  }
}

export const updateMaterial: RequestHandler = async (req, res) => {
  const { id } = req.params
  const { name, category, unit, measures, stock, price, brand, expiration } = req.body
  const userId = (req as AuthRequest).userId

  try {
    const result = await pool.query(
      'UPDATE materials SET name = $1, category = $2, unit = $3, measures = $4, stock = $5, price = $6, brand = $7, user_id = $8, expiration = $9 WHERE id = $10 RETURNING *',
      [name, category, unit, measures, stock, price, brand, userId, expiration, id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material não encontrado' })
    }
    res.json(result.rows[0])
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao atualizar material')
    res.status(status).json({ error: message })
  }
}

export const deleteMaterial: RequestHandler = async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query('DELETE FROM materials WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material não encontrado' })
    }
    res.json({ message: 'Material excluído com sucesso' })
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao excluir material')
    res.status(status).json({ error: message })
  }
}
