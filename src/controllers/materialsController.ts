import type { RequestHandler } from 'express'
import pool from '../config/db'

export const createMaterial: RequestHandler = async (req, res) => {
  const { name, category, unit, measures, stock, price, brand, user_id, expiration } = req.body

  if (!name || !category || !unit || !measures || stock === undefined || price === undefined || !brand) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO materials (name, category, unit, measures, stock, price, brand, user_id, expiration) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, category, unit, measures, stock, price, brand, user_id, expiration]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar material' })
  }
}

export const listMaterials: RequestHandler = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials ORDER BY id DESC')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar materiais' })
  }
}

export const updateMaterial: RequestHandler = async (req, res) => {
  const { id } = req.params
  const { name, category, unit, measures, stock, price, brand, user_id, expiration } = req.body

  try {
    const result = await pool.query(
      'UPDATE materials SET name = $1, category = $2, unit = $3, measures = $4, stock = $5, price = $6, brand = $7, user_id = $8, expiration = $9 WHERE id = $10 RETURNING *',
      [name, category, unit, measures, stock, price, brand, user_id, expiration, id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material não encontrado' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar material' })
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir material' })
  }
}
