import type { RequestHandler } from 'express'
import pool from '../config/db'
import type { AuthRequest } from '../middlewares/auth'
import { toHttpError } from '../helpers/httpError'

export const createMachine: RequestHandler = async (req, res) => {
  const {
    name,
    brand,
    category,
    quantity,
    cost_per_session,
    machine_value,
    description,
    acquisition_date,
    is_active
  } = req.body
  const userId = (req as AuthRequest).userId

  if (
    !name || !brand || !category ||
    quantity === undefined ||
    cost_per_session === undefined ||
    machine_value === undefined ||
    !userId
  ) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO machines (name, brand, category, quantity, cost_per_session, machine_value, description, acquisition_date, is_active, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, brand, category, quantity, cost_per_session, machine_value, description, acquisition_date, is_active, userId]
    )
    res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao criar máquina')
    res.status(status).json({ error: message })
  }
}

export const listMachines: RequestHandler = async (req, res) => {
  const userId = (req as AuthRequest).userId

  if (!userId) {
    return res.status(400).json({ error: 'Usuário não autenticado' })
  }

  try {
    const result = await pool.query(
      'SELECT * FROM machines WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    )
    res.json(result.rows)
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao listar máquinas')
    res.status(status).json({ error: message })
  }
}

export const updateMachine: RequestHandler = async (req, res) => {
  const { id } = req.params
  const {
    name,
    brand,
    category,
    quantity,
    cost_per_session,
    machine_value,
    description,
    acquisition_date,
    is_active
  } = req.body

  try {
    const result = await pool.query(
      'UPDATE machines SET name = $1, brand = $2, category = $3, quantity = $4, cost_per_session = $5, machine_value = $6, description = $7, acquisition_date = $8, is_active = $9, updated_at = NOW() WHERE id = $10 RETURNING *',
      [name, brand, category, quantity, cost_per_session, machine_value, description, acquisition_date, is_active, id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Máquina não encontrada' })
    }
    res.json(result.rows[0])
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao atualizar máquina')
    res.status(status).json({ error: message })
  }
}

export const deleteMachine: RequestHandler = async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query('DELETE FROM machines WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Máquina não encontrada' })
    }
    res.json({ message: 'Máquina excluída com sucesso' })
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao excluir máquina')
    res.status(status).json({ error: message })
  }
}
